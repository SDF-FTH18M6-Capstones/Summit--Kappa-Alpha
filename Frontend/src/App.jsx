
import { Routes, Route } from "react-router-dom";

import PublicLayout from "./components/PublicLayout";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Officials from "./pages/public/Officials";
import Join from "./pages/public/Join";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/officials" element={<Officials />} />
        <Route path="/chamas" element={<Join />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Route>
    </Routes>
  );
}

export default App;

