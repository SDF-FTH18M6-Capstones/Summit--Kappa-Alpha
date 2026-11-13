
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Settings,
  Building2,
  ClipboardList,
  HandCoins,
  CalendarDays,
  Megaphone,
  BookOpen,
  ShieldCheck,
  History,
  Receipt,
  Bell
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const navigationByRole = {
  super_admin: [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { name: "Administrators", path: "/dashboard/administrators", icon: ShieldCheck },
    { name: "Organizations", path: "/dashboard/organizations", icon: Building2 },
    { name: "Users", path: "/dashboard/users", icon: Users },
    { name: "Reports", path: "/dashboard/reports", icon: FileText },
    { name: "Audit logs", path: "/dashboard/audit-logs", icon: History },
    { name: "Settings", path: "/dashboard/settings", icon: Settings },
  ],

  admin: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Join requests", path: "/dashboard/join-requests", icon: ClipboardList },
    { name: "Members", path: "/dashboard/members", icon: Users },
    { name: "Officials", path: "/dashboard/officials", icon: ShieldCheck },
    { name: "Chama rules", path: "/dashboard/chama-rules", icon: Settings },
    { name: "Reports", path: "/dashboard/reports", icon: FileText },
  ],

  treasurer: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Contributions", path: "/dashboard/contributions", icon: Wallet },
    { name: "Loans", path: "/dashboard/loans", icon: HandCoins },
    { name: "Penalties", path: "/dashboard/penalties", icon: Receipt },
    { name: "Members", path: "/dashboard/members", icon: Users },
    { name: "Reports", path: "/dashboard/reports", icon: FileText },
  ],

  secretary: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Meetings", path: "/dashboard/meetings", icon: CalendarDays },
    { name: "Minutes", path: "/dashboard/minutes", icon: BookOpen },
    { name: "Announcements", path: "/dashboard/announcements", icon: Megaphone },
    { name: "Member register", path: "/dashboard/member-register", icon: Users },
  ],

  member: [
    { name: "Home", path: "/dashboard", icon: LayoutDashboard },
    { name: "Loans", path: "/dashboard/loans", icon: HandCoins },
    { name: "Meetings", path: "/dashboard/meetings", icon: CalendarDays },
    { name: "News", path: "/dashboard/news", icon: Bell },
    { name: "Contributions", path: "/dashboard/contributions", icon: Wallet },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();

  const rawRole =
    user?.role ||
    user?.role_name ||
    user?.user?.role ||
    user?.membership?.role ||
    "";

  const role = String(rawRole)
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const navigation =
    navigationByRole[role] || navigationByRole.member;

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-green-950 text-white">

      <div className="border-b border-green-900 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-800">
            <Building2 size={23} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide">
              SUMMIT
            </h1>
            <p className="text-xs text-green-300">
              Chama Management
            </p>
          </div>
        </div>
      </div>


      <div className="border-b border-green-900 px-6 py-5">
        <p className="text-xs uppercase tracking-wider text-green-400">
          Logged in as
        </p>

        <p className="mt-1 font-semibold capitalize">
          {role.replace(/_/g, " ") || "User"}
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-green-800 text-white shadow-sm"
                    : "text-green-200 hover:bg-green-900 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-green-900 p-5">
        <p className="text-xs text-green-300">
          Summit Chama Management System
        </p>
      </div>

    </aside>
  );
}

