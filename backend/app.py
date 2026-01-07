from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Request
# Trigger reload 2
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
# import lightgbm as lgb
import asyncio
import json
import io
# from ml_trainer import ml_trainer
import models, schemas, auth, crud
from storage import get_storage
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine
from mangum import Mangum  # Lambda用のアダプター

import boto3
from botocore.config import Config

import os
from datetime import datetime

# --- 環境判定 ---
IS_LAMBDA = os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None

# --- DB初期化 ---
if not IS_LAMBDA:
    # ローカル環境ではSQLAlchemyのテーブル作成を実行
    models.Base.metadata.create_all(bind=engine)

# 1. FastAPIアプリのインスタンスを作成
app = FastAPI()

# 2. CORSミドルウェアの設定
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

origins = [
    FRONTEND_URL, 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 新しいエンドポイント：ファイル一覧の取得 ---
@app.get("/files")
async def get_files(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    try:
        return crud.get_uploads_by_username(current_user.username, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/files/{upload_id}")
async def delete_file(
    upload_id: str,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(auth.get_db)
):
    try:
        # 1. メタデータを取得
        upload_item = crud.get_upload_by_id(current_user.username, upload_id, db)
        
        if not upload_item:
            raise HTTPException(status_code=404, detail="File not found")

        # 2. ストレージから削除
        try:
            storage = get_storage()
            storage.delete(upload_item.s3_key)
        except Exception as e:
            # ストレージになくてもDBからは消す？ 一応ログだけ出して続行
            pass

        # 3. メタデータを削除
        crud.delete_upload(current_user.username, upload_id, db)

        return {"success": True, "message": "File deleted successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(auth.get_db)
):
    """
    CSVファイルをアップロードして、ストレージ(S3 or Local)に保存し、データの基本情報を返します。
    """
    print(f"DEBUG: upload_csv called for file: {file.filename}")
    try:
        # ファイルの種類をチェック
        if not file.filename or not file.filename.endswith('.csv'):
            return {"error": "CSVファイルのみ対応しています"}
        
        # ファイル内容を読み取り
        contents = await file.read()
        
        # CSVデータをDataFrameに変換
        try:
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        except pd.errors.ParserError as e:
            print(f"CSV Parse Error: {e}")
            raise HTTPException(status_code=400, detail=f"CSVファイルの形式が不正です: {str(e)}")
        except Exception as e:
            print(f"CSV Read Error: {e}")
            raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {str(e)}")
        
        s3_key = None
        s3_message = "保存に失敗しました"
        upload_id = None

        print(f"DEBUG: Processing upload for file: {file.filename}")
        try:
            storage = get_storage()
            print(f"DEBUG: Storage backend obtained: {type(storage)}")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            s3_key = f"users/{current_user.username}/uploads/{timestamp}_{file.filename}"
            print(f"DEBUG: Generated s3_key: {s3_key}")
            
            # ストレージに保存
            print("DEBUG: Saving to storage...")
            saved_path = storage.save(s3_key, contents)
            print(f"DEBUG: Saved to storage at: {saved_path}")
            s3_message = f"保存されました: {saved_path}"

            # メタデータを保存
            upload_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
            upload_item = {
                "username": current_user.username,
                "upload_id": upload_id,
                "filename": file.filename,
                "s3_key": s3_key,
                "upload_date": datetime.now().isoformat(),
                "row_count": int(len(df))
            }
            print(f"DEBUG: Calling crud.create_upload_metadata for {current_user.username}")
            crud.create_upload_metadata(upload_item, db)
            print("DEBUG: crud.create_upload_metadata returned successfully")
            
        except Exception as e:
            s3_message = f"保存エラー: {str(e)}"
            # エラー時もとりあえず解析結果は返す？ いや、エラー情報を返す
            print(f"DEBUG: Update Error in inner block: {e}")
            import traceback
            traceback.print_exc()

        
        # MLTrainerにデータを読み込み
        # load_message = ml_trainer.load_data(df)
        load_message = "Machine Learning feature is currently disabled."
        
        # データの基本情報を取得
        # NaNが含まれているとJSONエンコードでエラーになるため、Noneに置換する
        sample_df = df.head(5).where(pd.notnull(df), None)
        
        data_info = {
            "filename": file.filename,
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "sample_data": sample_df.to_dict(orient='records')
        }
        
        return {
            "success": True,
            "message": f"ファイル '{file.filename}' が正常にアップロードされました。{s3_message}",
            "data_info": data_info,
            "ml_message": load_message,
            "s3_key": s3_key,
            "upload_id": upload_id
        }
        
    except Exception as e:
        print(f"DEBUG: Outer Exception in upload_csv: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"ファイル処理中にエラーが発生しました: {str(e)}"
        }

# @app.websocket("/ws/train")
# ... (omitted code) ...

# 推論用のデータモデル
class PredictionRequest(BaseModel):
    data: dict

class BatchPredictionRequest(BaseModel):
    data: list

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    # 既存ユーザー確認
    existing_user = crud.get_user_by_username(user.username, db)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = crud.get_user_by_email(user.email, db)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    
    try:
        return crud.create_user(user, hashed_password, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    # ユーザー取得
    user = crud.get_user_by_username(form_data.username, db)
    
    # DynamoDBは辞書、SQLAlchemyはオブジェクトなので、アクセス方法を柔軟にする。
    # 現在はcrud.pyでオブジェクトに統一されているため、属性アクセスでOK
    db_password = getattr(user, "hashed_password", None)
    username = getattr(user, "username", None)

    if not user or not auth.verify_password(form_data.password, db_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- ファイルダウンロード用エンドポイント ---
@app.get("/download")
async def download_file(s3_key: str, current_user: models.User = Depends(auth.get_current_user)):
    """
    ファイルをダウンロードして内容を返します。
    """
    # セキュリティチェック: s3_key がそのユーザーのものであるか確認
    if f"users/{current_user.username}/" not in s3_key:
         raise HTTPException(status_code=403, detail="Access denied")

    try:
        storage = get_storage()
        content_bytes = storage.load(s3_key)
        return {"content": content_bytes.decode('utf-8')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

s3_client = boto3.client(
    's3',
    region_name='ap-northeast-1',
    config=Config(signature_version='s3v4') # 署名V4を強制
)

@app.get("/generate-upload-url")
def generate_upload_url(filename: str, file_type: str):
    # 保存先のパスを指定
    object_name = f"uploads/{filename}"
    bucket_name = "dsow-user-uploads"

    # 署名付きURLを生成（有効期限は5分）
    presigned_url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket_name,
            'Key': object_name,
            'ContentType': file_type
        },
        ExpiresIn=300 # 300秒
    )
    
    return {"url": presigned_url, "file_path": object_name}

# @app.post("/predict")
# async def predict(request: PredictionRequest):
#     """
#     訓練済みモデルを使用して予測を実行します。
#     """
#     try:
#         # result = ml_trainer.predict(request.data)
#         # return result
#         return {"error": "disabled"}
#     except Exception as e:
#         return {
#             "success": False,
#             "error": f"予測中にエラーが発生しました: {str(e)}"
#         }

# @app.post("/predict_batch")
# async def predict_batch(request: BatchPredictionRequest):
#     """
#     訓練済みモデルを使用してバッチ予測を実行します。
#     """
#     try:
#         # result = ml_trainer.predict_batch(request.data)
#         # return result
#         return {"error": "disabled"}
#     except Exception as e:
#         return {
#             "success": False,
#             "error": f"バッチ予測中にエラーが発生しました: {str(e)}"
#         }


@app.get("/")
def read_root():
    return {"message": "LightGBM推論APIへようこそ"}

handler = Mangum(app)