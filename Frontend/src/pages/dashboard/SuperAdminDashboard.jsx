
import { useState } from "react";
import {
  Users,
  Building2,
  ShieldCheck,
  ClipboardList,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";

// DEMO DATA: Replace with information from your Flask API later.
const initialOrganizations = [
  {
    id: 1,
    name: "Summit Investment Chama",
    members: 24,
    admin: "Jane Wanjiku",
    status: "Pending",
  },
  {
    id: 2,
    name: "Unity Savings Group",
    members: 18,
    admin: "Peter Kamau",
    status: "Approved",
  },
  {
    id: 3,
    name: "Alpha Women Group",
    members: 32,
    admin: "Mary Njeri",
    status: "Pending",
  },
];

const initialAdmins = [
  { id: 1, name: "Jane Wanjiku", email: "jane@example.com", status: "Active" },
  { id: 2, name: "Peter Kamau", email: "peter@example.com", status: "Active" },
  { id: 3, name: "Mary Njeri", email: "mary@example.com", status: "Inactive" },
];

const auditLogs = [
  {
    id: 1,
    user: "Jane Wanjiku",
    action: "Registered a new Chama",
    date: "13 Nov 2026",
  },
  {
    id: 2,
    user: "Peter Kamau",
    action: "Approved an administrator",
    date: "12 Nov 2026",
  },
  {
    id: 3,
    user: "Mary Njeri",
    action: "Updated organization details",
    date: "11 Nov 2026",
  },
];

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [admins, setAdmins] = useState(initialAdmins);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const approveOrganization = (id) => {
    // BACKEND: PATCH /api/admin/organizations/${id}/approve
    setOrganizations((current) =>
      current.map((organization) =>
        organization.id === id
          ? { ...organization, status: "Approved" }
          : organization
      )
    );
    setMessage("Organization approved successfully.");
  };

  const rejectOrganization = (id) => {
    // BACKEND: PATCH /api/admin/organizations/${id}/reject
    setOrganizations((current) =>
      current.map((organization) =>
        organization.id === id
          ? { ...organization, status: "Rejected" }
          : organization
      )
    );
    setMessage("Organization rejected.");
  };

  const toggleAdminStatus = (id) => {
    // BACKEND: PATCH /api/admin/users/${id}/status
    setAdmins((current) =>
      current.map((admin) =>
        admin.id === id
          ? {
              ...admin,
              status: admin.status === "Active" ? "Inactive" : "Active",
            }
          : admin
      )
    );
    setMessage("Administrator status updated.");
  };

  const filteredOrganizations = organizations.filter((organization) =>
    organization.name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingOrganizations = organizations.filter(
    (organization) => organization.status === "Pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* Dashboard heading */}
      <div>
        <p className="text-sm font-medium text-green-800">
          Platform Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage Chamas, administrators and platform activities.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-3 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value="1,248"
          description="Registered platform users"
          icon={Users}
        />
        <StatCard
          title="Total Chamas"
          value="86"
          description="Registered organizations"
          icon={Building2}
        />
        <StatCard
          title="Administrators"
          value={admins.length}
          description="Platform administrators"
          icon={ShieldCheck}
        />
        <StatCard
          title="Pending Registrations"
          value={pendingOrganizations}
          description="Awaiting approval"
          icon={ClipboardList}
        />
      </div>

      {/* Organization management */}
      <Panel title="Chama Management">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Review and manage registered Chamas.
          </p>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Chamas..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-green-700 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Chama Name</th>
                <th className="p-3">Members</th>
                <th className="p-3">Administrator</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredOrganizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="p-3 font-medium text-gray-800">
                    {organization.name}
                  </td>
                  <td className="p-3">{organization.members}</td>
                  <td className="p-3">{organization.admin}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        organization.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : organization.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {organization.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {organization.status === "Pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveOrganization(organization.id)}
                          className="text-green-700 hover:text-green-900"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectOrganization(organization.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Reject"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredOrganizations.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-5 text-center text-gray-500">
                    No Chamas found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Administrator management */}
      <Panel title="Administrator Management">
        <p className="mb-4 text-sm text-gray-500">
          View and manage platform administrators.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Administrator</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="p-3 font-medium text-gray-800">
                    {admin.name}
                  </td>
                  <td className="p-3">{admin.email}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        admin.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleAdminStatus(admin.id)}
                      className="font-medium text-green-800 hover:underline"
                    >
                      {admin.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Platform audit trail */}
      <Panel title="Platform Audit Logs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Activity</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3 font-medium text-gray-800">{log.user}</td>
                  <td className="p-3">{log.action}</td>
                  <td className="p-3 text-gray-500">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}


