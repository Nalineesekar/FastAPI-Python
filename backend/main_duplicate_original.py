from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User_reg
from schemas import LoginRequest
import os
import shutil
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    age: int = Form(...),
    dob: str = Form(...),
    gender: str = Form(...),
    phone: str = Form(...),
    skills: str = Form(...),
    address: str = Form(...),
    profile: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(User_reg)
        .filter(User_reg.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, profile.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(profile.file, buffer)

    new_user = User_reg(
        name=name,
        email=email,
        password=password,
        age=age,
        dob=dob,
        gender=gender,
        phone_no=phone,
        skills=skills,
        address=address,
        profile=profile.filename,
        added_date=datetime.now(),
        updated_date=datetime.now()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Registration Successful",
        "user_id": new_user.id
    }


@app.post("/login")
def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User_reg)
        .filter(
            User_reg.email == request.email,
            User_reg.password == request.password
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )

    return {
        "user_id": user.id,
        "name": user.name
    }