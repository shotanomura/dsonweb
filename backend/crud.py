import os
import boto3
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session
from datetime import datetime
from boto3.dynamodb.conditions import Key
import models, schemas, auth

# 環境変数
IS_LAMBDA = os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None

# DynamoDB Tables
user_table = None
upload_table = None

if IS_LAMBDA:
    dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
    user_table = dynamodb.Table('Users')
    upload_table = dynamodb.Table('Uploads')

# --- User Operations ---
def get_user_by_username(username: str, db: Session):
    if IS_LAMBDA:
        try:
            response = user_table.get_item(Key={'username': username})
            item = response.get('Item')
            if item:
                return schemas.UserInDB(**item)
            return None
        except ClientError as e:
            print(e.response['Error']['Message'])
            return None
    else:
        return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(email: str, db: Session):
    if IS_LAMBDA:
        try:
            response = user_table.scan(
                FilterExpression=Key('email').eq(email)
            )
            items = response.get('Items', [])
            if items:
                return schemas.UserInDB(**items[0])
            return None
        except ClientError as e:
            print(e.response['Error']['Message'])
            return None
    else:
        return db.query(models.User).filter(models.User.email == email).first()

def create_user(user: schemas.UserCreate, hashed_password: str, db: Session):
    if IS_LAMBDA:
        new_user_item = {
            "username": user.username,
            "email": user.email,
            "hashed_password": hashed_password,
        }
        try:
            user_table.put_item(Item=new_user_item)
            return schemas.UserInDB(**new_user_item)
        except ClientError as e:
            raise Exception(str(e))
    else:
        db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

# --- Upload Operations ---
def create_upload_metadata(item: dict, db: Session):
    """
    item: {
        "username": str,
        "upload_id": str,
        "filename": str,
        "s3_key": str,
        "upload_date": str,
        "row_count": int
    }
    """
    if IS_LAMBDA:
        try:
            upload_table.put_item(Item=item)
            return schemas.Upload(**item)
        except ClientError as e:
            raise Exception(str(e))
    else:
        try:
            db_upload = models.Upload(
                username=item["username"],
                upload_id=item["upload_id"],
                filename=item["filename"],
                s3_key=item["s3_key"],
                upload_date=item["upload_date"],
                row_count=item["row_count"]
            )
            db.add(db_upload)
            db.commit()
            db.refresh(db_upload)
            return db_upload
        except Exception as e:
            db.rollback()
            raise e

def get_uploads_by_username(username: str, db: Session):
    if IS_LAMBDA:
        try:
            response = upload_table.query(
                KeyConditionExpression=Key('username').eq(username)
            )
            items = response.get('Items', [])
            return [schemas.Upload(**item) for item in items]
        except ClientError as e:
            raise Exception(str(e))
    else:
        return db.query(models.Upload).filter(models.Upload.username == username).all()

def count_user_uploads(username: str, db: Session) -> int:
    if IS_LAMBDA:
        try:
            response = upload_table.query(
                KeyConditionExpression=Key('username').eq(username),
                Select='COUNT'
            )
            return response['Count']
        except ClientError as e:
            print(f"DynamoDB Count Error: {e}")
            return 0
    else:
        return db.query(models.Upload).filter(models.Upload.username == username).count()

def get_upload_by_id(username: str, upload_id: str, db: Session):
    if IS_LAMBDA:
        try:
             response = upload_table.get_item(Key={'username': username, 'upload_id': upload_id})
             item = response.get('Item')
             if item:
                 return schemas.Upload(**item)
             return None
        except ClientError as e:
            raise Exception(str(e))
    else:
        return db.query(models.Upload).filter(
            models.Upload.username == username, 
            models.Upload.upload_id == upload_id
        ).first()

def delete_upload(username: str, upload_id: str, db: Session):
    if IS_LAMBDA:
        try:
            upload_table.delete_item(Key={'username': username, 'upload_id': upload_id})
        except ClientError as e:
            raise Exception(str(e))
    else:
        upload = db.query(models.Upload).filter(
            models.Upload.username == username, 
            models.Upload.upload_id == upload_id
        ).first()
        if upload:
            db.delete(upload)
            db.commit()
