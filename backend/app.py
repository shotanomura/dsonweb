from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
# import lightgbm as lgb
import asyncio
import json
import io
# from ml_trainer import ml_trainer
import models, schemas, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine
from mangum import Mangum  # Lambda用のアダプター

import os
import boto3
from botocore.exceptions import ClientError

# --- 環境判定 ---
IS_LAMBDA = os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None

# --- DynamoDB初期化 (Lambda環境のみ) ---
if IS_LAMBDA:
    # Lambda上ではboto3を使用
    dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
    user_table = dynamodb.Table('Users')
else:
    # ローカル環境ではSQLAlchemyのテーブル作成を実行
    # Lambdaでは書き込み不可なため実行しないようにガード
    models.Base.metadata.create_all(bind=engine)

# 1. FastAPIアプリのインスタンスを作成
app = FastAPI()

# 2. CORSミドルウェアの設定
# Netlifyのフロントエンドからのアクセスを許可する
origins = [
    "https://elaborate-trifle-638f92.netlify.app", 
    "http://localhost:5173", # ローカル開発用
    "http://localhost:3000", # 追加のローカル開発用
    "*" # 開発時のため一時的に全許可
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    CSVファイルをアップロードして、データの基本情報を返します。
    """
    try:
        # ファイルの種類をチェック
        if not file.filename or not file.filename.endswith('.csv'):
            return {"error": "CSVファイルのみ対応しています"}
        
        # ファイル内容を読み取り
        contents = await file.read()
        
        # CSVデータをDataFrameに変換
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # MLTrainerにデータを読み込み
        # load_message = ml_trainer.load_data(df)
        load_message = "Machine Learning feature is currently disabled."
        
        # データの基本情報を取得
        data_info = {
            "filename": file.filename,
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "sample_data": df.head(5).to_dict(orient='records')
        }
        
        return {
            "success": True,
            "message": f"ファイル '{file.filename}' が正常にアップロードされました",
            "data_info": data_info,
            "ml_message": load_message
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"ファイル処理中にエラーが発生しました: {str(e)}"
        }

# @app.websocket("/ws/train")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     print(f"WebSocket接続が確立されました: {websocket.client}")
#     
#     try:
#         while True:
#             # フロントエンドからのデータを受信
#             data = await websocket.receive_text()
#             print(f"受信データ: {data}")
#             
#             try:
#                 # JSONデータを解析
#                 params = json.loads(data)
#                 
#                 # パラメータを処理してログメッセージを生成
#                 await websocket.send_text(f"✅ パラメータを受信しました")
#                 await asyncio.sleep(0.5)
#                 
#                 await websocket.send_text(f"📊 目的変数: {params.get('targetColumn', 'N/A')}")
#                 await asyncio.sleep(0.5)
#                 
#                 await websocket.send_text(f"🔧 特徴量数: {len(params.get('featureColumns', []))}")
#                 await asyncio.sleep(0.5)
#                 
#                 await websocket.send_text(f"📈 問題タイプ: {params.get('problemType', 'N/A')}")
#                 await asyncio.sleep(0.5)
#                 
#                 await websocket.send_text(f"📏 データサイズ: {params.get('dataSize', 'N/A')} 行")
#                 await asyncio.sleep(0.5)
#                 
#                 await websocket.send_text(f"⚙️ 訓練データ比率: {params.get('trainTestSplit', 'N/A')}")
#                 await asyncio.sleep(1)
#                 
#                 # 機械学習の実行
#                 await websocket.send_text("🚀 機械学習を開始します...")
#                 await asyncio.sleep(0.5)
#                 
#                 # MLTrainerで学習を実行
#                 # result = await ml_trainer.train_model(websocket, params)
#                 result = {"success": False, "error": "Function disabled"}
#                 
#                 if result['success']:
#                     await websocket.send_text("🎉 すべての処理が完了しました！")
#                 else:
#                     await websocket.send_text(f"❌ 処理中にエラーが発生しました: {result.get('error', '不明なエラー')}")
#                 
#             except json.JSONDecodeError:
#                 await websocket.send_text(f"⚠️ JSON解析エラー: {data}")
#             except Exception as e:
#                 await websocket.send_text(f"❌ 処理エラー: {str(e)}")
#                 
#     except WebSocketDisconnect:
#         print("WebSocket接続が切断されました")
#     except Exception as e:
#         print(f"WebSocketエラー: {e}")
#         try:
#             await websocket.send_text(f"❌ サーバーエラー: {str(e)}")
#         except:
#             pass
#     finally:
#         print("WebSocket接続を終了します")

# 推論用のデータモデル
class PredictionRequest(BaseModel):
    data: dict

class BatchPredictionRequest(BaseModel):
    data: list

# --- ユーザー取得の共通関数 ---
def get_user_by_username(username: str, db: Session):
    if IS_LAMBDA:
        # DynamoDBから取得
        try:
            response = user_table.get_item(Key={'username': username})
            return response.get('Item') # 辞書が返る
        except ClientError as e:
            print(e.response['Error']['Message'])
            return None
    else:
        # SQLAlchemyから取得
        return db.query(models.User).filter(models.User.username == username).first()

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    # 既存ユーザー確認（共通関数を使用）
    existing_user = get_user_by_username(user.username, db)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)

    if IS_LAMBDA:
        # --- DynamoDBへの保存処理 ---
        new_user_item = {
            "username": user.username,
            "email": user.email,
            "hashed_password": hashed_password,
        }
        try:
            user_table.put_item(Item=new_user_item)
            return new_user_item
        except ClientError as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # --- 従来のSQLAlchemy処理 ---
        db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    # ユーザー取得
    user = get_user_by_username(form_data.username, db)
    
    # DynamoDBは辞書、SQLAlchemyはオブジェクトなので、アクセス方法を柔軟にする
    if isinstance(user, dict):
        db_password = user.get("hashed_password")
        username = user.get("username")
    else:
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