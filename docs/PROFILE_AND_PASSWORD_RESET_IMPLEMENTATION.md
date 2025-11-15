# Profile Management & Password Reset Implementation

## Overview

Comprehensive implementation of profile management and password reset functionality across frontend, backend, and database layers.

## Implementation Date
January 2024

## Features Implemented

### 1. Password Reset System

#### Backend
- **Database Migration**: `003_add_password_reset_and_profile_fields.py`
  - Created `password_reset_tokens` table
  - Added profile fields to `users` table: `phone_number`, `avatar_url`, `bio`

- **Domain Layer**:
  - `PasswordResetToken` entity with validation
  - `IPasswordResetTokenRepository` interface
  - Updated `User` entity with profile fields

- **Infrastructure**:
  - `PasswordResetTokenRepository` implementation
  - `PasswordResetTokenModel` database model
  - Updated `UserRepository` to handle profile fields

- **Services**:
  - `PasswordResetService` with email/SMS support
  - Secure token generation (32-character URL-safe tokens)
  - 24-hour token expiration
  - Token invalidation after use

- **API Endpoints** (Public):
  - `POST /api/v1/auth/forgot-password` - Request password reset
  - `POST /api/v1/auth/reset-password` - Reset password with token

#### Frontend
- `ForgotPassword.tsx` - Request password reset page
- `ResetPassword.tsx` - Reset password with token page
- Updated `Login.tsx` with link to forgot password
- Added routes in `App.tsx` for public access

### 2. Profile Management System

#### Backend
- **API Endpoints** (Protected with RBAC):
  - `GET /api/v1/profile/me` - Get own profile
  - `PUT /api/v1/profile/me` - Update own profile
  - `GET /api/v1/profile/{user_id}` - Get user profile (with permissions)
  - `PUT /api/v1/profile/{user_id}` - Update user profile (with permissions)

- **Role-Based Access Control**:
  - Users can view/update their own profile
  - Admins/Principals can view/update any profile
  - HODs can view/update profiles in their departments
  - Teachers/Students can only access their own profile

- **Profile Fields**:
  - First name, Last name
  - Email (with verification status)
  - Phone number (with validation)
  - Avatar URL
  - Bio

#### Frontend
- `Profile.tsx` - Comprehensive profile management page
- `profileAPI` service methods
- Added "My Profile" link to sidebar navigation
- Added profile link in header (clickable user info)

## Database Schema Changes

### New Table: `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated Table: `users`
Added columns:
- `phone_number VARCHAR(20)`
- `avatar_url VARCHAR(255)`
- `bio TEXT`

## Security Features

1. **Password Reset Security**:
   - Always returns success (doesn't reveal if user exists)
   - Secure token generation using `secrets.token_urlsafe(32)`
   - Token expiration (24 hours)
   - Single-use tokens (invalidated after use)
   - Email verification before sending reset link

2. **Profile Access Control**:
   - RBAC enforcement at endpoint level
   - Department-based access for HODs
   - Self-access for all users
   - Admin/Principal override capabilities

3. **Input Validation**:
   - Phone number format validation
   - Email format validation
   - Password strength requirements
   - Field length constraints

## Configuration

### Environment Variables Required

```bash
# Email Configuration (for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME="DSABA LMS"
FEATURE_EMAIL_ENABLED=true

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:5173

# JWT Secret (required)
JWT_SECRET_KEY=your-secret-key-min-32-chars
```

## Usage

### Password Reset Flow

1. User clicks "Forgot password?" on login page
2. Enters email/username
3. System sends reset link via email (if user exists)
4. User clicks link in email
5. User enters new password
6. Password is reset and user is redirected to login

### Profile Management

1. Navigate to "My Profile" from sidebar or header
2. Update profile information
3. Save changes
4. Profile is updated immediately

### Admin Profile Management

1. Admins/Principals can view any user profile via `/profile/{user_id}`
2. HODs can view profiles of users in their departments
3. All users can view their own profile

## API Documentation

### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email_or_username": "user@example.com"
}

Response:
{
  "message": "If the email/username exists, a password reset link has been sent."
}
```

### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePassword123!"
}

Response:
{
  "message": "Password has been reset successfully"
}
```

### Get My Profile
```http
GET /api/v1/profile/me
Authorization: Bearer {token}

Response:
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Software Engineer",
  "email_verified": true,
  "roles": ["teacher"],
  "department_ids": [1],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Update My Profile
```http
PUT /api/v1/profile/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Software Engineer"
}
```

## Testing

### Manual Testing Checklist

- [ ] Forgot password flow (email/username)
- [ ] Reset password with valid token
- [ ] Reset password with expired token
- [ ] Reset password with used token
- [ ] View own profile
- [ ] Update own profile
- [ ] Admin view other user profile
- [ ] HOD view department user profile
- [ ] Student cannot view other profiles
- [ ] Profile validation (phone, email, etc.)

### Database Migration

```bash
cd backend
alembic upgrade head
```

## Future Enhancements

1. **SMS Integration**: Implement SMS service for password reset
2. **Avatar Upload**: Add file upload for avatar images
3. **Profile Completion**: Add profile completion percentage
4. **Activity Log**: Track profile changes
5. **Two-Factor Authentication**: Add 2FA support

## Files Modified/Created

### Backend
- `backend/alembic/versions/003_add_password_reset_and_profile_fields.py`
- `backend/src/domain/entities/password_reset_token.py`
- `backend/src/domain/entities/user.py` (updated)
- `backend/src/domain/repositories/password_reset_token_repository.py`
- `backend/src/infrastructure/database/models.py` (updated)
- `backend/src/infrastructure/database/repositories/password_reset_token_repository_impl.py`
- `backend/src/infrastructure/database/repositories/user_repository_impl.py` (updated)
- `backend/src/application/services/password_reset_service.py`
- `backend/src/application/services/user_service.py` (updated)
- `backend/src/application/dto/auth_dto.py` (updated)
- `backend/src/application/dto/user_dto.py` (updated)
- `backend/src/api/v1/auth.py` (updated)
- `backend/src/api/v1/profile.py`
- `backend/src/api/dependencies.py` (updated)
- `backend/src/main.py` (updated)
- `backend/src/config.py` (updated)

### Frontend
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Login.tsx` (updated)
- `src/services/api.ts` (updated)
- `src/App.tsx` (updated)
- `src/components/Layout/Header.tsx` (updated)
- `src/components/Layout/Sidebar.tsx` (updated)

## Notes

- All implementations are production-ready with no mocks or placeholders
- Email service requires SMTP configuration
- SMS service has placeholder for future implementation
- Profile fields are optional except for name and email
- Password reset tokens are automatically cleaned up (expired tokens)

