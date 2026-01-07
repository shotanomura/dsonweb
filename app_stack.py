from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_ecr as ecr,
    RemovalPolicy,
)
from constructs import Construct

class DsonwebStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. 既存のDynamoDBテーブルを参照
        # 'Users' テーブルと 'Uploads' テーブルを管理下に置く
        user_table = dynamodb.Table.from_table_name(self, "ExistingUserTable", "Users")
        upload_table = dynamodb.Table.from_table_name(self, "ExistingUploadTable", "Uploads")

        # 2. 既存のS3バケットを参照
        upload_bucket = s3.Bucket.from_bucket_name(self, "ExistingBucket", "あなたのバケット名")

        # 3. 既存のECRリポジトリを参照
        repo = ecr.Repository.from_repository_name(
            self, "BackendRepo", "dsow-backend"
        )

        # 4. Lambda関数を定義（ECRのイメージを使用）
        # これにより、deploy.sh のコマンドをCDKが肩代わりします
        backend_lambda = _lambda.DockerImageFunction(
            self, "BackendLambda",
            function_name="dsow-backend-api-cdk", # 練習用として別名で作成
            code=_lambda.DockerImageCode.from_ecr(repo, tag_or_digest="latest"),
            memory_size=1024,
            environment={
                "AWS_LAMBDA_FUNCTION_NAME": "dsow-backend-api-cdk"
            }
        )

        # 5. 権限付与（最小権限の原則）
        # Lambdaから各リソースへのアクセスを許可する
        user_table.grant_read_write_data(backend_lambda)
        upload_table.grant_read_write_data(backend_lambda)
        upload_bucket.grant_read_write_data(backend_lambda)