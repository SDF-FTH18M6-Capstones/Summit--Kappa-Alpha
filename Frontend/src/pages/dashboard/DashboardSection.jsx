import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";
import { DashboardHeading, Panel } from "./DashboardShared";
import MemberDashboard from "./MemberDashboard";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const superAdminSections = [
  "administrators",
  "organizations",
  "users",
  "reports",
  "audit-logs",
  "settings",
];

const rolePermissions = {
  super_admin: superAdminSections,
  superadmin: superAdminSections,
  chama_admin: [
    "join-requests",
    "members",
    "officials",
    "chama-rules",
    "reports",
    "my-account",
  ],
  treasurer: [
    "contributions",
    "loans",
    "penalties",
    "members",
    "reports",
    "my-account",
  ],
  secretary: [
    "meetings",
    "minutes",
    "announcements",
    "member-register",
    "my-account",
  ],
  member: ["loans", "meetings", "news", "contributions"],
};


export default function DashboardSection() {
  const { section } = useParams();
  const { user } = useAuth();

  const role = String(
    user?.role || user?.role_name || user?.user?.role || ""
  )
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const allowedSections = rolePermissions[role] || [];
  const isAllowed = allowedSections.includes(section);
  const formattedTitle = section
    ?.split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const chamaId = user?.chama_id;
  const membershipId = user?.membership_id;

  useEffect(() => {
    if (!isAllowed || !section) return;

    let active = true;
    const loadSectionData = async () => {
      setLoading(true);
      setError("");
      setRows([]);

      try {
        if (section === "organizations") {
          const res = await axiosClient.get("/chamas", {
            params: { per_page: 50 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (section === "users" || section === "administrators") {
          const res = await axiosClient.get("/admin/users", {
            params: { per_page: 50 },
          });
          const all = res.data?.items || [];
          if (active) {
            setRows(
              section === "administrators"
                ? all.filter((u) => u.role === "chama_admin")
                : all
            );
          }
        } else if (section === "audit-logs") {
          const endpoint =
            role === "super_admin" || role === "superadmin"
              ? "/admin/audit-logs"
              : `/chamas/${chamaId}/audit-logs`;
          const res = await axiosClient.get(endpoint, {
            params: { per_page: 30 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (section === "join-requests" && chamaId) {
          const res = await axiosClient.get(`/chamas/${chamaId}/memberships`, {
            params: { status: "pending", per_page: 50 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (
          (section === "members" ||
            section === "member-register" ||
            section === "officials") &&
          chamaId
        ) {
          const res = await axiosClient.get(`/chamas/${chamaId}/memberships`, {
            params: { per_page: 100 },
          });
          const all = res.data?.items || [];
          if (active) {
            setRows(
              section === "officials"
                ? all.filter((m) =>
                    ["chama_admin", "treasurer", "secretary"].includes(m.role)
                  )
                : all
            );
          }
        } else if (section === "contributions" && chamaId) {
          const params =
            role === "member" && membershipId
              ? { membership_id: membershipId, per_page: 50 }
              : { per_page: 50 };
          const res = await axiosClient.get(
            `/chamas/${chamaId}/contributions`,
            { params }
          );
          if (active) setRows(res.data?.contributions || []);
        } else if (section === "loans" && chamaId) {
          const params =
            role === "member" && membershipId
              ? { membership_id: membershipId, per_page: 50 }
              : { per_page: 50 };
          const res = await axiosClient.get(`/chamas/${chamaId}/loans`, {
            params,
          });
          if (active) setRows(res.data?.items || []);
        } else if (section === "penalties" && chamaId) {
          const res = await axiosClient.get(`/chamas/${chamaId}/penalties`, {
            params: { per_page: 50 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (section === "meetings" && chamaId) {
          const res = await axiosClient.get(`/chamas/${chamaId}/meetings`, {
            params: { per_page: 50 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (section === "minutes" && chamaId) {
          const res = await axiosClient.get(`/chamas/${chamaId}/minutes`, {
            params: { per_page: 50 },
          });
          if (active) setRows(res.data?.items || []);
        } else if (
          (section === "announcements" || section === "news") &&
          chamaId
        ) {
          const res = await axiosClient.get(
            `/chamas/${chamaId}/announcements`,
            { params: { per_page: 50 } }
          );
          if (active) setRows(res.data?.items || []);
        } else if (section === "chama-rules" && chamaId) {
          const res = await axiosClient.get(
            `/chamas/${chamaId}/contribution-types`
          );
          if (active) setRows(Array.isArray(res.data) ? res.data : []);
        } else if (section === "reports" && chamaId) {
          const res = await axiosClient.get(
            `/chamas/${chamaId}/financial-summary`
          );
          if (active) setRows([res.data]);
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSectionData();
    return () => {
      active = false;
    };
  }, [section, isAllowed, role, chamaId, membershipId]);
  if (isAllowed && section === "my-account") {
  return <MemberDashboard />;
  }


  if (!isAllowed) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert size={28} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>

          <p className="mt-2 max-w-md text-sm text-gray-500">
            You do not have permission to access the{" "}
            <span className="font-semibold text-gray-700">
              {formattedTitle}
            </span>{" "}
            page with your current role ({role.replace(/_/g, " ")}).
          </p>

          <Link
            to="/dashboard"
            className="mt-6 flex items-center gap-2 rounded-lg bg-green-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            <ArrowLeft size={16} />
            Return to My Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeading
        title={formattedTitle}
        description={`Live ${formattedTitle.toLowerCase()} records for your ${role.replace(
          /_/g,
          " "
        )} workspace.`}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Panel
        title={formattedTitle}
        action={
          <Link
            to="/dashboard"
            className="flex items-center gap-1 rounded-lg bg-green-900 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800"
          >
            <ArrowLeft size={14} />
            Back to Overview
          </Link>
        }
      >
        <p className="mb-4 text-sm text-gray-500">
          Synchronized with Summit Chama database.
        </p>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Loading {formattedTitle.toLowerCase()}...
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No records found for {formattedTitle.toLowerCase()} yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {Object.keys(rows[0] || {})
                    .filter((k) => !["old_values", "new_values", "constitution"].includes(k))
                    .slice(0, 6)
                    .map((key) => (
                      <th key={key} className="px-4 py-3">
                        {key.replace(/_/g, " ")}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-gray-50">
                    {Object.keys(rows[0] || {})
                      .filter(
                        (key) =>
                          ![
                            "old_values",
                            "new_values",
                            "constitution",
                          ].includes(key)
                      )
                      .slice(0, 6)
                      .map((key) => {
                        const value = row[key];
                        const isMoney =
                          key.includes("amount") ||
                          key.includes("principal") ||
                          key.includes("balance") ||
                          key.includes("contributions") ||
                          key.includes("penalties");

                        return (
                          <td key={key} className="px-4 py-3 text-gray-700">
                            {value === null || value === undefined
                              ? "-"
                              : typeof value === "boolean"
                                ? value
                                  ? "Yes"
                                  : "No"
                                : isMoney
                                  ? formatCurrency(value)
                                  : String(value)}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}







