import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import lightgbm as lgb
import asyncio
import json
from typing import Dict, Any, Optional

class MLTrainer:
    def __init__(self):
        self.df = None
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.target_column = ""
        self.problem_type = ""
        
    def load_data(self, df: pd.DataFrame):
        """DataFrameを読み込む"""
        self.df = df.copy()
        return f"データを読み込みました: {df.shape[0]}行 × {df.shape[1]}列"
    
    def preprocess_data(self, target_column: str, feature_columns: list, problem_type: str):
        """データの前処理を行う"""
        if self.df is None:
            raise ValueError("データが読み込まれていません")
        
        self.target_column = target_column
        self.feature_columns = feature_columns
        self.problem_type = problem_type
        
        # 特徴量と目的変数を分離
        X = self.df[feature_columns].copy()
        y = self.df[target_column].copy()
        
        # 欠損値の処理（列ごとに適切な方法を選択）
        for col in X.columns:
            if X[col].isnull().any():
                if X[col].dtype in ['object', 'string', 'category']:
                    # カテゴリ変数の場合は最頻値で補完
                    mode_val = X[col].mode()
                    if len(mode_val) > 0:
                        X[col] = X[col].fillna(mode_val.iloc[0])
                    else:
                        X[col] = X[col].fillna('unknown')  # 最頻値がない場合
                else:
                    # 数値変数の場合は平均値で補完
                    X[col] = X[col].fillna(X[col].mean())
        
        # 目的変数の欠損値処理
        if y.isnull().any():
            if pd.api.types.is_numeric_dtype(y):
                y = y.fillna(y.mean())
            else:
                mode_val = y.mode()
                if len(mode_val) > 0:
                    y = y.fillna(mode_val.iloc[0])
                else:
                    y = y.fillna('unknown')
        
        # カテゴリ変数のエンコーディング
        for col in X.columns:
            if X[col].dtype == 'object' or X[col].dtype.name == 'category':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                self.label_encoders[col] = le
        
        # 目的変数のエンコーディング（分類の場合）
        if problem_type == 'classification' and (y.dtype == 'object' or y.dtype.name == 'category'):
            le = LabelEncoder()
            y = le.fit_transform(y.astype(str))
            self.label_encoders['target'] = le
        
        return X, y
    
    async def train_model(self, websocket, params: Dict[str, Any]):
        """機械学習モデルの訓練を行う"""
        try:
            target_column = params['targetColumn']
            feature_columns = params['featureColumns']
            problem_type = params['problemType']
            train_test_split_ratio = params['trainTestSplit']
            
            await websocket.send_text("🔄 データの前処理を開始します...")
            await asyncio.sleep(0.5)
            
            # データの前処理
            X, y = self.preprocess_data(target_column, feature_columns, problem_type)
            
            await websocket.send_text(f"✅ 前処理完了: 特徴量{X.shape[1]}個、サンプル{X.shape[0]}個")
            await asyncio.sleep(0.5)
            
            # 訓練・テストデータの分割
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=1-train_test_split_ratio, random_state=42
            )
            
            await websocket.send_text(f"📊 データ分割完了: 訓練{X_train.shape[0]}件、テスト{X_test.shape[0]}件")
            await asyncio.sleep(0.5)
            
            # LightGBMモデルの設定
            if problem_type == 'regression':
                await websocket.send_text("🔧 回帰モデルを構築中...")
                model = lgb.LGBMRegressor(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    verbose=-1
                )
            else:
                await websocket.send_text("🔧 分類モデルを構築中...")
                model = lgb.LGBMClassifier(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    verbose=-1
                )
            
            await asyncio.sleep(0.5)
            
            # モデルの訓練
            await websocket.send_text("🚀 モデルの訓練を開始します...")
            model.fit(X_train, y_train)
            
            await websocket.send_text("✅ モデル訓練完了！")
            await asyncio.sleep(0.5)
            
            # 予測の実行
            await websocket.send_text("📈 予測を実行中...")
            y_pred_raw = model.predict(X_test)
            
            # 予測結果をnumpy配列に変換（型検査を回避）
            try:
                # sparse matrixやその他の形式を numpy配列に変換
                y_pred = np.asarray(y_pred_raw).flatten()
            except Exception as e:
                await websocket.send_text(f"⚠️ 予測結果の変換でエラー: {str(e)}")
                y_pred = np.array([0] * len(y_test))  # フォールバック
            
            # y_testもnumpy配列に変換
            try:
                y_test_array = np.asarray(y_test).flatten()
            except Exception:
                y_test_array = y_test.values if hasattr(y_test, 'values') else np.array(y_test)
            
            # 評価指標の計算
            if problem_type == 'regression':
                mse = mean_squared_error(y_test_array, y_pred)
                r2 = r2_score(y_test_array, y_pred)
                
                await websocket.send_text(f"📊 回帰評価結果:")
                await websocket.send_text(f"   - RMSE: {np.sqrt(mse):.4f}")
                await websocket.send_text(f"   - R²スコア: {r2:.4f}")
                
                metrics = {
                    "rmse": float(np.sqrt(mse)),
                    "r2_score": float(r2),
                    "mse": float(mse)
                }
            else:
                accuracy = accuracy_score(y_test_array, y_pred)
                
                await websocket.send_text(f"📊 分類評価結果:")
                await websocket.send_text(f"   - 精度: {accuracy:.4f}")
                
                metrics = {
                    "accuracy": float(accuracy)
                }
            
            await asyncio.sleep(0.5)
            
            # 予測結果のサンプルを表示
            await websocket.send_text("🔍 予測結果サンプル（最初の5件）:")
            for i in range(min(5, len(y_test_array))):
                if problem_type == 'regression':
                    await websocket.send_text(f"   実際値: {y_test_array[i]:.4f}, 予測値: {y_pred[i]:.4f}")
                else:
                    await websocket.send_text(f"   実際値: {y_test_array[i]}, 予測値: {y_pred[i]}")
            
            await asyncio.sleep(0.5)
            
            # 特徴量重要度
            if hasattr(model, 'feature_importances_'):
                feature_importance = dict(zip(feature_columns, model.feature_importances_))
                top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
                
                await websocket.send_text("🎯 重要な特徴量トップ5:")
                for feature, importance in top_features:
                    await websocket.send_text(f"   {feature}: {importance:.4f}")
            
            self.model = model
            
            await websocket.send_text("🎉 機械学習パイプライン完了！")
            
            return {
                "success": True,
                "metrics": metrics,
                "model_trained": True,
                "feature_importance": dict(zip(feature_columns, model.feature_importances_)) if hasattr(model, 'feature_importances_') else None
            }
            
        except Exception as e:
            await websocket.send_text(f"❌ エラーが発生しました: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            }
    
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """新しいデータに対して予測を実行"""
        if self.model is None:
            return {"error": "モデルが訓練されていません"}
        
        try:
            # 入力データをDataFrameに変換
            input_df = pd.DataFrame([input_data])
            
            # 特徴量の選択と前処理
            X_input = input_df[self.feature_columns].copy()
            
            # カテゴリ変数のエンコーディング
            for col in X_input.columns:
                if col in self.label_encoders:
                    le = self.label_encoders[col]
                    X_input[col] = le.transform(X_input[col].astype(str))
            
            # 予測実行
            prediction_raw = self.model.predict(X_input)
            
            # 予測結果をnumpy配列に変換
            try:
                prediction = np.asarray(prediction_raw).flatten()
            except Exception:
                prediction = np.array([prediction_raw])
            
            # 分類の場合、ラベルをデコード
            if self.problem_type == 'classification' and 'target' in self.label_encoders:
                try:
                    prediction = self.label_encoders['target'].inverse_transform(prediction.astype(int))
                except Exception as e:
                    return {"success": False, "error": f"ラベルデコードエラー: {str(e)}"}
            
            # 結果を適切な形式で返す
            try:
                if len(prediction) == 1:
                    result = float(prediction[0]) if isinstance(prediction[0], (int, float, np.number)) else prediction[0]
                else:
                    result = [float(x) if isinstance(x, (int, float, np.number)) else x for x in prediction]
                
                return {
                    "success": True,
                    "prediction": result
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"結果変換エラー: {str(e)}"
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def predict_batch(self, test_data_list):
        """
        複数のデータに対してバッチ推論を実行
        """
        try:
            if self.model is None:
                return {"success": False, "error": "モデルが学習されていません"}
            
            if not isinstance(test_data_list, list) or len(test_data_list) == 0:
                return {"success": False, "error": "テストデータが正しくありません"}
            
            # データフレームに変換
            import pandas as pd
            df = pd.DataFrame(test_data_list)
            
            # 特徴量列のみを抽出
            missing_features = [col for col in self.feature_columns if col not in df.columns]
            if missing_features:
                return {
                    "success": False, 
                    "error": f"必要な特徴量が不足しています: {missing_features}"
                }
            
            X_test = df[self.feature_columns].copy()
            
            # 欠損値の処理（学習時と同じ方法）
            for col in X_test.columns:
                if X_test[col].isnull().any():
                    if col in self.label_encoders:
                        # カテゴリ変数の場合
                        X_test[col] = X_test[col].fillna('unknown')
                    else:
                        # 数値変数の場合は0で補完（学習時の平均値を保存していないため）
                        X_test[col] = X_test[col].fillna(0)
            
            # カテゴリ変数のエンコーディング（学習時と同じエンコーダーを使用）
            for col in X_test.columns:
                if col in self.label_encoders:
                    try:
                        # 文字列に変換してからエンコード
                        X_test_str = X_test[col].astype(str)
                        
                        # 学習時に見たことのないラベルを処理
                        encoder = self.label_encoders[col]
                        encoded_values = []
                        
                        for value in X_test_str:
                            try:
                                encoded_values.append(encoder.transform([value])[0])
                            except ValueError:
                                # 未知のラベルの場合は0（最初のクラス）を使用
                                encoded_values.append(0)
                        
                        X_test[col] = encoded_values
                    except Exception:
                        # エンコードに失敗した場合は0で埋める
                        X_test[col] = 0
                else:
                    # 数値列の場合は数値に変換
                    try:
                        X_test[col] = pd.to_numeric(X_test[col], errors='coerce').fillna(0)
                    except Exception:
                        X_test[col] = 0
            
            # numpy配列に変換
            try:
                X_test_array = np.array(X_test, dtype=np.float64)
            except Exception as e:
                return {"success": False, "error": f"データの数値変換に失敗: {str(e)}"}
            
            # 推論実行
            predictions = self.model.predict(X_test_array)
            
            # 予測結果の型を統一
            if not isinstance(predictions, np.ndarray):
                predictions = np.array(predictions)
            
            # 分類の場合、ラベルをデコード
            if self.problem_type == 'classification' and 'target' in self.label_encoders:
                try:
                    predictions_int = predictions.astype(int)
                    predictions = self.label_encoders['target'].inverse_transform(predictions_int)
                except Exception as e:
                    return {"success": False, "error": f"ラベルデコードエラー: {str(e)}"}
            
            # 結果を適切な形式で変換
            try:
                results = []
                for pred in predictions:
                    if isinstance(pred, (int, float, np.number)):
                        results.append(float(pred))
                    else:
                        results.append(str(pred))
                
                return {
                    "success": True,
                    "predictions": results,
                    "count": len(results)
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"結果変換エラー: {str(e)}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"バッチ推論エラー: {str(e)}"
            }

# グローバルなMLTrainerインスタンス
ml_trainer = MLTrainer()
