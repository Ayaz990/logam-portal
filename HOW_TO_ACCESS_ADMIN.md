# How to Access Admin Dashboard

## Quick Answer

**Admin Dashboard URL:** `https://logam-portal-production.up.railway.app/admin`

## Requirements

To access the admin dashboard, you need:
1. A registered user account
2. That account must have `admin` role

## Step-by-Step Instructions

### Step 1: Sign Up for an Account

1. Go to: https://logam-portal-production.up.railway.app
2. Click **"Sign Up"** or go to: https://logam-portal-production.up.railway.app/auth/signin
3. Enter your email and password
4. Create your account

### Step 2: Set Admin Secret in Railway

1. Go to https://railway.app/dashboard
2. Click on your **logam-portal-production** project
3. Click **"Variables"** tab
4. Add this variable:
   ```
   ADMIN_SECRET=YourSuperSecretKey123!
   ```
   (Choose a strong random password)
5. Click **"Add"** or **"Save"**
6. Railway will automatically redeploy (~2 minutes)

### Step 3: Make Your Account Admin

Use this `curl` command (replace with your details):

```bash
curl -X POST https://logam-portal-production.up.railway.app/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "adminSecret": "YourSuperSecretKey123!"
  }'
```

**Or use browser console:**

1. Open https://logam-portal-production.up.railway.app
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Paste and run:

```javascript
fetch('/api/admin/make-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    adminSecret: 'YourSuperSecretKey123!'
  })
})
.then(r => r.json())
.then(data => console.log(data))
```

You should see:
```json
{
  "success": true,
  "message": "User your-email@example.com is now an admin",
  "userId": "..."
}
```

### Step 4: Sign Out and Sign Back In

**IMPORTANT:** You must sign out and sign back in for the admin role to take effect!

1. Click your profile/email in the dashboard
2. Click **"Sign Out"**
3. Sign in again with the same email/password

### Step 5: Access Admin Dashboard

Go to: https://logam-portal-production.up.railway.app/admin

You should now see the admin dashboard! 🎉

---

## What You'll See in Admin Dashboard

### Statistics Cards:
- **Total Users** - Number of registered users
- **Total Recordings** - Sum of all recordings
- **Average per User** - Recordings per user average

### User Table:
For each user you can see:
- Avatar and name
- Email address
- Role (admin or regular)
- **Number of recordings**
- Created date
- **User ID** (for Firebase queries)

### Features:
- **Search** - Filter users by email, name, or ID
- **Real-time updates** - Auto-refreshes
- **Navigate** - Go to user dashboard or sign out

---

## Making More Users Admin

### Option 1: Via Make-Admin API

Use the same curl command with different email:

```bash
curl -X POST https://logam-portal-production.up.railway.app/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "another-user@example.com",
    "adminSecret": "YourSuperSecretKey123!"
  }'
```

### Option 2: Via Firebase Console

1. Go to https://console.firebase.google.com
2. Select your project
3. Go to **Firestore Database**
4. Navigate to **`users`** collection
5. Find the user document (by email)
6. Click to edit
7. Change `role` field from `"regular"` to `"admin"`
8. User must sign out and back in

---

## Troubleshooting

### "Not authenticated" Error

**Problem:** Can't access admin page

**Solution:**
- Make sure you're signed in
- Try signing out and back in
- Clear browser cookies

### "Forbidden: Admin access required"

**Problem:** You're logged in but not admin

**Solution:**
- Make sure you ran the make-admin API call successfully
- **Sign out and sign back in** (required!)
- Check Firestore: your user document should have `role: "admin"`
- Check you used the correct email

### "Invalid admin secret"

**Problem:** Make-admin API returns error

**Solution:**
- Check `ADMIN_SECRET` is set in Railway Variables
- Make sure you're using the exact same secret in the API call
- Check for typos (case-sensitive!)

### Can't Find Make-Admin API

**Problem:** 404 error when calling API

**Solution:**
- Check Railway deployment is complete
- Try: https://logam-portal-production.up.railway.app/api/admin/make-admin
- Check you're using POST method (not GET)

### Admin Dashboard Shows 403/404

**Problem:** Page not found or forbidden

**Solution:**
- URL should be: `/admin` (not `/admin/`)
- Make sure Railway deployed successfully
- Check you're signed in as admin
- Clear cache and try again

---

## Security Best Practices

### After Creating First Admin:

1. **Change Admin Secret:**
   - Go to Railway Variables
   - Change `ADMIN_SECRET` to something else
   - Or remove it entirely

2. **Optional - Disable Make-Admin Endpoint:**

   Delete or rename the file:
   ```
   pages/api/admin/make-admin.js
   ```

   Then redeploy. Only do this after you have at least one admin user!

3. **Keep Admin Secret Private:**
   - Never commit to Git
   - Don't share with anyone
   - Store securely

---

## Quick Reference

| Item | URL/Value |
|------|-----------|
| **Main App** | https://logam-portal-production.up.railway.app |
| **Admin Dashboard** | https://logam-portal-production.up.railway.app/admin |
| **Make-Admin API** | POST /api/admin/make-admin |
| **Railway Dashboard** | https://railway.app/dashboard |
| **Firebase Console** | https://console.firebase.google.com |

---

## Example: Complete Setup

```bash
# 1. Set admin secret in Railway
# (Do this in Railway dashboard Variables)
ADMIN_SECRET=MySecretKey2024!

# 2. Make yourself admin
curl -X POST https://logam-portal-production.up.railway.app/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "adminSecret": "MySecretKey2024!"
  }'

# 3. Sign out and sign back in
# 4. Visit: https://logam-portal-production.up.railway.app/admin
```

---

## What Admins Can Do

✅ View all users and their recordings
✅ See user emails and IDs
✅ Track usage statistics
✅ Monitor platform activity
✅ Access regular dashboard features
✅ See all bot requests from all users

❌ Cannot see user passwords (they're hashed)
❌ Cannot delete users (manually via Firestore only)
❌ Cannot modify recordings (view only)

---

## Need Help?

1. **Check Railway logs** - See deployment errors
2. **Check Firestore** - Verify user role is set to "admin"
3. **Sign out and back in** - Required after role change!
4. **Clear browser cache** - Sometimes helps
5. **Use incognito mode** - Test with fresh session

---

**Remember:** You must be signed in as a user with `role: "admin"` to access the admin dashboard!
