import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Clock,
  Wallet,
  HandCoins,
  Check,
  X,
  Pencil,
  Trash2,
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
  const [rosterMembers, setRosterMembers] = useState([]);
  const [contributionRules, setContributionRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);

  const [rules, setRules] = useState({
    monthlyContribution: "2000",
    dueDay: "5",
    latePenalty: "100",
    interestRate: "5",
    maxLoan: "50000",
  });

  const [profileForm, setProfileForm] = useState({
    location: "",
    description: "",
    constitution: "",
    logo_url: "",
    logoFile: null,
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
        membersRes,
        summaryRes,
        rulesRes,
        chamasRes,
        auditRes,
        projectsRes,
      ] = await Promise.all([
        axiosClient.get(`/chamas/${chamaId}/memberships`, {
          params: { status: "pending", per_page: 50 },
        }),
        axiosClient.get(`/chamas/${chamaId}/memberships`, {
          params: { per_page: 100 },
        }),
        axiosClient.get(`/chamas/${chamaId}/financial-summary`),
        axiosClient.get(`/chamas/${chamaId}/contribution-types`),
        axiosClient.get("/chamas", { params: { per_page: 100 } }),
        axiosClient.get(`/chamas/${chamaId}/audit-logs`, {
          params: { per_page: 8 },
        }),
        axiosClient.get(`/chamas/${chamaId}/projects`, {
          params: { per_page: 50 },
        }),
      ]);

      const pendingItems = pendingRes.data?.items || [];
      const allMemberships = membersRes.data?.items || [];
      const activeItems = allMemberships.filter((m) => m.status === "active");
      const rosterItems = allMemberships.filter((m) =>
        ["active", "suspended"].includes(m.status)
      );

      const summary = summaryRes.data || {};
      const typesList = Array.isArray(rulesRes.data) ? rulesRes.data : [];
      const allChamas = chamasRes.data?.items || [];
      const currentChama = allChamas.find(
        (c) => Number(c.id) === Number(chamaId)
      );

      setPendingRequests(pendingItems);
      setActiveMembers(activeItems);
      setRosterMembers(rosterItems);
      setContributionRules(typesList);
      setAuditLogs(auditRes.data?.items || []);
      setProjects(projectsRes.data?.items || []);

      setStats({
        totalMembers: activeItems.length,
        pendingCount: pendingRes.data?.total ?? pendingItems.length,
        totalContributions: Number(summary.total_contributions || 0),
        activeLoansCount: Number(summary.active_loans_count || 0),
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

      if (currentChama) {
        setProfileForm((prev) => ({
          ...prev,
          location: currentChama.location || "",
          description: currentChama.description || "",
          constitution: currentChama.constitution || "",
          logo_url: currentChama.logo_url || "",
          logoFile: null,
        }));
      }
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
      if (newStatus === "active") {
        showFeedback(`${name}'s membership is now active.`);
      } else if (newStatus === "suspended") {
        showFeedback(`${name} has been suspended from the Chama.`);
      } else {
        showFeedback(`${name}'s membership request was declined.`);
      }
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectRoleChange = async (membershipId, newRole, memberName) => {
    setSubmitting(true);
    setError("");
    try {
      if (newRole === "treasurer" || newRole === "secretary") {
        const currentHolder = activeMembers.find(
          (m) => m.role === newRole && Number(m.id) !== Number(membershipId)
        );
        if (currentHolder) {
          await axiosClient.patch(`/memberships/${currentHolder.id}`, {
            role: "member",
          });
        }
      }

      await axiosClient.patch(`/memberships/${membershipId}`, {
        role: newRole,
      });

      showFeedback(
        newRole === "member"
          ? `${memberName}'s official role was stripped (now Member).`
          : `${memberName} is now assigned as ${newRole}.`
      );
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
        (r) => r.name.toLowerCase() === "monthly contribution"
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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      let finalLogoUrl = profileForm.logo_url.trim() || null;

      if (profileForm.logoFile) {
        const fd = new FormData();
        fd.append("file", profileForm.logoFile);
        const uploadRes = await axiosClient.post("/uploads", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalLogoUrl = uploadRes.data?.url || finalLogoUrl;
      }

      await axiosClient.patch(`/chamas/${chamaId}`, {
        location: profileForm.location.trim() || null,
        description: profileForm.description.trim() || null,
        constitution: profileForm.constitution.trim() || null,
        logo_url: finalLogoUrl,
      });

      showFeedback("Public Chama profile, constitution, and logo updated.");
      await fetchDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectForm({
      title: "",
      description: "",
      amount_invested: "",
      status: "ongoing",
      image_url: "",
    });
  };

  const handleStartEditProject = (project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      title: project.title || "",
      description: project.description || "",
      amount_invested:
        project.amount_invested !== null &&
        project.amount_invested !== undefined
          ? String(project.amount_invested)
          : "",
      status: project.status || "ongoing",
      image_url: project.image_url || "",
    });
  };

    const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) return;

    setSubmitting(true);
    setError("");
    const payload = {
      title: projectForm.title.trim(),
        description: projectForm.description.trim() || null,
        amount_invested: projectForm.amount_invested
          ? Number(projectForm.amount_invested)
          : 0,
        status: projectForm.status,
        image_url: projectForm.image_url.trim() || null,
        is_public: true,
      };

      try {
        if (editingProjectId) {
          await axiosClient.patch(
            `/chamas/${chamaId}/projects/${editingProjectId}`,
            payload
          );
          showFeedback("Investment project updated successfully.");
        } else {
          await axiosClient.post(`/chamas/${chamaId}/projects`, payload);
          showFeedback("Investment project published to your public Chama page.");
        }
        resetProjectForm();
        await fetchDashboardData();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    };

    const handleDeleteProject = async (projectId, title) => {
      setSubmitting(true);
      setError("");
      try {
        await axiosClient.delete(`/chamas/${chamaId}/projects/${projectId}`);
        if (editingProjectId === projectId) resetProjectForm();
        showFeedback(`"${title}" has been removed from public projects.`);
        await fetchDashboardData();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-green-800">Chama Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-green-950">
            Welcome back, {user?.full_name || "Admin"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage members, officials, rules, projects, and Chama operations.
          </p>
        </header>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Active Members" value={loading ? "..." : stats.totalMembers} icon={Users} />
          <StatCard title="Pending Requests" value={loading ? "..." : stats.pendingCount} icon={Clock} />
          <StatCard title="Total Contributions" value={loading ? "..." : formatCurrency(stats.totalContributions)} icon={Wallet} />
          <StatCard title="Active Loans" value={loading ? "..." : stats.activeLoansCount} icon={HandCoins} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel
            title="Pending Join Requests"
            className="lg:col-span-2"
            action={<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">{pendingRequests.length} pending</span>}
          >
            {pendingRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {loading ? "Loading join requests..." : "No pending membership requests right now"}
              </p>
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
                    {pendingRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-900">{request.full_name}</p>
                          <p className="text-xs text-gray-500">{request.email}</p>
                        </td>
                        <td className="px-3 py-3">{request.member_number || "-"}</td>
                        <td className="px-3 py-3">{request.phone_number || "-"}</td>
                        <td className="px-3 py-3">
                          {request.joined_at ? new Date(request.joined_at).toLocaleDateString("en-KE") : "Today"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <ActionButton type="button" loading={submitting} onClick={() => handleRequest(request.id, "active", request.full_name)}>
                              <Check size={15} /> Approve
                            </ActionButton>
                            <ActionButton type="button" variant="danger" loading={submitting} onClick={() => handleRequest(request.id, "rejected", request.full_name)}>
                              <X size={15} /> Reject
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

          <Panel title="Member Roster" className="lg:col-span-2">
            {rosterMembers.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {loading ? "Loading members..." : "No active or suspended members found"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="px-3 py-3">Member No.</th>
                      <th className="px-3 py-3">Full Name</th>
                      <th className="px-3 py-3">Current Role</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Assign / Strip Role</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rosterMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-3 py-3">{member.member_number || "-"}</td>
                        <td className="px-3 py-3 font-medium">{member.full_name}</td>
                        <td className="px-3 py-3 capitalize">
                          {(member.role || "member").replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-3 capitalize">{member.status}</td>
                        <td className="px-3 py-3">
                          {member.role !== "chama_admin" && (
                            <select
                              value={member.role || "member"}
                              disabled={submitting || member.status !== "active"}
                              onChange={(e) => handleDirectRoleChange(member.id, e.target.value, member.full_name)}
                              className="rounded-lg border px-2 py-1.5 text-xs"
                            >
                              <option value="member">Member</option>
                              <option value="treasurer">Treasurer</option>
                              <option value="secretary">Secretary</option>
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {member.role !== "chama_admin" && (
                            <ActionButton
                              type="button"
                              variant={member.status === "active" ? "danger" : "primary"}
                              loading={submitting}
                              onClick={() => handleRequest(member.id, member.status === "active" ? "suspended" : "active", member.full_name)}
                              className="px-3 py-1.5 text-xs"
                            >
                              {member.status === "active" ? "Suspend" : "Activate"}
                            </ActionButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Public Chama Profile">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Location
                <input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Upload Chama Logo (PNG / JPG / WEBP)
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setProfileForm({ ...profileForm, logoFile: e.target.files?.[0] || null })} className="mt-1.5 w-full text-sm" />
              </label>
              {profileForm.logo_url && <p className="text-xs text-green-800">Current Chama logo active</p>}
              {profileForm.logoFile && <p className="text-xs text-gray-500">Selected: {profileForm.logoFile.name}</p>}
              <label className="block text-sm font-medium text-gray-700">
                About / Public Description
                <textarea rows="3" value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Chama Constitution / Bylaws
                <textarea rows="4" value={profileForm.constitution} onChange={(e) => setProfileForm({ ...profileForm, constitution: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" />
              </label>
              <ActionButton type="submit" loading={submitting}>Save Public Profile</ActionButton>
            </form>
          </Panel>

          <Panel title="Chama Rules">
            <form onSubmit={handleRulesSave} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Monthly Contribution (KES)<input type="number" min="1" value={rules.monthlyContribution} onChange={(e) => setRules({ ...rules, monthlyContribution: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <label className="text-sm font-medium text-gray-700">Due Day (1-31)<input type="number" min="1" max="31" value={rules.dueDay} onChange={(e) => setRules({ ...rules, dueDay: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <label className="text-sm font-medium text-gray-700">Late Penalty (KES)<input type="number" min="0" value={rules.latePenalty} onChange={(e) => setRules({ ...rules, latePenalty: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <label className="text-sm font-medium text-gray-700">Loan Interest (%)<input type="number" min="0" max="100" step="0.5" value={rules.interestRate} onChange={(e) => setRules({ ...rules, interestRate: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <label className="text-sm font-medium text-gray-700">Max Loan (KES)<input type="number" min="500" value={rules.maxLoan} onChange={(e) => setRules({ ...rules, maxLoan: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <div className="flex items-end"><ActionButton type="submit" loading={submitting}>Save Rules</ActionButton></div>
            </form>
          </Panel>

          <Panel
            title={editingProjectId ? "Edit Investment Project" : "Publish Investment Project"}
            action={editingProjectId && <button type="button" onClick={resetProjectForm} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel Edit</button>}
          >
            <form onSubmit={handleSaveProject} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Project Title<input type="text" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" required /></label>
              <label className="block text-sm font-medium text-gray-700">Invested (KES)<input type="number" min="0" value={projectForm.amount_invested} onChange={(e) => setProjectForm({ ...projectForm, amount_invested: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-gray-700">Status<select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"><option value="planned">Planned</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></label>
              <label className="block text-sm font-medium text-gray-700">Project Image URL<input type="url" value={projectForm.image_url} onChange={(e) => setProjectForm({ ...projectForm, image_url: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="block text-sm font-medium text-gray-700">Description<textarea rows="3" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <ActionButton type="submit" loading={submitting}>{editingProjectId ? "Update Project" : "Publish Project"}</ActionButton>
            </form>
            <h3 className="mb-3 mt-6 text-sm font-semibold text-gray-900">Published Projects ({projects.length})</h3>
            {projects.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">{loading ? "Loading projects..." : "No projects published yet."}</p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{project.title}</p>
                      <p className="mt-1 text-xs capitalize text-gray-500">{project.status} · {formatCurrency(project.amount_invested)}</p>
                      {project.description && <p className="mt-2 text-sm text-gray-600">{project.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={submitting} onClick={() => handleStartEditProject(project)} className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 hover:text-green-800 disabled:opacity-50" title="Edit Project"><Pencil size={15} /></button>
                      <button type="button" disabled={submitting} onClick={() => handleDeleteProject(project.id, project.title)} className="rounded-lg border border-red-100 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete Project"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent Audit Activity" className="lg:col-span-2">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{loading ? "Loading audit logs..." : "No audit activity recorded yet"}</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-900">{log.action} {log.table_name?.replace(/_/g, " ")} #{log.record_id}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      By {log.actor_name || "Admin"}{log.created_at ? ` · ${new Date(log.created_at).toLocaleDateString("en-KE")}` : ""}
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