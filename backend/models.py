from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    date_of_birth = Column(String(10), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    skills = Column(String(500), nullable=True)  # Stores JSON-serialized array of strings
    profile_image = Column(String(255), nullable=True)  # File path to the profile image, e.g., "/static/uploads/filename"