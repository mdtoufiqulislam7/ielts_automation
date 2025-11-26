# Postman API Test Guide

## Base URL
```
http://localhost:5000
```

## Authentication
Most routes require a Bearer token. Get it from the login endpoint and add it to headers:
```
Authorization: Bearer <your_access_token>
```

---

## 1. USER ROUTES (`/api`)

### 1.1 Register User
**POST** `/api/register`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "password123"
}
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "testuser"
    }
  }
}
```

---

### 1.2 Login User
**POST** `/api/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "testuser"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

**⚠️ Save the `accessToken` for authenticated requests!**

---

### 1.3 Get User Profile (Protected)
**GET** `/api/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Expected Response (200):**
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "testuser",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 2. PROFILE ROUTES (`/api/profile`)

### 2.1 Get Profile
**GET** `/api/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Expected Response (200):**
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "bio": "User bio text",
    "avatar_url": "https://cloudinary-url.com/image.jpg",
    "user_id": "uuid"
  }
}
```

---

### 2.2 Update Profile (Bio and/or Avatar)
**PUT** `/api/profile`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `bio` (Text): "Updated bio text"
- `avatar` (File): Select image file (optional)

**Expected Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "bio": "Updated bio text",
    "avatar_url": "https://cloudinary-url.com/new-image.jpg",
    "user_id": "uuid"
  }
}
```

---

### 2.3 Update Bio Only
**PATCH** `/api/profile/bio`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "bio": "My new bio text here"
}
```

**Expected Response (200):**
```json
{
  "message": "Bio updated successfully",
  "data": {
    "id": "uuid",
    "bio": "My new bio text here",
    "avatar_url": "https://cloudinary-url.com/image.jpg",
    "user_id": "uuid"
  }
}
```

---

### 2.4 Upload Avatar Only
**POST** `/api/profile/avatar`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `avatar` (File): Select image file (required)

**Expected Response (200):**
```json
{
  "message": "Avatar uploaded successfully",
  "data": {
    "id": "uuid",
    "bio": "User bio",
    "avatar_url": "https://cloudinary-url.com/new-avatar.jpg",
    "user_id": "uuid"
  }
}
```

---

## 3. EXAM ROUTES (`/api/exams`)

### 3.1 Get All Exams (Public)
**GET** `/api/exams`

**Headers:**
```
(No authentication required)
```

**Expected Response (200):**
```json
{
  "message": "Exams retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "exam_type": "Task 1",
      "taken_at": "2024-01-01T00:00:00.000Z",
      "user_id": "uuid",
      "questions": [
        {
          "id": "uuid",
          "exam_id": "uuid",
          "question_text": "Question text here",
          "created_by_ai": true
        }
      ]
    }
  ]
}
```

---

### 3.2 Get Exam by ID (Public)
**GET** `/api/exams/:id`

**Example:** `GET /api/exams/123e4567-e89b-12d3-a456-426614174000`

**Headers:**
```
(No authentication required)
```

**Expected Response (200):**
```json
{
  "message": "Exam retrieved successfully",
  "data": {
    "id": "uuid",
    "exam_type": "Task 1",
    "taken_at": "2024-01-01T00:00:00.000Z",
    "user_id": "uuid",
    "questions": [
      {
        "id": "uuid",
        "exam_id": "uuid",
        "question_text": "Question text here",
        "created_by_ai": true
      }
    ]
  }
}
```

---

### 3.3 Create Exam with Auto-Generated Questions (Protected)
**POST** `/api/exams`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "exam_type": "Task 1"
}
```

**Note:** `exam_type` can be "Task 1" or "Task 2" for IELTS Writing

**Expected Response (201):**
```json
{
  "message": "Exam created successfully with auto-generated questions",
  "data": {
    "id": "uuid",
    "exam_type": "Task 1",
    "taken_at": "2024-01-01T00:00:00.000Z",
    "user_id": "uuid",
    "questions": [
      {
        "id": "uuid",
        "exam_id": "uuid",
        "question_text": "AI generated question 1",
        "created_by_ai": true
      },
      {
        "id": "uuid",
        "exam_id": "uuid",
        "question_text": "AI generated question 2",
        "created_by_ai": true
      }
      // ... 5 questions total
    ]
  }
}
```

**⚠️ Save the `exam_id` for starting the exam!**

---

### 3.4 Start Exam (Protected)
**POST** `/api/exams/start`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "exam_id": "exam-uuid-here"
}
```

**Expected Response (200):**
```json
{
  "message": "Exam started successfully",
  "data": {
    "id": "user_exam_uuid",
    "exam_id": "exam-uuid",
    "user_id": "user-uuid",
    "started_at": "2024-01-01T00:00:00.000Z",
    "completed_at": null,
    "exam": {
      "id": "exam-uuid",
      "exam_type": "Task 1",
      "questions": [
        {
          "id": "question-uuid",
          "exam_id": "exam-uuid",
          "question_text": "Question text",
          "created_by_ai": true
        }
      ]
    }
  }
}
```

**⚠️ Save the `user_exam_id` (data.id) for submitting answers!**

---

### 3.5 Submit Answer (Protected)
**POST** `/api/exams/submit-answer`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "user_exam_id": "user_exam_uuid_here",
  "question_id": "question_uuid_here",
  "answer_text": "My answer to this question..."
}
```

