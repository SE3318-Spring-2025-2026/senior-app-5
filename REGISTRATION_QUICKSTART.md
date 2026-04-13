# Quick Start - User Registration

Complete guide to run and test the student self-registration flow.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  RegisterPage (Port 5173)                         │ │
│  │  ├── RegisterForm Component                       │ │
│  │  │   ├── Email validation                          │ │
│  │  │   ├── Password strength check                   │ │
│  │  │   └── Real-time feedback                        │ │
│  │  └── Success Confirmation Screen                  │ │
│  └────────────────────────────────────────────────────┘ │
│           ↓ HTTP (POST /auth/register)                   │
├─────────────────────────────────────────────────────────┤
│               Backend (NestJS)                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  AuthController (Port 8080)                       │ │
│  │  ├── POST /auth/register                           │ │
│  │  │   ├── Validate DTO                              │ │
│  │  │   ├── Hash password (bcrypt)                    │ │
│  │  │   └── Store in DB                               │ │
│  │  └── POST /auth/login                              │ │
│  │      └── Return JWT token                          │ │
│  └────────────────────────────────────────────────────┘ │
│           ↓ MongoDB                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Database (Collections)                           │ │
│  │  └── users (email, password hash)                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB (local or Atlas connection)
- Git (for cloning repo)

## 1. Backend Setup

### Start Backend Server

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run start:dev

# Server runs at: http://localhost:8080
# API Base URL: http://localhost:8080/api/v1
```

### Environment Variables

Create `.env` file in `backend/` directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/senior-app

# JWT Configuration
JWT_ACCESS_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m

# Server
PORT=8080
```

### Verify Backend is Running

```bash
# Test the health endpoint
curl http://localhost:8080/api/v1/auth/me
# Should return 401 (no token) or similar auth error
```

## 2. Frontend Setup

### Start Frontend Development Server

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend runs at: http://localhost:5173
```

### Environment Configuration

The frontend uses `VITE_API_BASE_URL` environment variable:

**Development** (automatic):
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

**Production** (create `.env.production`):
```
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

### Verify Frontend is Running

Open browser: http://localhost:5173  
You should see the registration form immediately.

## 3. Test Registration Flow

### Manual Testing via Browser

1. **Navigate to Registration Page**
   - Open: http://localhost:5173/register
   - You'll see the registration form

2. **Register New User**
   - Email: `test@example.com`
   - Password: `TestPass123` 
     - ✓ 8+ characters
     - ✓ Uppercase (T)
     - ✓ Lowercase (est)
     - ✓ Number (123)
   - Confirm: `TestPass123`
   - Click "Create Account"

3. **See Success Message**
   - Message: "Registration successful! Welcome, test@example.com..."
   - Confirmation screen displays
   - Auto-redirects to login page after 2.5 seconds

4. **Login with Created Account**
   - Email: `test@example.com`
   - Password: `TestPass123`
   - Click "Sign In"
   - Should redirect to secure area

### Test Validation

**Test Email Validation:**
- Try: `invalid-email` → Shows "Invalid email address"
- Try: `test@` → Shows "Invalid email address"
- Try: `@example.com` → Shows "Invalid email address"

**Test Password Validation:**
- Try: `weak` → Shows "Password must be at least 8 characters long"
- Try: `alllowercase123` → Shows "Password must contain at least one uppercase letter"
- Try: `ALLUPPERCASE123` → Shows "Password must contain at least one lowercase letter"
- Try: `NoNumbers` → Shows "Password must contain at least one number"

**Test Password Matching:**
- Enter different passwords in confirm field → Shows "Passwords do not match"

### Test Error Handling

**Duplicate Email:**
1. Register with `test1@example.com`
2. Try to register again with same email
3. See error: "Email already in use" (or similar from backend)

**Network Error Simulation:**
1. Stop the backend server
2. Try to register
3. See error: "Registration failed. Please try again."

## 4. File Structure

### Frontend Components

```
frontend/src/
├── components/
│   ├── RegisterForm.jsx              ← Main form (email, password, validation)
│   └── RegisterForm.module.css       ← Form styling, responsive design
│
├── pages/
│   ├── RegisterPage.jsx              ← Page wrapper + success screen
│   ├── RegisterPage.module.css       ← Page styles
│   ├── LoginPage.jsx                 ← Login form
│   └── LoginPage.module.css          ← Login styles
│
├── utils/
│   ├── authService.js                ← register(), login(), getCurrentUser()
│   └── apiClient.js                  ← Axios setup, JWT injection
│
├── config/
│   └── api.js                        ← API endpoints configuration
│
└── App.jsx                           ← Router setup
```

### Backend Components

```
backend/src/
├── auth/
│   ├── auth.controller.ts            ← POST /auth/register endpoint
│   ├── auth.service.ts               ← Register logic, password hashing
│   └── auth.module.ts                ← Auth module setup
│
└── users/
    ├── users.service.ts              ← User database operations
    └── data/
        └── dto/
            └── register.dto.ts       ← Validation (email, password)
```

