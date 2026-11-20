import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Clock,
  Wallet,
  HandCoins,
  Settings,
  History,
  FolderPlus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";
import {
  ActionButton,
  Panel,
  StatCard,
} from "./DashboardShared";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export default function AdminDashboard() {
  const { user } = useAuth();
  const chamaId = user?.chama_id;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingCount: 0,
    totalContributions: 0,
    activeLoansCount: 0,
  });

  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);
  const [contributionRules, setContributionRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [officials, setOfficials] = useState({
    treasurer: "",
    secretary: "",
  });

  const [rules, setRules] = useState({
    monthlyContribution: "2000",
    dueDay: "5",
    latePenalty: "100",
    interestRate: "5",
    maxLoan: "50000",
  });

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    amount_invested: "",
    status: "ongoing",
    image_url: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!chamaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [
        pendingRes,
        activeRes,
        summaryRes,
        rulesRes,
        chamasRes,
        auditRes,
      ] = await Promise.all([
        axiosClient.get(`/chamas/${chamaId}/memberships`, {
          params: { status: "pending", per_page: 50 },
        }),
        axiosClient.get(`/chamas/${chamaId}/memberships`, {
          params: { status: "active", per_page: 100 },
        }),
        axiosClient.get(`/chamas/${chamaId}/financial-summary`),
        axiosClient.get(`/chamas/${chamaId}/contribution-types`),
        axiosClient.get("/chamas", { params: { per_page: 100 } }),
        axiosClient.get(`/chamas/${chamaId}/audit-logs`, {
          params: { per_page: 8 },
        }),
      ]);

      const pendingItems = pendingRes.data?.items || [];
      const activeItems = activeRes.data?.items || [];
      const summary = summaryRes.data || {};
      const typesList = Array.isArray(rulesRes.data) ? rulesRes.data : [];
      const allChamas = chamasRes.data?.items || [];
      const currentChama = allChamas.find(
        (c) => Number(c.id) === Number(chamaId)
      );

      setPendingRequests(pendingItems);
      setActiveMembers(activeItems);
      setContributionRules(typesList);
      setAuditLogs(auditRes.data?.items || []);

      setStats({
        totalMembers: activeRes.data?.total ?? activeItems.length,
        pendingCount: pendingRes.data?.total ?? pendingItems.length,
        totalContributions: Number(summary.total_contributions || 0),
        activeLoansCount: Number(summary.active_loans_count || 0),
      });

      const currentTreasurer = activeItems.find((m) => m.role === "treasurer");
      const currentSecretary = activeItems.find((m) => m.role === "secretary");
      setOfficials({
        treasurer: currentTreasurer ? String(currentTreasurer.id) : "",
        secretary: currentSecretary ? String(currentSecretary.id) : "",
      });

      const monthlyRule =
          typesList.find((t) => t.frequency === "monthly") || typesList.at(0);


      setRules({
        monthlyContribution: monthlyRule ? String(monthlyRule.amount) : "2000",
        dueDay: monthlyRule?.due_day ? String(monthlyRule.due_day) : "5",
        latePenalty:
          monthlyRule?.penalty_amount !== null &&
          monthlyRule?.penalty_amount !== undefined
            ? String(monthlyRule.penalty_amount)
            : "100",
        interestRate: currentChama?.default_interest_rate
          ? String(currentChama.default_interest_rate)
          : "5",
        maxLoan: currentChama?.max_loan_amount
          ? String(currentChama.max_loan_amount)
          : "50000",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chamaId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchDashboardData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboardData]);

  const showFeedback = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 4500);
  };

  const handleRequest = async (membershipId, newStatus, name) => {
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.patch(`/memberships/${membershipId}`, {
        status: newStatus,
      });
      showFeedback(
        newStatus === "active"
          ? `${name} has been approved and notified via email.`
          : `${name}'s membership request was declined and notified via email.`
      );
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfficialSave = async (e) => {
    e.preventDefault();
    if (!officials.treasurer && !officials.secretary) {
      setError("Please select at least one member to assign as an official.");
      return;
    }
    if (
      officials.treasurer &&
      officials.secretary &&
      officials.treasurer === officials.secretary
    ) {
      setError("The same member cannot hold both Treasurer and Secretary roles.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const updates = [];

      const prevTreasurer = activeMembers.find((m) => m.role === "treasurer");
      if (
        prevTreasurer &&
        String(prevTreasurer.id) !== String(officials.treasurer)
      ) {
        updates.push(
          axiosClient.patch(`/memberships/${prevTreasurer.id}`, {
            role: "member",
          })
        );
      }

      const prevSecretary = activeMembers.find((m) => m.role === "secretary");
      if (
        prevSecretary &&
        String(prevSecretary.id) !== String(officials.secretary)
      ) {
        updates.push(
          axiosClient.patch(`/memberships/${prevSecretary.id}`, {
            role: "member",
          })
        );
      }

      if (officials.treasurer) {
        updates.push(
          axiosClient.patch(`/memberships/${officials.treasurer}`, {
            role: "treasurer",
          })
        );
      }
      if (officials.secretary) {
        updates.push(
          axiosClient.patch(`/memberships/${officials.secretary}`, {
            role: "secretary",
          })
        );
      }

      await Promise.all(updates);
      showFeedback("Chama officials have been updated successfully.");
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRulesSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await axiosClient.patch(`/chamas/${chamaId}`, {
        default_interest_rate: Number(rules.interestRate),
        max_loan_amount: Number(rules.maxLoan),
      });

      const existingMonthly = contributionRules.find(
        (r) =>
          String(r.name || "").toLowerCase() === "monthly contribution"
      );

      if (!existingMonthly) {
        await axiosClient.post(`/chamas/${chamaId}/contribution-types`, {
          name: "Monthly Contribution",
          amount: Number(rules.monthlyContribution),
          frequency: "monthly",
          due_day: Number(rules.dueDay),
          grace_days: 5,
          penalty_amount: Number(rules.latePenalty),
        });
      }

      showFeedback("Chama rules and loan limits saved successfully.");
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await axiosClient.post(`/chamas/${chamaId}/projects`, {
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || null,
        amount_invested: projectForm.amount_invested
          ? Number(projectForm.amount_invested)
          : 0,
        status: projectForm.status,
        image_url: projectForm.image_url.trim() || null,
        is_public: true,
      });

      setProjectForm({
        title: "",
        description: "",
        amount_invested: "",
        status: "ongoing",
        image_url: "",
      });
      showFeedback("Investment project published to your public Chama page.");
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-green-800">
            Chama Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold text-green-950">
            Welcome back, {user?.full_name || "Admin"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage members, officials, rules, projects, and Chama operations.
          </p>
        </div>
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
          title="Active Members"
          value={loading ? "..." : stats.totalMembers}
          icon={Users}
        />
        <StatCard
          title="Pending Requests"
          value={loading ? "..." : stats.pendingCount}
          icon={Clock}
        />
        <StatCard
          title="Total Contributions"
          value={loading ? "..." : formatCurrency(stats.totalContributions)}
          icon={Wallet}
        />
        <StatCard
          title="Active Loans"
          value={loading ? "..." : stats.activeLoansCount}
          icon={HandCoins}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Pending Join Requests"
          className="lg:col-span-2"
          action={
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              {pendingRequests.length} pending
            </span>
          }
        >
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No pending membership requests right now
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">Applicant</th>
                    <th className="px-3 py-3">Member No.</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Applied</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">{req.full_name}</p>
                        <p className="text-xs text-gray-500">{req.email}</p>
                      </td>
                      <td className="px-3 py-3">{req.member_number || "-"}</td>
                      <td className="px-3 py-3">{req.phone_number || "-"}</td>
                      <td className="px-3 py-3">
                        {req.joined_at
                          ? new Date(req.joined_at).toLocaleDateString("en-KE")
                          : "Today"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <ActionButton
                            type="button"
                            loading={submitting}
                            onClick={() =>
                              handleRequest(req.id, "active", req.full_name)
                            }
                          >
                            Approve
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="danger"
                            loading={submitting}
                            onClick={() =>
                              handleRequest(req.id, "rejected", req.full_name)
                            }
                          >
                            Reject
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Assign Officials" action={<Settings size={20} />}>
          <form onSubmit={handleOfficialSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Treasurer
              </label>
              <select
                value={officials.treasurer}
                onChange={(e) =>
                  setOfficials({ ...officials, treasurer: e.target.value })
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-green-800"
              >
                <option value="">Select Treasurer</option>
                {activeMembers
                  .filter((m) => m.role !== "chama_admin")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.member_number})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Secretary
              </label>
              <select
                value={officials.secretary}
                onChange={(e) =>
                  setOfficials({ ...officials, secretary: e.target.value })
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-green-800"
              >
                <option value="">Select Secretary</option>
                {activeMembers
                  .filter((m) => m.role !== "chama_admin")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.member_number})
                    </option>
                  ))}
              </select>
            </div>

            <ActionButton type="submit" loading={submitting}>
              Save Officials
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Chama Rules" action={<Settings size={20} />}>
          <form onSubmit={handleRulesSave} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Monthly Contribution (KES)
              <input
                type="number"
                value={rules.monthlyContribution}
                onChange={(e) =>
                  setRules({ ...rules, monthlyContribution: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Due Day (1-31)
              <input
                type="number"
                min="1"
                max="31"
                value={rules.dueDay}
                onChange={(e) =>
                  setRules({ ...rules, dueDay: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Late Penalty (KES)
              <input
                type="number"
                min="0"
                value={rules.latePenalty}
                onChange={(e) =>
                  setRules({ ...rules, latePenalty: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Loan Interest (%)
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={rules.interestRate}
                onChange={(e) =>
                  setRules({ ...rules, interestRate: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Max Loan (KES)
              <input
                type="number"
                min="500"
                value={rules.maxLoan}
                onChange={(e) =>
                  setRules({ ...rules, maxLoan: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <div className="flex items-end">
              <ActionButton type="submit" loading={submitting}>
                Save Rules
              </ActionButton>
            </div>
          </form>
        </Panel>

        <Panel title="Publish Investment Project" action={<FolderPlus size={20} />}>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Project Title
              <input
                type="text"
                value={projectForm.title}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, title: e.target.value })
                }
                placeholder="e.g. Ruiru Land Purchase"
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Invested (KES)
              <input
                type="number"
                min="0"
                value={projectForm.amount_invested}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    amount_invested: e.target.value,
                  })
                }
                placeholder="500000"
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Status
              <select
                value={projectForm.status}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, status: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              >
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Description
              <textarea
                rows="3"
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief details about this investment..."
                className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              />
            </label>
            <ActionButton type="submit" loading={submitting}>
              Publish Project
            </ActionButton>
          </form>
        </Panel>

        <Panel
          title="Recent Audit Activity"
          className="lg:col-span-2"
          action={<History size={20} />}
        >
          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No audit activity recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {log.action} {log.table_name?.replace(/_/g, " ")} #
                    {log.record_id}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    By {log.actor_name || "Admin"}{" "}
                    {log.created_at
                      ? `on ${new Date(log.created_at).toLocaleDateString("en-KE")}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}


