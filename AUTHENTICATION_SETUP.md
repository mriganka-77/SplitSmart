# Supabase Authentication Setup Guide

## Overview
Your SplitSmart app is now configured with Supabase authentication. This guide walks you through the final setup steps to get everything working.

## Current Setup Status
✅ Supabase client initialized  
✅ AuthContext created with real Supabase integration  
✅ Authentication pages set up (Sign In, Sign Up, OAuth callback)  
✅ Protected routes configured with RequireAuth wrapper  
✅ Environment variables configured  

## Environment Variables
Your `.env.local` file already has:
```env
VITE_SUPABASE_URL=https://aajwygiahfxwnmkgadim.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## What's Implemented

### 1. Email & Password Authentication
- Users can sign up with email and password
- Users can sign in with existing credentials
- Password validation (minimum 6 characters)
- User profiles are automatically created in the `profiles` table

### 2. Google OAuth (Optional)
- Google sign-in button on the auth page
- Requires additional Google OAuth configuration in Supabase

### 3. Protected Routes
All app routes except `/auth` require authentication:
- Users not logged in are redirected to `/auth`
- Redirect parameter preserves intended destination
- Loading state shown while checking authentication

### 4. Session Management
- Persistent sessions using localStorage
- Automatic token refresh
- Real-time authentication state updates

## Next Steps

### Step 1: Set Up Supabase Database Tables
Ensure your `profiles` table exists with this schema:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Step 2: Enable Google OAuth (Optional)
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Add your Google OAuth 2.0 credentials:
   - Client ID
   - Client Secret
5. Add redirect URI: `https://your-domain.com/auth/callback`

### Step 3: Configure Auth Policies (RLS)
Set up Row Level Security (RLS) for the profiles table:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Step 4: Test Authentication
1. Start your development server: `bun run dev`
2. Navigate to `http://localhost:5173/auth`
3. Test sign up with a new email
4. Test sign in with the created account
5. Verify you're redirected to dashboard after successful login
6. Test logout from profile page

## API Reference

### `useAuth()` Hook
Available in any component within the AuthProvider:

```typescript
const { 
  user,              // Current User object or null
  session,           // Current Session or null
  loading,           // Boolean - true while checking auth
  signUp,            // (email, password, fullName) => Promise
  signIn,            // (email, password) => Promise
  signInWithGoogle,  // () => Promise
  signOut            // () => Promise
} = useAuth();
```

### Usage Example
```typescript
import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user, signOut } = useAuth();
  
  return (
    <div>
      <p>Logged in as: {user?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Troubleshooting

### "Email already registered" Error
- Clear browser localStorage and try a different email
- Or reset password using Supabase dashboard

### Google Sign-in Not Working
- Verify Google OAuth provider is enabled in Supabase
- Check redirect URI matches your app domain
- Ensure VITE_SUPABASE_PUBLISHABLE_KEY is correct

### Infinite Redirect Loop
- Clear cookies and localStorage
- Check RequireAuth component is wrapping routes correctly
- Verify auth state is being set properly

### User Not Persisting After Refresh
- Check browser console for errors
- Verify localStorage is enabled
- Ensure Supabase client persistence settings are correct

## Files Modified

- `src/contexts/AuthContext.tsx` - Real Supabase authentication
- `src/components/auth/RequireAuth.tsx` - Route protection
- `src/pages/Auth.tsx` - Google sign-in button added
- `src/pages/AuthCallback.tsx` - OAuth callback handler
- `src/App.tsx` - Routes updated with auth protection

## Security Notes

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Publishable key is safe to expose** - It's the anonymous key meant for client-side use
3. **Keep private key secret** - Never expose SUPABASE_SERVICE_ROLE_KEY
4. **Enable RLS** - Always use Row Level Security policies for data
5. **Validate on backend** - Always validate user data on your Supabase functions

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
- [React Router Authentication](https://reactrouter.com/en/main/start/overview)
