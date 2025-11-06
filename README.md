# DSOWA - Data Science on Web Application

データサイエンスのWebアプリケーション - CSVデータの可視化・分析・機械学習をブラウザで実現

## 📁 プロジェクト構造

```
dsonweb/
├── frontend/         # React + Vite フロントエンド
│   ├── src/
│   │   ├── App.jsx           # メインアプリケーション
│   │   ├── CsvUploader.jsx   # CSVアップロード機能
│   │   ├── DataSummary.jsx   # データ統計・相関分析
│   │   ├── DataTable.jsx     # データテーブル表示
│   │   ├── DataVisualize.jsx # データ可視化
│   │   ├── MachineLearning.jsx # 機械学習機能
│   │   ├── charts/           # グラフコンポーネント
│   │   │   ├── CategoryNumericChart.jsx
│   │   │   ├── ScatterChart.jsx
│   │   │   └── StackedBarChart.jsx
│   │   └── components/       # 共通コンポーネント
│   │       └── CustomSelect.jsx
│   ├── public/       # 静的アセット
│   ├── package.json
│   └── vite.config.js
├── backend/          # FastAPI バックエンド
│   ├── app.py        # FastAPIアプリケーション
│   ├── main.py       # サーバー起動スクリプト
│   ├── ml_trainer.py # 機械学習トレーナー
│   ├── requirements.txt
│   └── Dockerfile    # Docker設定
├── .github/
│   └── workflows/
│       └── deploy_hf_space.yml  # Hugging Face Space自動デプロイ
├── package.json      # モノレポ設定
└── README.md
```

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
# ルートディレクトリで全ての依存関係をインストール
npm run install:all
```

**注意**: バックエンドでは`libomp`が必要です（macOS）:
```bash
# Homebrewの場合
brew install libomp

# または conda環境の場合
conda install -c conda-forge libomp
```

### 2. 開発サーバーの起動

```bash
# フロントエンドとバックエンドを同時起動
npm run dev
```

または個別に起動：

```bash
# フロントエンドのみ（ポート: 5173）
npm run dev:frontend

# バックエンドのみ（ポート: 8000）
npm run dev:backend
```

## 📦 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | フロントエンドとバックエンドを同時起動 |
| `npm run dev:frontend` | フロントエンドのみ起動（Vite開発サーバー） |
| `npm run dev:backend` | バックエンドのみ起動（Uvicorn） |
| `npm run build` | プロダクション用ビルド |
| `npm run install:all` | 全依存関係のインストール |
| `npm run clean` | 生成ファイルの削除 |
| `npm run lint` | ESLintでコード解析 |
| `npm run test` | テストの実行 |

## 🛠 技術スタック

### フロントエンド
- **React 19** - UIライブラリ
- **Vite 7** - 高速ビルドツール
- **Chart.js** - データ可視化

### バックエンド
- **FastAPI** - Pythonウェブフレームワーク
- **uvicorn** - ASGIサーバー
- **scikit-learn** - 機械学習ライブラリ


## 📊 主な機能

### データ分析
- ✅ CSVファイルのアップロードと解析
- ✅ 数値列の統計情報（平均、中央値、最小値、最大値、合計）
- ✅ カテゴリ列のユニーク値分析
- ✅ 相関係数分析（単純相関・偏相関）
- ✅ 欠損値の検出と表示

### データ可視化
- ✅ カテゴリ別数値分析（棒グラフ）
- ✅ 散布図（2変数の関係性）
- ✅ 積み上げ棒グラフ（カテゴリ別分布）
- ✅ リアルタイムチャート更新

### 機械学習
- ✅ 分類・回帰モデルの訓練
- ✅ WebSocketによるリアルタイムログ表示
- ✅ モデル評価（精度、R²スコア）
- ✅ バッチ推論とCSVダウンロード

### UI/UX
- ✅ レスポンシブデザイン
- ✅ ガラスモーフィズムUI
- ✅ タブ切り替えによる機能分離
- ✅ 直感的な操作性

## 🌐 アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンド**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## 🔧 開発環境

### 必要な環境
- **Node.js** 18.0.0 以上
- **Python** 3.8 以上
- **npm** 8.0.0 以上

### 環境変数（オプション）

フロントエンドで`.env`ファイルを作成し、バックエンドURLを設定可能:

```bash
VITE_BACKEND_WS_URL=ws://localhost:8000
VITE_BACKEND_API_URL=http://localhost:8000
```

### VSCode設定
プロジェクトルートで開発することを推奨します。`.vscode/settings.json`で各ディレクトリ用の設定が自動適用されます。

## 🚀 デプロイメント

### フロントエンド（Netlify）
自動デプロイが設定されています。

**Netlify設定**:
- Base directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `frontend/dist`

### バックエンド（Hugging Face Spaces）
GitHub Actionsで自動デプロイが設定されています。

**デプロイ条件**:
- `backend/`フォルダに変更があった場合
- `main`ブランチへのプッシュ時

**必要なシークレット**:
- `HF_TOKEN`: Hugging Face APIトークン

その他のデプロイ先:
- Railway
- Render
- Heroku
- DigitalOcean App Platform

## 📝 ライセンス

MIT License

## 👤 作者

**Shota Nomura**

---

**プロジェクトURL**: https://github.com/shotanomura/dsonweb
