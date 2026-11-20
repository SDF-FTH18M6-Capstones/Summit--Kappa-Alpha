import { Routes, Route } from "react-router-dom";

import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/DashboardLayout";
import DashboardSection from "./pages/dashboard/DashboardSection";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Officials from "./pages/public/Officials";
import Join from "./pages/public/Join";
import Projects from "./pages/public/Projects";
import ChamaDetails from "./components/ChamaDetails";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import SignupChoice from "./pages/auth/SignupChoice";
import JoinChama from "./pages/auth/JoinChama";
import RegisterChama from "./pages/auth/RegisterChama";
import VerifyEmail from "./pages/auth/VerifyEmail";

import DashboardRouter from "./routes/DashboardRouter";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public website pages */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/officials" element={<Officials />} />
          <Route path="/chamas" element={<Join />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/chamas/:chamaId" element={<ChamaDetails />} />

          {/* Authentication pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup-choice" element={<SignupChoice />} />
          <Route path="/join-chama" element={<JoinChama />} />
          <Route path="/register-chama" element={<RegisterChama />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Protected dashboard pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/dashboard/:section" element={<DashboardSection />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;



