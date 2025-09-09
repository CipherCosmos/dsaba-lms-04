from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from urllib.parse import quote_plus

# Database URL with proper encoding
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost:5432/exam_management"
)

# Handle password encoding if needed
if "@localhost" in DATABASE_URL and ":" in DATABASE_URL.split("@")[0].split("//")[1]:
    parts = DATABASE_URL.split("://")[1].split("@")
    user_pass = parts[0]
    host_db = parts[1]
    if ":" in user_pass:
        user, password = user_pass.split(":", 1)
        encoded_password = quote_plus(password)
        DATABASE_URL = f"postgresql://{user}:{encoded_password}@{host_db}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()