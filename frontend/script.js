const API = "http://127.0.0.1:8000";

let editStudentId = null;
let removeImageFlag = false;
let studentsList = []; // Caches students for client-side search

// Default SVG avatar placeholder
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>";

// DOM Elements
const form = document.getElementById("studentForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const dobInput = document.getElementById("date_of_birth");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const profileImageInput = document.getElementById("profileImage");
const avatarPreview = document.getElementById("avatarPreview");
const uploadBtn = document.getElementById("uploadBtn");
const removeImgBtn = document.getElementById("removeImgBtn");
const avatarPreviewContainer = document.getElementById("avatarPreviewContainer");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const searchInput = document.getElementById("searchInput");
const studentTableBody = document.getElementById("studentTable");
const emptyState = document.getElementById("emptyState");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    loadStudents();
    setupEventListeners();
});

// Setup form interaction listeners
function setupEventListeners() {
    // File upload handlers
    uploadBtn.addEventListener("click", () => profileImageInput.click());
    avatarPreviewContainer.addEventListener("click", () => profileImageInput.click());
    
    profileImageInput.addEventListener("change", handleImageSelect);
    removeImgBtn.addEventListener("click", handleImageRemove);

    // Live validation handlers
    nameInput.addEventListener("input", () => validateField(nameInput, checkName));
    emailInput.addEventListener("input", () => validateField(emailInput, checkEmail));
    
    dobInput.addEventListener("change", () => {
        calculateAge();
        validateField(dobInput, checkDob);
    });

    genderInput.addEventListener("change", () => validateField(genderInput, checkGender));

    // Skills changes
    const skillsCheckboxes = document.querySelectorAll('input[name="skills"]');
    skillsCheckboxes.forEach(cb => {
        cb.addEventListener("change", validateSkills);
    });
}

/* ==========================================================================
   Validation Core Logic
   ========================================================================== */

function validateField(inputEl, validationFn) {
    const formGroup = inputEl.closest(".form-group");
    const errorEl = document.getElementById(`${inputEl.id}-error`);
    const validationResult = validationFn(inputEl.value);

    if (validationResult.isValid) {
        formGroup.classList.remove("error");
        formGroup.classList.add("success");
        if (errorEl) errorEl.textContent = "";
        return true;
    } else {
        formGroup.classList.remove("success");
        formGroup.classList.add("error");
        if (errorEl) errorEl.textContent = validationResult.message;
        return false;
    }
}

// Validation predicates
function checkName(val) {
    const cleaned = val.trim();
    if (!cleaned) return { isValid: false, message: "Name is required." };
    if (cleaned.length < 2 || cleaned.length > 50) {
        return { isValid: false, message: "Name must be between 2 and 50 characters." };
    }
    const nameRegex = /^[a-zA-Z\s-]+$/;
    if (!nameRegex.test(cleaned)) {
        return { isValid: false, message: "Name must contain letters, spaces, and hyphens only." };
    }
    return { isValid: true };
}

function checkEmail(val) {
    const cleaned = val.trim();
    if (!cleaned) return { isValid: false, message: "Email is required." };
    // Standard RFC 5322 email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (!emailRegex.test(cleaned)) {
        return { isValid: false, message: "Please enter a valid email address." };
    }
    return { isValid: true };
}

function checkDob(val) {
    if (!val) return { isValid: false, message: "Date of birth is required." };
    const dob = new Date(val);
    const today = new Date();
    if (dob >= today) {
        return { isValid: false, message: "Date of birth must be in the past." };
    }
    
    // Check calculated age range
    const calculatedAge = parseInt(ageInput.value);
    if (isNaN(calculatedAge) || calculatedAge < 18 || calculatedAge > 100) {
        return { isValid: false, message: "Students must be between 18 and 100 years old." };
    }
    
    return { isValid: true };
}

function checkGender(val) {
    if (!val) return { isValid: false, message: "Please select your gender." };
    return { isValid: true };
}

function validateSkills() {
    const checkedBoxes = document.querySelectorAll('input[name="skills"]:checked');
    const errorEl = document.getElementById("skills-error");
    
    if (checkedBoxes.length > 0) {
        errorEl.textContent = "";
        return true;
    } else {
        errorEl.textContent = "Please select at least one skill.";
        return false;
    }
}

