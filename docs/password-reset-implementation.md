# Password Reset UI Implementation - Issue #13

## Overview
This implementation provides the frontend UI components for the password reset flow, including email submission (forgot password) and password update forms. These components integrate with the backend API endpoints for secure password reset functionality.

## Components Created

### 1. ForgotPasswordForm Component
- **File**: `src/components/ForgotPasswordForm.jsx`
- **CSS Module**: `src/components/ForgotPasswordForm.module.css`
- **Features**:
  - Email input field with validation
  - Submit button to request password reset
  - Success/error message display
  - Loading state during submission
  - Link back to login page
  - Async API call with no page refresh

### 2. ResetPasswordForm Component
- **File**: `src/components/ResetPasswordForm.jsx`
- **CSS Module**: `src/components/ResetPasswordForm.module.css`
- **Features**:
  - Token input field (auto-filled from URL query parameter)
  - New password input with strength requirements display
  - Confirm password field
  - Password matching validation
  - Success/error message display
  - Loading state during submission
  - Link back to login page
  - Async API call with no page refresh

### 3. Page Components
- **ForgotPasswordPage**: `src/pages/ForgotPasswordPage.jsx`
- **ResetPasswordPage**: `src/pages/ResetPasswordPage.jsx`
- Simple wrapper pages that redirect to login on success

## Services & Utilities

### passwordResetService
- **File**: `src/utils/passwordResetService.js`
- **Methods**:
  - `requestPasswordReset(email)`: Calls POST `/auth/password-reset/request`
  - `confirmPasswordReset(token, newPassword)`: Calls POST `/auth/password-reset/confirm`
  - Error handling with meaningful messages

### validationSchemas
- **File**: `src/utils/validationSchemas.js`
- **Schemas**:
  - `emailSchema`: Validates email format
  - `passwordSchema`: Validates password strength (8+ chars, uppercase, lowercase, number)
  - `forgotPasswordSchema`: Validates forgot password form
  - `resetPasswordSchema`: Validates reset password form with confirmation matching

## Updated Configuration

### API Config
- **File**: `src/config/api.js`
- **Added endpoints**:
  - `auth.passwordResetRequest`: `/auth/password-reset/request`
  - `auth.passwordResetConfirm`: `/auth/password-reset/confirm`

## Integration Guide

### 1. Add Routes to Your Router
```jsx
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// In your router configuration:
{
  path: '/forgot-password',
  element: <ForgotPasswordPage />,
},
{
  path: '/reset-password',
  element: <ResetPasswordPage />,
},
```

### 2. Add Links in Login Page
```jsx
<a href="/forgot-password">Forgot your password?</a>
```

### 3. Backend Integration Requirements
Your backend needs to implement:

#### POST /auth/password-reset/request
- **Request**: `{ email: string }`
- **Response**: `202 Accepted` with success message
- **Functionality**: Validate email, generate reset token, send email with link

#### POST /auth/password-reset/confirm
- **Request**: `{ token: string, newPassword: string }`
- **Response**: `200 OK` with success message
- **Functionality**: Validate token, hash password, update database

## Validation Rules

### Email Validation
- Must be a valid email format
- Standard RFC 5322 email validation

### Password Validation
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Password confirmation must match

## Features Implemented

✅ Forgot Password form with email input
✅ Email validation before submission
✅ Reset Password form with token and new password fields
✅ Password strength validation
✅ Password confirmation matching
✅ Asynchronous API integration (no page refresh)
✅ Clear success messages
✅ Clear error messages with validation feedback
✅ Loading states during submission
✅ Consistent styling with gradient background
✅ Responsive design for mobile and desktop
✅ Accessible form inputs with proper labels

## User Flow

1. User clicks "Forgot Password" link on login page
2. User enters email address on forgot password form
3. User receives validation feedback
4. Form submits asynchronously to backend
5. API returns success message
6. User sees success confirmation
7. User clicks link in email with reset token
8. Reset password page loads with token pre-filled from URL
9. User enters new password and confirmation
10. Form validates password strength and matching
11. Form submits asynchronously to backend
12. API updates password in database
13. User sees success message and is redirected to login
14. User can now login with new password

## Testing

### Manual Testing Steps
1. Test email validation (invalid format should show error)
2. Test forgot password form submission
3. Test reset password form with token from URL
4. Test password validation (check strength requirements)
5. Test password confirmation matching
6. Test error messages from API
7. Test success message display
8. Test responsive design on mobile devices

### Test Email
You can test with any email format like:
- `test@example.com`
- `user+tag@domain.co.uk`

## Related Backend Issue
- **Issue**: #11-Backend - Password Reset API
- **Backend Endpoints**:
  - POST `/auth/password-reset/request`
  - POST `/auth/password-reset/confirm`

## Dependencies
- `react`: Component framework
- `react-hook-form`: Form management
- `zod`: Schema validation
- `@hookform/resolvers/zod`: Form resolver
- `react-router-dom`: Navigation

## Notes
- Forms use react-hook-form for efficient form handling
- Zod provides runtime type validation
- CSS modules prevent style conflicts
- Async/await for clean API calls
- URL token parameter is auto-populated in reset form
- Both forms provide clear user feedback
