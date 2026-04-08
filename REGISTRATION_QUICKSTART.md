# Quick Start - User Registration

Follow these steps to run and test the complete registration flow:

## 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Start the application
npm run start

# The backend will run on: http://localhost:8080
# API base: http://localhost:8080/api/v1
```

**Required Environment Variables** (in `.env` or check `main.ts` for defaults):
```
MONGODB_URI=mongodb://localhost:27017/senior-app
JWT_ACCESS_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
```

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Frontend runs on: http://localhost:5173
```

The frontend environment is already configured in `.env.local` to point to the backend API.

## 3. Test Registration

### Option A: Using Browser
1. Open: http://localhost:5173
2. See the registration form
3. Fill in the form:
   - Email: `test@example.com`
   - Password: `TestPass123` (must have uppercase, lowercase, number, 8+ chars)
   - Confirm Password: `TestPass123`
4. Click "Create Account"
5. See success message!

### Option B: Using cURL
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "ValidPass123"
  }'

# Expected Response (201 Created):
# {
#   "id": "507f1f77bcf86cd799439011",
#   "email": "user@example.com"
# }
```

## Validation Requirements

**Password must have all of:**
- At least 8 characters
- At least one UPPERCASE letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Not more than 128 characters

**Email must be:**
- Valid email format (contains @)
- Not already registered

## Quick Test Scenarios

### ✅ Success
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123"
}
```

### ❌ Weak Password
```json
{
  "email": "user@example.com",
  "password": "weak123"
}
```
→ Error: "Password must contain at least one uppercase letter"

### ❌ Invalid Email
```json
{
  "email": "not-an-email",
  "password": "SecurePass123"
}
```
→ Error: "Invalid email address"

### ❌ Duplicate Email
Register twice with same email:
→ Second attempt: Error: "Email already in use" (409 Conflict)

## Docker Alternative (Optional)

If you prefer Docker Compose:
```bash
docker-compose up
```

This starts:
- MongoDB on port 27017
- Backend on port 8080 (with hot reload)
- Frontend dev server on port 5173

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend can't connect to backend | Check VITE_API_BASE_URL in `.env.local` |
| "Cannot find module" errors | Run `npm install` in both directories |
| MongoDB connection error | Ensure MongoDB is running on port 27017 |
| Port already in use | Change port in respective `package.json` scripts |
| CORS errors | Frontend and backend are properly configured |

## Files to Review

**Backend Logic:**
- [auth.service.ts](backend/src/auth/auth.service.ts) - Password hashing & validation
- [auth.controller.ts](backend/src/auth/auth.controller.ts) - API endpoint
- [register.dto.ts](backend/src/users/data/dto/register.dto.ts) - Validation rules

**Frontend Logic:**
- [RegisterForm.jsx](frontend/src/components/RegisterForm.jsx) - Form component
- [authService.js](frontend/src/utils/authService.js) - API calls
- [apiClient.js](frontend/src/utils/apiClient.js) - HTTP client setup

## Full Documentation

See [REGISTRATION_IMPLEMENTATION.md](./REGISTRATION_IMPLEMENTATION.md) for detailed implementation guide.
