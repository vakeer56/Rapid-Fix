import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Login } from "./pages/login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import LandingPage from "./pages/Landing";
import SuperAdmin from "./pages/SuperAdmin";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Ambient background glows for refraction glass effect - Only active in dark mode */}
      <div className="hidden dark:block fixed top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none z-[-1] animate-pulse-glow" style={{ animationDuration: '8s' }}></div>
      <div className="hidden dark:block fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] bg-orange-500/15 rounded-full blur-[100px] pointer-events-none z-[-1] animate-pulse-glow" style={{ animationDuration: '12s' }}></div>
      <div className="hidden dark:block fixed top-[40%] left-[30%] w-[30vw] h-[30vw] max-w-[400px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none z-[-1] animate-pulse-glow" style={{ animationDuration: '10s' }}></div>

      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path='/' element={<LandingPage />} />
          <Route path='/super-admin' element={<SuperAdmin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App
