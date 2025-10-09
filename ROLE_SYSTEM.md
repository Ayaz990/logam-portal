# User Role System

## Overview

The system supports two user roles:
- **Admin**: Can view ALL recordings from all users
- **Regular**: Can only view their own recordings

## Default Behavior

- All new signups get the **regular** role by default
- Existing users without a role are treated as **regular**

## How to Make a User Admin

### Method 1: Using the Script (Recommended)

```bash
node scripts/make-admin.js user@example.com
```

### Method 2: Directly in Firebase Console

1. Go to Firebase Console → Firestore Database
2. Open the `users` collection
3. Find the user by email
4. Add/Edit field: `role` = `admin`

## Admin Features

When logged in as admin, you'll see:

1. **"ADMIN" badge** in the dashboard header
2. **All recordings** from all users (not just your own)
3. **User ID labels** on recording cards showing which user created each recording

## Regular User Features

Regular users see:
- Only their own recordings
- No admin badge
- No user ID labels

## Testing

1. **Create a regular account:**
   ```
   Email: regular@test.com
   Password: test123
   ```

2. **Create an admin account:**
   ```
   Email: admin@test.com
   Password: test123
   ```
   Then run: `node scripts/make-admin.js admin@test.com`

3. **Test:**
   - Record meetings with both accounts
   - Login as regular → see only your recordings
   - Login as admin → see ALL recordings

## Technical Details

### User Schema
```javascript
{
  email: "user@example.com",
  password: "hashed_password",
  name: "user",
  role: "admin" | "regular",  // New field
  createdAt: Timestamp
}
```

### Session Object
```javascript
session.user = {
  id: "user_id",
  email: "user@example.com",
  name: "user",
  role: "admin" | "regular"
}
```

### Dashboard Query Logic
```javascript
// Admin: fetch ALL recordings
const q = query(collection(db, 'meetings'))

// Regular: fetch only user's recordings
const q = query(
  collection(db, 'meetings'),
  where('userId', '==', session.user.id)
)
```

## Extension Behavior

The extension works the same for both roles:
- Records meetings
- Uploads to Firebase Storage
- Saves with `userId` field

The **only difference** is what users see in the dashboard.
