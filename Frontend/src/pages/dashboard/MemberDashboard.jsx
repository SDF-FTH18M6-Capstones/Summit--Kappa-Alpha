import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  HandCoins,
  CalendarDays,
  AlertTriangle,
  Eye,
  ExternalLink,
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

export default function MemberDashboard() {
  const { user } = useAuth();
  const chamaId = user?.chama_id;
  const membershipId = user?.membership_id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [contributions, setContributions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [minutesList, setMinutesList] = useState([]);
  const [chamaRules, setChamaRules] = useState({
    default_interest_rate: 5,
    max_loan_amount: 100000,
  });

  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const handleViewInstallments = async (loanId) => {
    setLoadingSchedule(true);
    setError("");
    try {
      const res = await axiosClient.get(`/loans/${loanId}/installments`);
      setInstallments(Array.isArray(res.data) ? res.data : []);
      setShowSchedule(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingSchedule(false);
    }
  };

  const [loanForm, setLoanForm] = useState({
    amount: "",
    repaymentMonths: "6",
    purpose: "",
  });

  const showFeedback = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 4500);
  };

  const fetchMemberData = useCallback(async () => {
    if (!chamaId || !membershipId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [
        contribRes,
        loansRes,
        penaltiesRes,
        meetingsRes,
        announcementsRes,
        minutesRes,
        chamasRes,
      ] = await Promise.all([
        axiosClient.get(`/chamas/${chamaId}/contributions`, {
          params: { membership_id: membershipId, per_page: 50 },
        }),
        axiosClient.get(`/chamas/${chamaId}/loans`, {
          params: { membership_id: membershipId, per_page: 20 },
        }),
        axiosClient.get(`/chamas/${chamaId}/penalties`, {
          params: { membership_id: membershipId, per_page: 20 },
        }),
        axiosClient.get(`/chamas/${chamaId}/meetings`, {
          params: { per_page: 10 },
        }),
        axiosClient.get(`/chamas/${chamaId}/announcements`, {
          params: { per_page: 10 },
        }),
        axiosClient.get(`/chamas/${chamaId}/minutes`, {
          params: { per_page: 20 },
        }),
        axiosClient.get("/chamas", { params: { per_page: 100 } }),
      ]);

      setContributions(contribRes.data?.contributions || []);
      setLoans(loansRes.data?.items || []);
      setPenalties(penaltiesRes.data?.items || []);
      setMeetings(meetingsRes.data?.items || []);
      setAnnouncements(announcementsRes.data?.items || []);
      setMinutesList(minutesRes.data?.items || []);

      const currentChama = (chamasRes.data?.items || []).find(
        (c) => Number(c.id) === Number(chamaId)
      );
      if (currentChama) {
        setChamaRules({
          default_interest_rate: Number(currentChama.default_interest_rate || 5),
          max_loan_amount: Number(currentChama.max_loan_amount || 100000),
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chamaId, membershipId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchMemberData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchMemberData]);

  const totalSavings = contributions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const activeLoan = loans.find((l) =>
    ["approved", "disbursed"].includes(l.status)
  );

  const unpaidPenalties = penalties
    .filter((p) => p.status === "unpaid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const nextMeeting = meetings.at(0);

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    if (!loanForm.amount || !loanForm.purpose.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await axiosClient.post(`/chamas/${chamaId}/loans`, {
        membership_id: Number(membershipId),
        principal: Number(loanForm.amount),
        interest_rate: Number(chamaRules.default_interest_rate || 5),
        term_months: Number(loanForm.repaymentMonths),
        purpose: loanForm.purpose.trim(),
      });

      setLoanForm({ amount: "", repaymentMonths: "6", purpose: "" });
      showFeedback(
        "Your loan application has been submitted and is awaiting Treasurer review."
      );
      await fetchMemberData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">Member Account</p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Welcome back, {user?.full_name || "Member"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your savings, manage loan applications, and stay updated with Chama announcements.
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
          title="My Total Savings"
          value={loading ? "..." : formatCurrency(totalSavings)}
          icon={Wallet}
        />
        <StatCard
          title="Active Loan Balance"
          value={
            loading
              ? "..."
              : formatCurrency(activeLoan ? activeLoan.remaining_balance : 0)
          }
          icon={HandCoins}
        />
        <StatCard
          title="Next Meeting"
          value={
            loading
              ? "..."
              : nextMeeting?.meeting_date
                ? new Date(nextMeeting.meeting_date).toLocaleDateString("en-KE")
                : "None scheduled"
          }
          icon={CalendarDays}
        />
        <StatCard
          title="Unpaid Penalties"
          value={loading ? "..." : formatCurrency(unpaidPenalties)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Active Loan">
          {activeLoan ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs font-medium text-green-700">
                  Remaining Balance
                </p>
                <p className="mt-1 text-2xl font-bold text-green-950">
                  {formatCurrency(activeLoan.remaining_balance)}
                </p>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Principal Borrowed:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(activeLoan.principal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Repayable:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(activeLoan.total_repayable)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Installment:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(activeLoan.monthly_installment)}
                  </span>
                </div>
                {activeLoan.next_due_date && (
                  <div className="flex justify-between">
                    <span>First Installment Due:</span>
                    <span className="font-semibold text-gray-800">
                      {activeLoan.next_due_date}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-green-800">
                    {activeLoan.status}
                  </span>
                </div>
              </div>
              <ActionButton
                type="button"
                variant="outline"
                loading={loadingSchedule}
                onClick={() => handleViewInstallments(activeLoan.id)}
              >
                View Repayment Schedule
              </ActionButton>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You currently have no active loan.
            </p>
          )}
        </Panel>

        <Panel title="Apply for a Loan" className="lg:col-span-2">
          <p className="mb-4 text-xs text-gray-500">
            Max limit: {formatCurrency(chamaRules.max_loan_amount)} @{" "}
            {chamaRules.default_interest_rate}% interest
          </p>
          <form
            onSubmit={handleLoanSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <label className="block text-xs font-semibold text-gray-600">
              Loan Amount (KES)
              <input
                type="number"
                min="500"
                max={chamaRules.max_loan_amount}
                placeholder={`Up to ${chamaRules.max_loan_amount}`}
                value={loanForm.amount}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, amount: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Repayment Period
              <select
                value={loanForm.repaymentMonths}
                onChange={(e) =>
                  setLoanForm({
                    ...loanForm,
                    repaymentMonths: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              >
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600 md:col-span-2">
              Purpose of Loan
              <textarea
                rows="3"
                placeholder="Reason for requesting loan..."
                value={loanForm.purpose}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, purpose: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <div className="md:col-span-2">
              <ActionButton type="submit" loading={submitting}>
                Submit Loan Application
              </ActionButton>
            </div>
          </form>

          {loans.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                My Loan Applications
              </h3>
              <div className="space-y-2">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <p className="text-sm text-gray-700">
                      {formatCurrency(loan.principal)} · {loan.term_months} mos
                      · {loan.purpose}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                      {loan.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Chama Announcements" className="lg:col-span-2">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading
                ? "Loading announcements..."
                : "No announcements posted yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString("en-KE")
                      : ""}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Published Meeting Minutes">
          {minutesList.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading
                ? "Loading minutes..."
                : "No meeting minutes published yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {minutesList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.meeting_title || `Meeting #${item.meeting_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.meeting_date
                        ? new Date(item.meeting_date).toLocaleDateString("en-KE")
                        : ""}
                    </p>
                  </div>
                  <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedMinutes(item)}
                  >
                    <Eye size={15} />
                    Read
                  </ActionButton>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="My Contributions" className="lg:col-span-3">
          {contributions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading
                ? "Loading contributions..."
                : "No contributions recorded for your account yet"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">Date Paid</th>
                    <th className="px-3 py-3">M-Pesa Code</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contributions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        {item.paid_at
                          ? new Date(item.paid_at).toLocaleDateString("en-KE")
                          : "-"}
                      </td>
                      <td className="px-3 py-3 font-mono">{item.mpesa_code}</td>
                      <td className="px-3 py-3">
                        {item.contribution_type_name || "Monthly Contribution"}
                      </td>
                      <td className="px-3 py-3">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {selectedMinutes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedMinutes.meeting_title ||
                    `Meeting #${selectedMinutes.meeting_id}`}
                </h2>
                {selectedMinutes.meeting_date && (
                  <p className="text-xs text-gray-500">
                    {new Date(selectedMinutes.meeting_date).toLocaleDateString(
                      "en-KE"
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedMinutes(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close meeting minutes"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {selectedMinutes.minutes}
            </p>
            {selectedMinutes.file_url && (
              <a
                href={selectedMinutes.file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700"
              >
                <ExternalLink size={15} />
                Open Attached Document
              </a>
            )}
            <div className="mt-6 flex justify-end">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => setSelectedMinutes(null)}
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Monthly Repayment Schedule
              </h2>
              <button
                type="button"
                onClick={() => setShowSchedule(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close repayment schedule"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {installments.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No installment schedule generated yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Due Date</th>
                      <th className="px-3 py-3">Amount Due</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {installments.map((installment, index) => (
                      <tr key={installment.id || index}>
                        <td className="px-3 py-3">{index + 1}</td>
                        <td className="px-3 py-3">{installment.due_date}</td>
                        <td className="px-3 py-3">
                          {formatCurrency(installment.amount_due)}
                        </td>
                        <td className="px-3 py-3 capitalize">
                          {installment.status || "pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => setShowSchedule(false)}
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}