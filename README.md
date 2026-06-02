# 🛠️ RapidFix

RapidFix is a premium, real-time emergency and daily local repair matching application. It instantly connects customers in need with background-verified electricians, plumbers, mechanics, carpenters, and technicians nearby.

---

## ⚠️ Team Setup: Why Login is Failing (And How to Fix It)

Because environment variables (`.env`) contain secure keys, they are excluded from Git tracking (`.gitignore`). When other team members pull the repository, they lack a `.env` file, which causes:
1. The frontend to initialize Firebase Auth with **dummy fallback credentials** (failing Google & Email/Password sign-ins).
2. The backend to run without active database and Cloudinary keys, blocking API requests and image uploads.

### 🚀 The 1-Step Fix
We have created pre-configured `.env.example` templates in both the **frontend** and **backend** root directories containing the shared hackathon keys.

To get login and registration working on your local machine instantly, run the following commands from the project root:

```bash
# 1. Setup Backend Environment Variables
cp backend/.env.example backend/.env

# 2. Setup Frontend Environment Variables
cp frontend/.env.example frontend/.env
```

*(Note: On Windows PowerShell, use `copy` instead of `cp`)*
```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Once copied, restart your local development servers, and authentication/image uploads will work perfectly!

---

## 📦 Project Structure

```
Rapid-Fix/
├── backend/             # Express Node.js Backend Server
│   ├── .env.example     # Backend Environment Template (Pre-configured)
│   ├── app.js           # Server Initialization (HTTP & WebSockets)
│   ├── controllers/     # Authentication & Problem Dispatch Logic
│   └── middleware/      # Firebase Admin & JWT Verification
└── frontend/            # Vite + React + TypeScript Frontend
    ├── .env.example     # Frontend Environment Template (Pre-configured)
    ├── src/
    │   ├── components/  # Floating Frosted Glass Navbar, Hero, About, Problem Modals
    │   └── context/     # AuthContext & ThemeContext
```

---

## 🚦 Local Development Setup

### 1. Database (MongoDB)
Ensure you have a local MongoDB instance running on your machine:
- Default Connection: `mongodb://localhost:27017/rapid_fix_db`
- (This is automatically configured in `backend/.env.example` and has an internal fallback).

### 2. Start the Backend Server
```bash
cd backend
npm install
npm start
```
The server will boot on `http://localhost:3000` and establish a WebSocket connection.

### 3. Start the Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## ✨ Features Implemented

1. **Frosted Glassmorphic Design**: Clean responsive solid cards in Light Mode, and premium glowing refraction containers with ambient backdrop blurs in Dark Mode.
2. **Dynamic Viewport Scroll-Spy**: The navigation header automatically tracks active sections (Home, About, How it Works) smoothly using `getBoundingClientRect` layout-independent positioning.
3. **Cross-Page Smooth Scrolling**: Anchor hash-listener triggers buttery smooth transitions when navigating to specific landing sections from other routes.
4. **Universal Category Routing**: Customer requests submitted under the "Other" category bypass specific trade filters and alert all nearby verified specialists, while still enforcing geographic location ranges.
