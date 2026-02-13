# 💰 SplitSmart

**Smart expense splitting made epic** - A modern, real-time expense sharing application with authentication, offline support, and beautiful animations.

![React](https://img.shields.io/badge/React-18+-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-brightgreen?logo=supabase)
![Vite](https://img.shields.io/badge/Vite-5.0+-purple?logo=vite)

---

## ✨ Features

### 🔐 Authentication
- **Email & Password Authentication** - Secure sign up and sign in with validation
- **Google OAuth** - One-click sign in with Google
- **Session Management** - Persistent sessions with automatic token refresh
- **Protected Routes** - Authentication required for all app pages

### 💸 Expense Management
- **Create & Track Expenses** - Add expenses for groups with real-time updates
- **Smart Settlements** - Automatic calculation of who owes whom
- **Recurring Expenses** - Set up recurring bills and subscriptions
- **Multiple Groups** - Create and manage separate expense groups
- **Split Options** - Split expenses equally, by percentage, or custom amounts

### 🔄 Real-time Updates
- **Live Expense Feed** - See updates from group members instantly
- **Activity Logs** - Track all expense activities and changes
- **Real-time Balances** - Current balance calculations updated in real-time

### 📱 Offline Support
- **IndexedDB Storage** - Work offline with automatic sync when online
- **Offline Queue** - Expenses created offline sync when connection returns
- **Offline Indicator** - Know when you're offline with clear UI feedback

### 🎨 Modern UI/UX
- **Animated Login** - Epic superhero-themed animations (Iron Man, Thor)
- **Glass Morphism** - Modern frosted glass design effects
- **Dark & Light Themes** - Toggle between themes
- **Responsive Design** - Works seamlessly on mobile, tablet, and desktop
- **Smooth Animations** - Framer Motion powered transitions

### 📊 Advanced Features
- **Payment Tracking** - Record payments and settlements
- **Debt Simplification** - Minimize settlement transactions
- **User Profiles** - Manage profile information and preferences
- **Currency Support** - Multiple currency handling

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Advanced animations
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching

### Backend & Database
- **Supabase** - Backend as a Service (PostgreSQL)
- **Supabase Auth** - Authentication
- **PostgreSQL** - Database
- **Real-time** - Supabase subscriptions

### UI Components
- **Radix UI** - Accessible component primitives
- **Shadcn/ui** - High-quality React components
- **Lucide React** - Beautiful icons

### Developer Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Zod** - Schema validation
- **Date-fns** - Date utilities

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or bun

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd splitsmart
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Configure Supabase**
Create a `.env.local` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_anon_key
```

Then run the SQL setup from [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)

4. **Start the development server**
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📖 Usage

### Sign Up / Sign In
1. Navigate to `/auth`
2. Create an account with email & password or sign in with Google
3. User profile is automatically created

### Create a Group
1. Go to **Groups** page
2. Click **Create New Group**
3. Add group name and select members

### Add Expenses
1. Open a group
2. Click **Add Expense**
3. Enter amount, description, and who paid
4. Select how to split
5. Expense syncs in real-time

---

## 🏗️ Project Structure

```
src/
├── components/          # Reusable React components
├── pages/              # Page components
├── contexts/           # React contexts (Auth, Theme, Offline)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── integrations/       # External integrations (Supabase)
└── main.tsx           # App entry point
```

---

## 🔐 Authentication Setup

See [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) for detailed instructions on:
- Email & Password authentication
- Google OAuth setup
- Database configuration
- Row Level Security (RLS)

---

## 🎨 Login Animations

The login page features epic superhero animations:
- **Iron Man** - Flying with glowing chest reactor and energy blasts
- **Thor** - Waving with spinning Mjolnir hammer
- **Lightning Effects** - Dynamic blue lightning bolts
- **Smooth Transitions** - Beautiful form animations
- **Glass Morphism** - Modern frosted glass design

---

## 🚀 Deployment

### Build
```bash
npm run build
```

### Deploy to
- **Vercel** (recommended for Vite)
- **Netlify**
- **GitHub Pages**
- **Docker**

Set environment variables on your deployment platform:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## 🐛 Troubleshooting

**Sign In Issues**
- Clear localStorage and cookies
- Verify Supabase credentials

**Offline Sync Not Working**
- Check browser IndexedDB support
- Refresh page when online

**Animations Not Showing**
- Check browser compatibility
- Disable extensions that block animations

---

## 📚 Documentation

- [Authentication Setup](AUTHENTICATION_SETUP.md)
- [Contributing](CONTRIBUTING.md)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

---

## 👨‍💻 Author

Built with ❤️ for smarter expense splitting

<div align="center">

[⬆ back to top](#-splitsmart)

</div>
