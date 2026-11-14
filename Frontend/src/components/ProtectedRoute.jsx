
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  // Wait until authentication has been checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Checking your access...
        </p>
      </div>
    );
  }

  // Redirect users who are not logged in
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Block users with unauthorized roles
  if (allowedRoles?.length && !hasRole(allowedRoles)) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Access Denied
        </h1>

        <p className="mt-3 text-gray-600">
          You do not have permission to view this page.
        </p>

        <Link
          to="/"
          className="mt-6 inline-block font-medium text-green-700 underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  // Display the authorized page
  return children || <Outlet />;
}


