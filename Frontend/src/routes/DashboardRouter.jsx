
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import TreasurerDashboard from "../pages/dashboard/TreasurerDashboard";
import SecretaryDashboard from "../pages/dashboard/SecretaryDashboard";
import MemberDashboard from "../pages/dashboard/MemberDashboard";

export default function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Read the role returned by the backend.
  const rawRole =
    user.role ||
    user.role_name ||
    user.user?.role ||
    user.membership?.role ||
    "";

  // Convert roles such as "Super Admin" into "super_admin".
  const role = String(rawRole)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  // Temporary debugging: check the browser console.
  console.log("Logged-in user:", user);
  console.log("User role:", rawRole);
  console.log("Normalized role:", role);

  switch (role) {
    case "super_admin":
    case "superadmin":
      return <SuperAdminDashboard />;

    case "admin":
    case "chairperson":
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
            Dashboard role not recognized
          </h2>

          <p className="mt-2 text-gray-600">
            Your account role is: {String(rawRole || "Not provided")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Check the browser console to see the user information
            returned by your backend.
          </p>
        </div>
      );
  }
}



