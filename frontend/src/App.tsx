import { BrowserRouter, Routes, Route } from "react-router-dom"

import { Login } from "./pages/login"
import LandingPage  from "./pages/Landing";

function App() {

return (

  <BrowserRouter>

      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<LandingPage/>} />
      </Routes>
  </BrowserRouter>
  
)
}

export default App