## 5. Key Features Implemented

### ✅ Client-Side Validation
- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- Password confirmation matching
- Real-time feedback with visual indicators

### ✅ Responsive Design
- Works on desktop, tablet, and mobile
- Touch-friendly buttons (44x44px minimum)
- Readable font sizes (prevents iOS zoom)
- Optimized for all screen sizes

### ✅ User Experience
- Password visibility toggle
- Loading spinner during submission
- Real-time requirement checklist
- Clear success/error messages
- Auto-redirect to login on success

### ✅ Security
- Passwords transmitted securely
- Server-side password hashing (bcrypt)
- JWT token management
- No passwords stored locally

### ✅ Accessibility
- Keyboard navigation support
- Screen reader compatible
- ARIA labels and semantic HTML
- Clear focus states

## 6. API Endpoints

### Registration
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 201 Created
{
  "id": "user123",
  "email": "user@example.com"
}

Error: 400 Bad Request
{
  "message": "Password must contain at least one uppercase letter",
  "statusCode": 400
}

Error: 409 Conflict
{
  "message": "Email already in use",
  "statusCode": 409
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user123",
    "email": "user@example.com"
  }
}
```

## 7. Troubleshooting

### Registration Form Not Loading
```bash
# Check frontend is running
curl http://localhost:5173

# Check console for errors
# Open: http://localhost:5173
# Press F12 → Go to Console tab
```

### Can't Submit Form
- Ensure all password requirements are met (✓ all checks green)
- Check email is valid format
- Confirm passwords match
- Browser console might show JavaScript errors

### API Connection Error
```bash
# Check backend is running
curl http://localhost:8080/api/v1/auth/me

# Should return 401 (expected without token)
# If connection refused, backend is not running
```

### Database Connection Error
```bash
# Check MongoDB is running
# Local: mongod --version
# Atlas: Check connection string in .env

# Common issues:
# - MongoDB not started
# - Wrong connection string
# - Network connection blocked
```

### CORS Error in Browser
- Ensure backend CORS is configured
- Check browser console for details
- May need to add domain to CORS whitelist

### Email Already Exists Error
```bash
# Clear test data
# Option 1: Use different email
# Option 2: Delete user from MongoDB:

mongo senior-app
db.users.deleteOne({email: "test@example.com"})
```

## 8. Testing Checklist

### Happy Path
- [ ] Open http://localhost:5173/register
- [ ] See registration form
- [ ] Fill email: `test@example.com`
- [ ] Fill password: `TestPass123`
- [ ] Confirm password matches
- [ ] Click "Create Account"
- [ ] See success message
- [ ] Auto-redirect to login
- [ ] Login with created credentials

### Validation
- [ ] Invalid email shows error
- [ ] Weak password shows requirements
- [ ] Mismatched passwords show error
- [ ] Form disables during submission
- [ ] Loading spinner displays

### Mobile
- [ ] Form displays properly on mobile
- [ ] Buttons are touch-friendly
- [ ] Text is readable
- [ ] No horizontal scroll

### API Integration
- [ ] 201 Created response works
- [ ] Success message displays
- [ ] 400 errors display properly
- [ ] 409 duplicate email error shows
- [ ] 500 errors handled gracefully

## 9. Development Tips

### Hot Reload
Both frontend and backend support hot reload:
```bash
# Frontend automatically reloads on save
# Backend: npm run start:dev enables hot reload

# No need to restart servers during development
```

### Debugging
```bash
# Frontend console (F12)
# Check Network tab to see API requests
# Check Application > LocalStorage for tokens

# Backend logs
# Watch console output for errors
# Add console.log() for debugging
```

### Reset State
```bash
# Clear all registered users
mongo senior-app
db.users.deleteMany({})

# Clear browser data
# F12 → Application → Clear All
```

## 10. Next Steps

After testing registration:

1. **Add More Features**
   - Email verification
   - Password reset
   - User profile

2. **Deploy to Production**
   - Build frontend: `npm run build`
   - Set production environment variables
   - Use HTTPS

3. **Performance Optimization**
   - Add caching headers
   - Optimize bundle size
   - Use CDN

4. **Security Hardening**
   - Add rate limiting
   - CAPTCHA protection
   - Account lockout

## 11. Documentation

For detailed information:
- [Full Implementation Guide](REGISTRATION_IMPLEMENTATION.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [OpenAPI Specification](docs/api/api-specs/process2.yaml)

## Support

For help:
1. Check error messages in browser console (F12)
2. Review backend server logs
3. See [REGISTRATION_IMPLEMENTATION.md](REGISTRATION_IMPLEMENTATION.md)
4. Check [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines

---

**Status**: ✅ Ready to Test  
**Last Updated**: April 9, 2026  
**Expected Time**: 10-15 minutes to complete this guide
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
