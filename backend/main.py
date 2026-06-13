from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
import shutil
import uuid
import json

from database import SessionLocal, engine
from models import Base, Student

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files to serve profile images
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CREATE: Add a new student profile
@app.post("/students")
async def create_student(
    name: str = Form(...),
    email: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    skills: str = Form(...),
    date_of_birth: str = Form(...),
    profile_image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # Check if email is already registered
    existing_student = db.query(Student).filter(Student.email == email).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Email already exists.")

    # Process and save the profile image if provided
    db_profile_image = None
    if profile_image and profile_image.filename:
        file_ext = os.path.splitext(profile_image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_image.file, buffer)
        db_profile_image = f"/static/uploads/{unique_filename}"

    # Create new student instance
    new_student = Student(
        name=name,
        email=email,
        age=age,
        gender=gender,
        skills=skills,  # Stores the serialized JSON array string
        date_of_birth=date_of_birth,
        profile_image=db_profile_image
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {"message": "Student Added", "student_id": new_student.id}

# READ: Get list of all students
@app.get("/students")
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    result = []
    for s in students:
        # Deserialize the skills JSON string back to an array
        try:
            skills_list = json.loads(s.skills) if s.skills else []
        except Exception:
            skills_list = []

        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "age": s.age,
            "date_of_birth": s.date_of_birth,
            "gender": s.gender,
            "skills": skills_list,
            "profile_image": s.profile_image
        })
    return result

# UPDATE: Edit an existing student profile
@app.put("/students/{id}")
async def update_student(
    id: int,
    name: str = Form(...),
    email: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    skills: str = Form(...),
    date_of_birth: str = Form(...),
    remove_image: str = Form(None),
    profile_image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Check for email collision with other students
    if student.email != email:
        existing_student = db.query(Student).filter(Student.email == email).first()
        if existing_student:
            raise HTTPException(status_code=400, detail="Email already exists.")

    # Handle image removal if requested
    if remove_image == "true":
        if student.profile_image:
            old_file_path = os.path.join(BASE_DIR, student.profile_image.lstrip("/"))
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass
            student.profile_image = None

    # Handle new profile image upload
    if profile_image and profile_image.filename:
        # Delete old file if it exists
        if student.profile_image:
            old_file_path = os.path.join(BASE_DIR, student.profile_image.lstrip("/"))
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass
        
        file_ext = os.path.splitext(profile_image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_image.file, buffer)
        student.profile_image = f"/static/uploads/{unique_filename}"

    # Update other fields
    student.name = name
    student.email = email
    student.age = age
    student.gender = gender
    student.skills = skills
    student.date_of_birth = date_of_birth

    db.commit()
    return {"message": "Updated"}

# DELETE: Remove a student profile
@app.delete("/students/{id}")
def delete_student(id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Clean up file on disk if it exists
    if student.profile_image:
        file_path = os.path.join(BASE_DIR, student.profile_image.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    db.delete(student)
    db.commit()
    return {"message": "Deleted"}