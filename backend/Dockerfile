# 1. AWS Lambda公式のPythonベースイメージを使用（必須級）
FROM public.ecr.aws/lambda/python:3.9

# 2. 作業ディレクトリ（Lambdaの標準は /var/task）
WORKDIR /var/task

# 3. 依存関係のインストール
# Lambdaイメージは root で動作するため useradd は不要です
RUN yum install -y gcc gcc-c++ libgomp make cmake
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. コードとモデルのコピー
COPY . .

# 5. 実行コマンド
# 「ファイル名.変数名」の形式で指定します
# 前の回答で作った app.py 内の handler = Mangum(app) を呼び出します
CMD ["app.handler"]