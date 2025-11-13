# Admin Dashboard Setup Guide

## Overview

The admin dashboard allows you to:
- View all registered users
- See recording counts per user
- Monitor user activity
- View user IDs and emails
- Track total platform statistics

## Accessing the Admin Dashboard

**URL:** `https://your-app.railway.app/admin` or `http://localhost:3001/admin`

Only users with the `admin` role can access this dashboard.

## Creating Your First Admin User

### Step 1: Sign Up a Regular Account

1. Go to your app and sign up with your email
2. Create a password
3. Log in to confirm account works

### Step 2: Set Admin Secret (Railway)

1. Go to Railway dashboard
2. Click on your project
3. Go to **Variables** tab
4. Add this variable:
   ```
   ADMIN_SECRET=your-super-secret-key-here
   ```
   Replace `your-super-secret-key-here` with a strong random password
5. Save and redeploy

### Step 3: Make User Admin (Using API)

Use this `curl` command to promote your user to admin:

```bash
curl -X POST https://your-app.railway.app/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "adminSecret": "your-super-secret-key-here"
  }'
```

**Or use Postman/Insomnia:**
- Method: POST
- URL: `https://your-app.railway.app/api/admin/make-admin`
- Body (JSON):
  ```json
  {
    "email": "your-email@example.com",
    "adminSecret": "your-super-secret-key-here"
  }
  ```

**Or use browser console on your site:**
```javascript
fetch('/api/admin/make-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    adminSecret: 'your-super-secret-key-here'
  })
})
.then(r => r.json())
.then(console.log)
```

### Step 4: Log Out and Log Back In

1. Sign out from your current session
2. Sign in again with the same email/password
3. Your session will now have admin role

### Step 5: Access Admin Dashboard

Visit: `https://your-app.railway.app/admin`

You should see the admin dashboard with all users!

## Admin Dashboard Features

### Statistics Cards
- **Total Users**: Number of registered users
- **Total Recordings**: Sum of all recordings across all users
- **Average per User**: Average recordings per user

### User Table
Shows for each user:
- **User Avatar & Name**: First letter of name/email as avatar
- **Email**: User's email address
- **Role**: `admin` or `regular`
- **Recordings Count**: Number of recordings this user has
- **Created Date**: When user signed up
- **User ID**: Firebase document ID (useful for manual queries)

### Search
Filter users by:
- Email
- Name
- User ID

### Navigation
- **User Dashboard**: Go to regular dashboard
- **Sign Out**: Log out of admin account

## Security Notes

### Important Security Considerations:

1. **Passwords Are Hashed**:
   - User passwords are SHA-256 hashed
   - Cannot be viewed by anyone (including admins)
   - This is for security

2. **Admin Secret Key**:
   - Keep `ADMIN_SECRET` environment variable secret
   - Never commit it to Git
   - Use a strong, random value
   - Change it after creating your first admin

3. **Disable Make-Admin Endpoint (Production)**:
   After creating your first admin, you can disable the make-admin endpoint:

   Delete or comment out: `/pages/api/admin/make-admin.js`

   Or add additional security checks to it.

4. **Admin Role Check**:
   - All admin API routes check for `session.user.role === 'admin'`
   - Regular users cannot access admin endpoints
   - Unauthorized access returns 403 Forbidden

## Making More Admins

Once you're an admin, you can make other users admins:

### Option 1: Via Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Find `users` collection
4. Find the user document
5. Edit the `role` field to `"admin"`

### Option 2: Via Make-Admin API
Use the same `curl` command with different email:
```bash
curl -X POST https://your-app.railway.app/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "another-user@example.com",
    "adminSecret": "your-super-secret-key-here"
  }'
```

## Troubleshooting

### "Not authenticated" Error
- Make sure you're logged in
- Try signing out and signing back in
- Check that your session is active

### "Forbidden: Admin access required"
- Your user role is not set to `admin`
- Follow Step 3 again to promote your user
- Sign out and sign back in after promotion

### "User not found" When Making Admin
- Make sure the email is correct
- User must sign up first before being promoted to admin
- Check spelling and case sensitivity

### Dashboard Shows No Users
- Check that users collection exists in Firestore
- Verify Firebase connection is working
- Check browser console for errors
- Look at Railway logs for API errors

### Can't Access /admin Page
- Make sure you're logged in as admin
- Clear browser cache and cookies
- Check that you signed out and back in after promotion
- Verify `role: 'admin'` in your session (check browser DevTools → Application → Cookies)

## Development vs Production

### Development (localhost:3001)
```bash
# Terminal 1: Run dev server
npm run dev:all

# Terminal 2: Make user admin
curl -X POST http://localhost:3001/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "adminSecret": "your-secret-key"
  }'
```

### Production (Railway)
Use your Railway URL: `https://logam-portal-production.up.railway.app`

## Environment Variables Required

Add these to Railway Variables:

```bash
# Admin Setup
ADMIN_SECRET=your-super-secret-random-key

# Firebase (already set)
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
# ... other Firebase vars

# NextAuth (already set)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.railway.app
```

## Quick Reference

**Admin Dashboard URL**: `/admin`

**Make Admin API**: `POST /api/admin/make-admin`

**Get Users API**: `GET /api/admin/users` (admin only)

**Admin User Structure**:
```javascript
{
  id: "firebase-doc-id",
  email: "user@example.com",
  name: "User Name",
  role: "admin",  // or "regular"
  createdAt: Date,
  recordingCount: 5
}
```

---

**Security Reminder**: After creating your first admin, consider removing or protecting the `make-admin` endpoint in production! 🔒
