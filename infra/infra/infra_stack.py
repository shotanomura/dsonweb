from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_apigateway as apigw, 
    aws_ecr as ecr,
    Duration,
)
from constructs import Construct

class InfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. 既存の DynamoDB テーブルを参照
        user_table = dynamodb.Table.from_table_name(self, "ExistingUserTable", "Users")
        upload_table = dynamodb.Table.from_table_name(self, "ExistingUploadTable", "Uploads")

        # 2. 既存の S3 バケットを参照
        # あなたが作成したバケット名をここに記入してください
        upload_bucket = s3.Bucket.from_bucket_name(self, "ExistingBucket", "dsow-user-uploads")

        # 3. Lambda 関数の定義 (Docker イメージを使用)
        backend_lambda = _lambda.DockerImageFunction(
            self, "BackendLambda",
            function_name="dsow-backend-api-cdk", # 既存の関数名に合わせる
            architecture=_lambda.Architecture.X86_64,
            code=_lambda.DockerImageCode.from_image_asset("../backend"),
            memory_size=1024,
            timeout=Duration.seconds(30),
            environment={
                "IS_LAMBDA": "True",
                "FRONTEND_URL": "https://main.d2j93n44yuyr7t.amplifyapp.com"
            }
        )

        api = apigw.LambdaRestApi(
            self, "DsonwebApi",
            handler=backend_lambda,
            proxy=True, # 全てのリクエストを FastAPI に転送
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=["https://main.d2j93n44yuyr7t.amplifyapp.com", "http://localhost:5173"],
                allow_methods=apigw.Cors.ALL_METHODS
            )
        )

        # 4. 権限の付与 (最小権限)
        user_table.grant_read_write_data(backend_lambda)
        upload_table.grant_read_write_data(backend_lambda)
        upload_bucket.grant_read_write(backend_lambda)