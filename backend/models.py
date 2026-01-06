from sqlalchemy import Boolean, Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(String, index=True) # 文字列のタイムスタンプID
    username = Column(String, index=True)
    filename = Column(String)
    s3_key = Column(String) # ローカルの場合は相対パス
    upload_date = Column(String)
    row_count = Column(Integer)

