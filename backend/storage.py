import os
import boto3
from botocore.exceptions import ClientError
from abc import ABC, abstractmethod
import pathlib

# 環境変数
IS_LAMBDA = os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None
S3_BUCKET_NAME = "dsow-user-uploads" # app.pyと同じ設定にする必要があります

class BaseStorage(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str:
        pass

    @abstractmethod
    def load(self, key: str) -> bytes:
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        pass

class S3Storage(BaseStorage):
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3')

    def save(self, key: str, data: bytes) -> str:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data
            )
            return f"s3://{self.bucket_name}/{key}"
        except ClientError as e:
            raise Exception(f"S3 save error: {e}")

    def load(self, key: str) -> bytes:
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except ClientError as e:
            raise Exception(f"S3 load error: {e}")

    def delete(self, key: str) -> None:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
        except ClientError as e:
            raise Exception(f"S3 delete error: {e}")

class LocalStorage(BaseStorage):
    def __init__(self, base_dir: str = "local_storage"):
        self.base_dir = pathlib.Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, key: str, data: bytes) -> str:
        # keyが users/shotanomura/uploads/... のようになっていることを想定
        # ディレクトリトラバーサル対策などは今回は簡易的に済ます
        file_path = self.base_dir / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(data)
        
        return str(file_path)

    def load(self, key: str) -> bytes:
        file_path = self.base_dir / key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        
        with open(file_path, "rb") as f:
            return f.read()

    def delete(self, key: str) -> None:
        file_path = self.base_dir / key
        if file_path.exists():
            file_path.unlink()
        else:
            # S3のdelete_objectは存在しなくてもエラーにならないので、それに合わせるか
            # あるいは警告ログを出すか。今回は何もしない
            pass

def get_storage() -> BaseStorage:
    if IS_LAMBDA:
        if not S3_BUCKET_NAME:
            raise ValueError("S3_BUCKET_NAME is not set")
        return S3Storage(S3_BUCKET_NAME)
    else:
        # ローカルストレージは backend/local_storage に保存
        return LocalStorage(base_dir=os.path.join(os.path.dirname(__file__), "local_storage"))