**Expected Response (200):**
```json
{
  "message": "Answer submitted successfully",
  "data": {
    "id": "answer-uuid",
    "user_exam_id": "user_exam_uuid",
    "question_id": "question_uuid",
    "answer_text": "My answer to this question...",
    "is_correct": null
  }
}
```

**Note:** Submit one answer per question. You can update an answer by submitting again with the same `question_id`.

---

### 3.6 Complete Exam (Protected)
**POST** `/api/exams/complete`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "user_exam_id": "user_exam_uuid_here"
}
```

**Expected Response (200):**
```json
{
  "message": "Exam completed successfully"
}
```

---

### 3.7 Get All User's Exams (Protected)
**GET** `/api/exams/user/my-exams`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Expected Response (200):**
```json
{
  "message": "User exams retrieved successfully",
  "data": [
    {
      "id": "user_exam_uuid",
      "exam_id": "exam_uuid",
      "user_id": "user_uuid",
      "started_at": "2024-01-01T00:00:00.000Z",
      "completed_at": "2024-01-01T01:00:00.000Z",
      "exam_type": "Task 1",
      "taken_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3.8 Get User Exam with Answers (Protected)
**GET** `/api/exams/user/:id`

**Example:** `GET /api/exams/user/123e4567-e89b-12d3-a456-426614174000`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Expected Response (200):**
```json
{
  "message": "User exam retrieved successfully",
  "data": {
    "id": "user_exam_uuid",
    "exam_id": "exam_uuid",
    "user_id": "user_uuid",
    "started_at": "2024-01-01T00:00:00.000Z",
    "completed_at": "2024-01-01T01:00:00.000Z",
    "exam": {
      "id": "exam_uuid",
      "exam_type": "Task 1",
      "taken_at": "2024-01-01T00:00:00.000Z"
    },
    "questions": [
      {
        "question_id": "question_uuid",
        "question_text": "Question text here",
        "created_by_ai": true,
        "answer_id": "answer_uuid",
        "answer_text": "User's answer",
        "is_correct": null
      }
    ]
  }
}
```

---

## Complete Test Flow Example

### Step 1: Register
```
POST /api/register
Body: { "email": "test@test.com", "username": "testuser", "password": "test123" }
```

### Step 2: Login
```
POST /api/login
Body: { "email": "test@test.com", "password": "test123" }
→ Save accessToken
```

### Step 3: Create Exam
```
POST /api/exams
Headers: Authorization: Bearer <access_token>
Body: { "exam_type": "Task 1" }
→ Save exam_id
```

### Step 4: Start Exam
```
POST /api/exams/start
Headers: Authorization: Bearer <access_token>
Body: { "exam_id": "<saved_exam_id>" }
→ Save user_exam_id and question_ids
```

### Step 5: Submit Answers (repeat for each question)
```
POST /api/exams/submit-answer
Headers: Authorization: Bearer <access_token>
Body: {
  "user_exam_id": "<saved_user_exam_id>",
  "question_id": "<question_id>",
  "answer_text": "My answer..."
}
```

### Step 6: Complete Exam
```
POST /api/exams/complete
Headers: Authorization: Bearer <access_token>
Body: { "user_exam_id": "<saved_user_exam_id>" }
```

### Step 7: View Results
```
GET /api/exams/user/<saved_user_exam_id>
Headers: Authorization: Bearer <access_token>
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Error message here"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message"
}
```

---

## Environment Variables Setup

Make sure your `.env` file has:
```env
# Database
DB_HOST=your_host
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=ielts

# JWT
JWT_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Serper (AI question generator)
SERPER_API_KEY=your_serper_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Postman Collection Tips

1. **Create Environment Variables:**
   - `base_url`: `http://localhost:5000`
   - `access_token`: (set after login)
   - `exam_id`: (set after creating exam)
   - `user_exam_id`: (set after starting exam)

2. **Use Pre-request Scripts:**
   ```javascript
   // Auto-set token
   pm.request.headers.add({
     key: 'Authorization',
     value: 'Bearer ' + pm.environment.get('access_token')
   });
   ```

3. **Use Tests Scripts:**
   ```javascript
   // Auto-save token after login
   if (pm.response.code === 200) {
     const jsonData = pm.response.json();
     if (jsonData.data && jsonData.data.accessToken) {
       pm.environment.set('access_token', jsonData.data.accessToken);
     }
   }
   ```