// Auto-calculate Age from Birth Date
function calculateAge() {
    const dobValue = dobInput.value;
    if (!dobValue) {
        ageInput.value = "";
        return;
    }

    const birthDate = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    ageInput.value = age >= 0 ? age : 0;
    
    // Automatically trigger validation of Age form group
    const ageGroup = ageInput.closest(".form-group");
    if (age >= 18 && age <= 100) {
        ageGroup.classList.remove("error");
        ageGroup.classList.add("success");
        document.getElementById("age-error").textContent = "";
    } else {
        ageGroup.classList.remove("success");
        ageGroup.classList.add("error");
        document.getElementById("age-error").textContent = "Age must be between 18 and 100.";
    }
}

// Image Selection & Client Validation
function handleImageSelect(e) {
    const file = e.target.files[0];
    const errorEl = document.getElementById("image-error");
    
    if (!file) return;

    // Validate size (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        errorEl.textContent = "Image must be smaller than 2MB.";
        profileImageInput.value = "";
        return;
    }

    // Validate MIME type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        errorEl.textContent = "Format must be JPEG, PNG, or WEBP.";
        profileImageInput.value = "";
        return;
    }

    errorEl.textContent = "";
    removeImageFlag = false;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (event) => {
        avatarPreview.src = event.target.result;
        removeImgBtn.style.display = "inline-block";
    };
    reader.readAsDataURL(file);
}

// Remove Selected/Existing Image
function handleImageRemove() {
    profileImageInput.value = "";
    avatarPreview.src = DEFAULT_AVATAR;
    removeImgBtn.style.display = "none";
    removeImageFlag = true;
    document.getElementById("image-error").textContent = "";
}

// Validate entire form before submission
function validateForm() {
    const isNameValid = validateField(nameInput, checkName);
    const isEmailValid = validateField(emailInput, checkEmail);
    const isDobValid = validateField(dobInput, checkDob);
    const isGenderValid = validateField(genderInput, checkGender);
    const isSkillsValid = validateSkills();

    return isNameValid && isEmailValid && isDobValid && isGenderValid && isSkillsValid;
}

/* ==========================================================================
   API Operations (CRUD)
   ========================================================================== */

