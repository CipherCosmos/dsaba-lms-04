# Quick Start Guide - Profile Management & Password Reset

## 🚀 Quick Setup (5 Minutes)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Setup environment**:
   ```bash
   ./scripts/setup_env.sh
   ```
   This creates a `.env` file with required environment variables.

3. **Run migrations**:
   ```bash
   ./scripts/run_migration.sh
   ```
   This applies database migrations including password reset tokens and profile fields.

4. **Start backend server**:
   ```bash
   python -m uvicorn src.main:app --reload
   ```

### Frontend Setup

1. **Navigate to project root**:
   ```bash
   cd ..
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start frontend server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing the Features

### 1. Test Password Reset

1. **Navigate to login page**: `http://localhost:5173/login`
2. **Click "Forgot password?"**
3. **Enter email or username**
4. **Check email for reset link** (if email is configured)
5. **Click reset link or navigate to**: `http://localhost:5173/reset-password?token=YOUR_TOKEN`
6. **Enter new password**
7. **Login with new password**

### 2. Test Profile Management

1. **Login to the system**
2. **Click on your name in the header** or **"My Profile" in the sidebar**
3. **Update profile information**:
   - First name, Last name
   - Email
   - Phone number
   - Avatar URL
   - Bio
4. **Click "Save Changes"**
5. **Verify changes are saved**

### 3. Test RBAC (Role-Based Access Control)

1. **Login as Admin**:
   - Should be able to view/update any profile
   
2. **Login as HOD**:
   - Should be able to view/update profiles in their department
   - Should not be able to view/update profiles outside their department

3. **Login as Teacher/Student**:
   - Should only be able to view/update their own profile

## 📝 Environment Variables

### Required Variables

```env
JWT_SECRET_KEY=your-secret-key-minimum-32-characters
DATABASE_URL=sqlite:///./exam_management.db
```

### Optional Variables

```env
FRONTEND_URL=http://localhost:5173
FEATURE_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 🔍 Verification

### Check Backend is Running

```bash
curl http://localhost:8000/health
```

### Check API Endpoints

```bash
# Test forgot password (public)
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email_or_username": "test@example.com"}'

# Test get profile (requires authentication)
curl -X GET http://localhost:8000/api/v1/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Frontend

1. **Open browser**: `http://localhost:5173`
2. **Navigate to login page**
3. **Click "Forgot password?"**
4. **Verify forgot password page loads**
5. **Login and navigate to profile**
6. **Verify profile page loads**

## 🐛 Troubleshooting

### Issue: Migration fails with JWT_SECRET_KEY error
**Solution**: Run `./scripts/setup_env.sh` to create `.env` file with required variables.

### Issue: Database connection error
**Solution**: Check `DATABASE_URL` in `.env` file. For SQLite, ensure directory is writable.

### Issue: Frontend can't connect to backend
**Solution**: Check `API_BASE_URL` in frontend config. Ensure backend is running on port 8000.

### Issue: Email not sending
**Solution**: 
1. Set `FEATURE_EMAIL_ENABLED=true` in `.env`
2. Configure SMTP settings
3. Check email logs

### Issue: Profile updates not reflecting
**Solution**: 
1. Check browser console for errors
2. Verify API response
3. Check Redux state is updated

## 📚 Next Steps

1. **Configure email** for password reset
2. **Test all endpoints** using the API documentation
3. **Customize email templates** if needed
4. **Add SMS support** (optional)
5. **Deploy to production**

## 🎉 Success!

If all tests pass, the implementation is complete and ready for use!

