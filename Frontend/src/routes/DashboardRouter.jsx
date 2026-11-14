
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/BaseComponents";

import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import TreasurerDashboard from "../pages/dashboard/TreasurerDashboard";
import SecretaryDashboard from "../pages/dashboard/SecretaryDashboard";
import MemberDashboard from "../pages/dashboard/MemberDashboard";

export default function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="mt-3 text-sm text-gray-600">
          Loading your dashboard...
        </p>
      </div>
    </div>
  );
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rawRole =
    user.role ||
    user.role_name ||
    user.user?.role ||
    user.membership?.role ||
    "";

  const role = String(rawRole)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (role) {
    case "superadmin":
    case "super_admin":
      return <SuperAdminDashboard />;

    case "chama_admin":
    case "admin":
      return <AdminDashboard />;

    case "treasurer":
      return <TreasurerDashboard />;

    case "secretary":
      return <SecretaryDashboard />;

    case "member":
      return <MemberDashboard />;

    default:
      return (
        <div className="m-6 rounded-xl border border-red-200 bg-white p-6">
          <h2 className="text-xl font-bold text-red-700">
            Dashboard Role Not Recognized
          </h2>

          <p className="mt-2 text-gray-600">
            Your account role is: {String(rawRole || "Not provided")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Please check the role returned by your backend.
          </p>
        </div>
      );
  }
}


