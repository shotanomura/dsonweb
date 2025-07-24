from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import lightgbm as lgb
import asyncio
import json
import io
from ml_trainer import ml_trainer

# 1. FastAPIアプリのインスタンスを作成
app = FastAPI()

# 2. CORSミドルウェアの設定
# Netlifyのフロントエンドからのアクセスを許可する
origins = [
    "https://elaborate-trifle-638f92.netlify.app", # ★ あなたのNetlifyサイトのURLに書き換える
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
        load_message = ml_trainer.load_data(df)
        
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

@app.websocket("/ws/train")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"WebSocket接続が確立されました: {websocket.client}")
    
    try:
        while True:
            # フロントエンドからのデータを受信
            data = await websocket.receive_text()
            print(f"受信データ: {data}")
            
            try:
                # JSONデータを解析
                params = json.loads(data)
                
                # パラメータを処理してログメッセージを生成
                await websocket.send_text(f"✅ パラメータを受信しました")
                await asyncio.sleep(0.5)
                
                await websocket.send_text(f"📊 目的変数: {params.get('targetColumn', 'N/A')}")
                await asyncio.sleep(0.5)
                
                await websocket.send_text(f"🔧 特徴量数: {len(params.get('featureColumns', []))}")
                await asyncio.sleep(0.5)
                
                await websocket.send_text(f"📈 問題タイプ: {params.get('problemType', 'N/A')}")
                await asyncio.sleep(0.5)
                
                await websocket.send_text(f"📏 データサイズ: {params.get('dataSize', 'N/A')} 行")
                await asyncio.sleep(0.5)
                
                await websocket.send_text(f"⚙️ 訓練データ比率: {params.get('trainTestSplit', 'N/A')}")
                await asyncio.sleep(1)
                
                # 機械学習の実行
                await websocket.send_text("🚀 機械学習を開始します...")
                await asyncio.sleep(0.5)
                
                # MLTrainerで学習を実行
                result = await ml_trainer.train_model(websocket, params)
                
                if result['success']:
                    await websocket.send_text("🎉 すべての処理が完了しました！")
                else:
                    await websocket.send_text(f"❌ 処理中にエラーが発生しました: {result.get('error', '不明なエラー')}")
                
            except json.JSONDecodeError:
                await websocket.send_text(f"⚠️ JSON解析エラー: {data}")
            except Exception as e:
                await websocket.send_text(f"❌ 処理エラー: {str(e)}")
                
    except WebSocketDisconnect:
        print("WebSocket接続が切断されました")
    except Exception as e:
        print(f"WebSocketエラー: {e}")
        try:
            await websocket.send_text(f"❌ サーバーエラー: {str(e)}")
        except:
            pass
    finally:
        print("WebSocket接続を終了します")

# 推論用のデータモデル
class PredictionRequest(BaseModel):
    data: dict

class BatchPredictionRequest(BaseModel):
    data: list

@app.post("/predict")
async def predict(request: PredictionRequest):
    """
    訓練済みモデルを使用して予測を実行します。
    """
    try:
        result = ml_trainer.predict(request.data)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"予測中にエラーが発生しました: {str(e)}"
        }

@app.post("/predict_batch")
async def predict_batch(request: BatchPredictionRequest):
    """
    訓練済みモデルを使用してバッチ予測を実行します。
    """
    try:
        result = ml_trainer.predict_batch(request.data)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"バッチ予測中にエラーが発生しました: {str(e)}"
        }


@app.get("/")
def read_root():
    return {"message": "LightGBM推論APIへようこそ"}