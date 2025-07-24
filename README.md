# DSOWA - Data Science on Web Application

データサイエンスのWebアプリケーション - モノレポ構成

## 📁 プロジェクト構造

```
dsowa/
├── frontend/          # React + Vite フロントエンド
│   ├── src/          # Reactコンポーネント
│   ├── public/       # 静的アセット
│   ├── package.json  # フロントエンド依存関係
│   └── vite.config.js
├── backend/          # FastAPI バックエンド
│   ├── app.py        # FastAPIアプリケーション
│   ├── main.py       # サーバー起動スクリプト
│   ├── ml_trainer.py # 機械学習トレーナー
│   └── requirements.txt
├── package.json      # モノレポ設定
└── README.md
```

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
# 全ての依存関係をインストール
npm run install:all
```

### 2. 開発サーバーの起動

```bash
# フロントエンドとバックエンドを同時起動
npm run dev
```

または個別に起動：

```bash
# フロントエンドのみ
npm run dev:frontend

# バックエンドのみ
npm run dev:backend
```

## 📦 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | フロントエンドとバックエンドを同時起動 |
| `npm run dev:frontend` | フロントエンドのみ起動 |
| `npm run dev:backend` | バックエンドのみ起動 |
| `npm run build` | プロダクション用ビルド |
| `npm run install:all` | 全依存関係のインストール |
| `npm run clean` | 生成ファイルの削除 |
| `npm run lint` | コードの静的解析 |
| `npm run test` | テストの実行 |

## 🛠 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **Vite** - 高速ビルドツール
- **CSS3** - スタイリング（ガラスモーフィズムデザイン）

### バックエンド
- **FastAPI** - Pythonウェブフレームワーク
- **uvicorn** - ASGIサーバー
- **scikit-learn** - 機械学習ライブラリ
- **pandas** - データ分析ライブラリ

## 📊 機能

- CSVファイルのアップロードと解析
- データの可視化（グラフ、チャート）
- 機械学習モデルの訓練と予測
- リアルタイム通信ログ
- レスポンシブなガラス風デザイン

## 🌐 アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンド**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## 🔧 開発環境

### 必要な環境
- Node.js 18+
- Python 3.8+
- npm または yarn

### VSCode設定
プロジェクトルートで開発することを推奨します。`.vscode/settings.json`で各ディレクトリ用の設定が自動適用されます。

## 📝 ライセンス

MIT License
