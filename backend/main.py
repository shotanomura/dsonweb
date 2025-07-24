#!/usr/bin/env python3
"""
FastAPI バックエンドサーバーのメインエントリーポイント
モノレポ構成対応版
"""

import uvicorn
from app import app

if __name__ == "__main__":
    # 開発サーバーを起動
    uvicorn.run(
        "app:app",  # app.pyのappインスタンスを指定
        host="0.0.0.0",
        port=8000,
        reload=True,  # ファイル変更時の自動リロード
        log_level="info"
    )
