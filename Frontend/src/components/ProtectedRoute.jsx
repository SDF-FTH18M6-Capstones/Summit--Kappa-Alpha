import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Usage in the router:
// <Route element={<ProtectedRoute allowedRoles={["treasurer"]} />}>
//   <Route path="/dashboard/treasurer" element={<TreasurerDashboard />} />
// </Route>
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Not logged in: go to login and remember where they were heading.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but the wrong role: block the page.
  if (!hasRole(allowedRoles)) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
        <p className="mt-3 text-gray-600">You do not have permission to view this page.</p>
        <Link to="/" className="mt-6 inline-block font-medium text-green-700 underline">
          Go back home
        </Link>
      </div>
    );
  }

  return children || <Outlet />;
}