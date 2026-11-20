import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Users,
  ShieldCheck,
  History,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";
import {
  ActionButton,
  Panel,
  StatCard,
} from "./DashboardShared";

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [chamas, setChamas] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [totals, setTotals] = useState({
    chamas: 0,
    users: 0,
    auditLogs: 0,
  });

  const showFeedback = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 4500);
  };

  const fetchPlatformData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [chamasRes, usersRes, auditRes] = await Promise.all([
        axiosClient.get("/chamas", { params: { per_page: 50 } }),
        axiosClient.get("/admin/users", { params: { per_page: 50 } }),
        axiosClient.get("/admin/audit-logs", { params: { per_page: 15 } }),
      ]);

      const chamaItems = chamasRes.data?.items || [];
      const userItems = usersRes.data?.items || [];
      const logItems = auditRes.data?.items || [];

      setChamas(chamaItems);
      setUsers(userItems);
      setAuditLogs(logItems);

      setTotals({
        chamas: chamasRes.data?.total ?? chamaItems.length,
        users: usersRes.data?.total ?? userItems.length,
        auditLogs: auditRes.data?.total ?? logItems.length,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchPlatformData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchPlatformData]);

  const handleToggleUserStatus = async (targetUser) => {
    const nextActive = !targetUser.is_active;
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.patch(`/admin/users/${targetUser.id}/status`, {
        is_active: nextActive,
      });
      showFeedback(
        `${targetUser.full_name}'s account has been ${
          nextActive ? "activated" : "suspended"
        }.`
      );
      await fetchPlatformData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const chamaAdminsCount = users.filter((u) => u.role === "chama_admin").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">Platform Administration</p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Welcome back, {user?.full_name || "Super Admin"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Global platform oversight across all registered Chamas, administrators, users, and audit logs.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Registered Chamas"
          value={loading ? "..." : totals.chamas}
          icon={Building2}
        />

        <StatCard
          title="Chama Administrators"
          value={loading ? "..." : chamaAdminsCount}
          icon={ShieldCheck}
        />

        <StatCard
          title="Total Platform Users"
          value={loading ? "..." : totals.users}
          icon={Users}
        />

        <StatCard
          title="Global Audit Events"
          value={loading ? "..." : totals.auditLogs}
          icon={History}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Platform Users & Administrators"
          className="lg:col-span-2"
        >
          <p className="mb-4 text-sm text-gray-500">
            Suspend or activate user accounts across the platform.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>

                    <td className="px-4 py-3.5 capitalize text-gray-700">
                      {(u.role || "member").replace(/_/g, " ")}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_email_verified
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {u.is_email_verified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.role !== "super_admin" && (
                        <ActionButton
                          type="button"
                          loading={submitting}
                          onClick={() => handleToggleUserStatus(u)}
                          variant={u.is_active ? "danger" : "primary"}
                          className="px-3 py-1.5 text-xs"
                        >
                          {u.is_active ? (
                            <>
                              <UserX size={14} /> Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck size={14} /> Activate
                            </>
                          )}
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && users.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Registered Chamas"
        >
          <p className="mb-4 text-sm text-gray-500">
            Organizations operating on Summit.
          </p>
          <div className="space-y-3">
            {chamas.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3.5"
              >
                <p className="font-semibold text-gray-800">{c.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {c.location || "Kenya"} • Reg:{" "}
                  {c.registration_number || "N/A"}
                </p>
              </div>
            ))}

            {!loading && chamas.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">
                No Chamas registered yet
              </p>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Global Platform Audit Logs"
      >
        <p className="mb-4 text-sm text-gray-500">
          System-wide tamper-evident activity across all Chamas.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Chama ID</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString("en-KE")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {log.actor_name || "System"}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.table_name} #{log.record_id}
                  </td>
                  <td className="px-4 py-3">
                    {log.chama_id ?? "Global"}
                  </td>
                </tr>
              ))}

              {!loading && auditLogs.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No global audit logs recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}