// READ: Load student profiles from database
async function loadStudents() {
    try {
        const response = await fetch(`${API}/students`);
        if (!response.ok) throw new Error("Could not retrieve student list.");
        
        studentsList = await response.json();
        renderStudentsTable(studentsList);
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Render student table rows dynamically
function renderStudentsTable(data) {
    let html = "";
    
    if (data.length === 0) {
        emptyState.style.display = "block";
        studentTableBody.innerHTML = "";
        return;
    }
    
    emptyState.style.display = "none";

    data.forEach(student => {
        // Skill chips list
        const skillChips = student.skills.map(s => `<span class="tag">${s}</span>`).join(" ");
        
        // Avatar URL
        const avatarSrc = student.profile_image ? `${API}${student.profile_image}` : DEFAULT_AVATAR;
        
        // Formatting Date of Birth
        let dobStr = "N/A";
        if (student.date_of_birth) {
            const dateObj = new Date(student.date_of_birth);
            dobStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        html += `
        <tr id="row-${student.id}">
            <td class="avatar-cell">
                <img src="${avatarSrc}" class="table-avatar" alt="Avatar">
            </td>
            <td>
                <div class="student-info">
                    <span class="student-name">${student.name}</span>
                    <span class="student-email">${student.email}</span>
                </div>
            </td>
            <td>
                <div>${student.age} yrs</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${dobStr}</div>
            </td>
            <td>${student.gender}</td>
            <td>
                <div class="skills-tags">${skillChips}</div>
            </td>
            <td class="text-right">
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editStudent(${student.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </td>
        </tr>`;
    });

    studentTableBody.innerHTML = html;
}

// CREATE / UPDATE: Submit form data to FastAPI
async function saveStudent() {
    if (!validateForm()) {
        showToast("Please fix the validation errors in the form.", "error");
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const age = ageInput.value;
    const gender = genderInput.value;
    const date_of_birth = dobInput.value;

    // Gather selected skills
    const checkedSkills = [];
    document.querySelectorAll('input[name="skills"]:checked').forEach(cb => {
        checkedSkills.push(cb.value);
    });

    // Create Multipart FormData payload
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("age", age);
    formData.append("gender", gender);
    formData.append("skills", JSON.stringify(checkedSkills));
    formData.append("date_of_birth", date_of_birth);
    
    if (profileImageInput.files[0]) {
        formData.append("profile_image", profileImageInput.files[0]);
    }
    
    if (removeImageFlag) {
        formData.append("remove_image", "true");
    }

    submitBtn.disabled = true;
    submitBtn.textContent = editStudentId ? "Updating..." : "Saving...";

    try {
        const url = editStudentId ? `${API}/students/${editStudentId}` : `${API}/students`;
        const method = editStudentId ? "PUT" : "POST";
        
        const response = await fetch(url, {
            method: method,
            body: formData // Fetch sets correct Multipart headers automatically
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || "Server request failed.");
        }

        showToast(editStudentId ? "Profile updated successfully!" : "Student profile added!", "success");
        resetForm();
        loadStudents();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editStudentId ? "Update Profile" : "Save Student";
    }
}

// POPULATE FORM FOR EDIT: Populate form fields from cache
function editStudent(id) {
    const student = studentsList.find(s => s.id === id);
    if (!student) return;

    editStudentId = id;
    
    // Set headers
    formTitle.textContent = "Edit Student Profile";
    submitBtn.textContent = "Update Profile";
    cancelBtn.style.display = "inline-block";

    // Populate standard values
    nameInput.value = student.name;
    emailInput.value = student.email;
    dobInput.value = student.date_of_birth;
    ageInput.value = student.age;
    genderInput.value = student.gender;

    // Set skills checkboxes
    const skills = student.skills || [];
    document.querySelectorAll('input[name="skills"]').forEach(cb => {
        cb.checked = skills.includes(cb.value);
    });

    // Set image previews
    if (student.profile_image) {
        avatarPreview.src = `${API}${student.profile_image}`;
        removeImgBtn.style.display = "inline-block";
    } else {
        avatarPreview.src = DEFAULT_AVATAR;
        removeImgBtn.style.display = "none";
    }

    removeImageFlag = false;

    // Scroll to form on mobile/small screens
    form.scrollIntoView({ behavior: "smooth" });
    
    // Trigger validation styling updates
    validateField(nameInput, checkName);
    validateField(emailInput, checkEmail);
    validateField(dobInput, checkDob);
    validateField(genderInput, checkGender);
    validateSkills();
}

// DELETE: Delete profile from database
async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student profile? This action cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`${API}/students/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Failed to delete student.");

        showToast("Student profile deleted.", "success");
        
        // If the student being edited is deleted, reset the form
        if (editStudentId === id) {
            resetForm();
        }

        loadStudents();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Reset Form fields and layouts
function resetForm() {
    form.reset();
    editStudentId = null;
    removeImageFlag = false;
    
    formTitle.textContent = "Create New Student";
    submitBtn.textContent = "Save Student";
    cancelBtn.style.display = "none";
    
    avatarPreview.src = DEFAULT_AVATAR;
    removeImgBtn.style.display = "none";
    profileImageInput.value = "";

    // Clear validation styling
    document.querySelectorAll(".form-group").forEach(g => {
        g.classList.remove("success", "error");
    });
    
    document.querySelectorAll(".error-msg").forEach(e => {
        e.textContent = "";
    });
}

// Search Filter functionality (Client side)
function filterStudents() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        renderStudentsTable(studentsList);
        return;
    }

    const filtered = studentsList.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(query);
        const emailMatch = s.email.toLowerCase().includes(query);
        const genderMatch = s.gender.toLowerCase().includes(query);
        const skillMatch = s.skills.some(skill => skill.toLowerCase().includes(query));
        
        return nameMatch || emailMatch || genderMatch || skillMatch;
    });

    renderStudentsTable(filtered);
}

/* ==========================================================================
   UI Toast Notification System
   ========================================================================== */

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.25s ease forwards";
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, 4000);
}