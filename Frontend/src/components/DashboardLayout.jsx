
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">

        <DashboardHeader />

        <main className="flex-1 p-6">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

