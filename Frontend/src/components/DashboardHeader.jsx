
import { Bell, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardHeader() {
  const { user, logout } = useAuth();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email ||
    "User";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">

      <div>
        <h1 className="text-xl font-bold text-green-950">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Welcome back, {displayName}
        </p>
      </div>

      <div className="flex items-center gap-5">

        <button
          type="button"
          className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell size={21} />
        </button>

        <div className="flex items-center gap-2">
          <UserCircle size={30} className="text-green-900" />

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">
              {displayName}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role || user?.role_name || "Account"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>

      </div>
    </header>
  );
}

