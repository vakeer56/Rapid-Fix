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
  );
}

export default App
