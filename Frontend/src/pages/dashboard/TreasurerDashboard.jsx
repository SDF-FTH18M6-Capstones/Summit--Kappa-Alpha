import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  HandCoins,
  AlertTriangle,
  Receipt,
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

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const chamaId = user?.chama_id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({
    total_contributions: 0,
    outstanding_loans_balance: 0,
    unpaid_penalties: 0,
  });

  const [members, setMembers] = useState([]);
  const [contributionTypes, setContributionTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [defaulters, setDefaulters] = useState([]);

  const [paymentForm, setPaymentForm] = useState({
    membership_id: "",
    purpose: "Monthly contribution",
    contribution_type_id: "",
    loan_id: "",
    penalty_id: "",
    amount: "",
    mpesa_code: "",
    paid_at: new Date().toISOString().split("T")[0],
  });

  const [penaltyForm, setPenaltyForm] = useState({
    membership_id: "",
    amount: "",
    reason: "",
    date_applied: new Date().toISOString().split("T")[0],
  });

  const showFeedback = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 4500);
  };

  const fetchTreasurerData = useCallback(async () => {
    if (!chamaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [
        summaryRes,
        membersRes,
        typesRes,
        contribRes,
        reqLoansRes,
        appLoansRes,
        penaltiesRes,
      ] = await Promise.all([
        axiosClient.get(`/chamas/${chamaId}/financial-summary`),
        axiosClient.get(`/chamas/${chamaId}/memberships`, {
          params: { status: "active", per_page: 100 },
        }),
        axiosClient.get(`/chamas/${chamaId}/contribution-types`),
        axiosClient.get(`/chamas/${chamaId}/contributions`, {
          params: { per_page: 15 },
        }),
        axiosClient.get(`/chamas/${chamaId}/loans`, {
          params: { status: "requested", per_page: 50 },
        }),
        axiosClient.get(`/chamas/${chamaId}/loans`, {
          params: { status: "approved", per_page: 100 },
        }),
        axiosClient.get(`/chamas/${chamaId}/penalties`, {
          params: { status: "unpaid", per_page: 50 },
        }),
      ]);

      const typesList = Array.isArray(typesRes.data) ? typesRes.data : [];
      setSummary(summaryRes.data || {});
      setMembers(membersRes.data?.items || []);
      setContributionTypes(typesList);
      setTransactions(contribRes.data?.contributions || []);
      setPendingLoans(reqLoansRes.data?.items || []);
      setActiveLoans(appLoansRes.data?.items || []);
      setDefaulters(penaltiesRes.data?.items || []);

      if (typesList.length > 0) {
        setPaymentForm((prev) => ({
          ...prev,
          contribution_type_id: prev.contribution_type_id || String(typesList[0].id),
          amount: prev.amount || String(typesList[0].amount),
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chamaId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchTreasurerData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchTreasurerData]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.membership_id && paymentForm.purpose !== "Loan repayment") {
      setError("Please select a member.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const isoDate = `${paymentForm.paid_at}T12:00:00Z`;
      const cleanCode = paymentForm.mpesa_code.trim().toUpperCase();

      if (paymentForm.purpose === "Monthly contribution") {
        if (!paymentForm.contribution_type_id) {
          setError("Please create or select a contribution rule first.");
          setSubmitting(false);
          return;
        }
        await axiosClient.post(`/chamas/${chamaId}/contributions`, {
          membership_id: Number(paymentForm.membership_id),
          contribution_type_id: Number(paymentForm.contribution_type_id),
          amount: Number(paymentForm.amount),
          mpesa_code: cleanCode,
          paid_at: isoDate,
        });
        showFeedback("M-Pesa contribution recorded successfully.");
      } else if (paymentForm.purpose === "Loan repayment") {
        if (!paymentForm.loan_id) {
          setError("Please select an active loan to record repayment against.");
          setSubmitting(false);
          return;
        }
        await axiosClient.post(`/loans/${paymentForm.loan_id}/repayments`, {
          amount: Number(paymentForm.amount),
          mpesa_code: cleanCode,
          paid_at: isoDate,
        });
        showFeedback("Loan repayment recorded successfully.");
      } else if (paymentForm.purpose === "Penalty payment") {
        if (!paymentForm.penalty_id) {
          setError("Please select the unpaid penalty being settled.");
          setSubmitting(false);
          return;
        }
        await axiosClient.patch(`/penalties/${paymentForm.penalty_id}/pay`);
        showFeedback("Penalty marked as paid.");
      }

      setPaymentForm((prev) => ({
        ...prev,
        mpesa_code: "",
        loan_id: "",
        penalty_id: "",
      }));
      await fetchTreasurerData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoanAction = async (loanId, decision, borrowerName) => {
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.patch(`/loans/${loanId}/decision`, {
        status: decision,
      });
      showFeedback(
        `Loan request for ${borrowerName} has been ${decision} and borrower notified via email.`
      );
      await fetchTreasurerData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPenalty = async (e) => {
    e.preventDefault();
    if (!penaltyForm.membership_id) {
      setError("Please select a member to penalize.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await axiosClient.post(`/chamas/${chamaId}/penalties`, {
        membership_id: Number(penaltyForm.membership_id),
        amount: Number(penaltyForm.amount),
        reason: penaltyForm.reason.trim(),
        date_applied: penaltyForm.date_applied,
      });
      setPenaltyForm({
        membership_id: "",
        amount: "",
        reason: "",
        date_applied: new Date().toISOString().split("T")[0],
      });
      showFeedback("Penalty applied successfully.");
      await fetchTreasurerData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">Chama Treasury</p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Welcome back, {user?.full_name || "Treasurer"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Record M-Pesa payments, review loan requests, and manage penalties.
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
          title="Total Contributions"
          value={
            loading ? "..." : formatCurrency(summary.total_contributions || 0)
          }
          icon={Wallet}
        />
        <StatCard
          title="Outstanding Loans"
          value={
            loading
              ? "..."
              : formatCurrency(summary.outstanding_loans_balance || 0)
          }
          icon={HandCoins}
        />
        <StatCard
          title="Pending Loan Requests"
          value={loading ? "..." : pendingLoans.length}
          icon={AlertTriangle}
        />
        <StatCard
          title="Unpaid Penalties"
          value={loading ? "..." : formatCurrency(summary.unpaid_penalties || 0)}
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Record M-Pesa Payment">
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Payment Purpose
              <select
                value={paymentForm.purpose}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, purpose: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              >
                <option value="Monthly contribution">Monthly contribution</option>
                <option value="Loan repayment">Loan repayment</option>
                <option value="Penalty payment">Penalty payment</option>
              </select>
            </label>

            {paymentForm.purpose !== "Loan repayment" && (
              <label className="block text-xs font-semibold text-gray-600">
                Member
                <select
                  value={paymentForm.membership_id}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      membership_id: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                >
                  <option value="">Select Member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.member_number})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {paymentForm.purpose === "Monthly contribution" && (
              <label className="block text-xs font-semibold text-gray-600">
                Contribution Rule
                <select
                  value={paymentForm.contribution_type_id}
                  onChange={(e) => {
                    const selected = contributionTypes.find(
                      (t) => String(t.id) === e.target.value
                    );
                    setPaymentForm({
                      ...paymentForm,
                      contribution_type_id: e.target.value,
                      amount: selected
                        ? String(selected.amount)
                        : paymentForm.amount,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                >
                  <option value="">Select Rule</option>
                  {contributionTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (KES {Number(t.amount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {paymentForm.purpose === "Loan repayment" && (
              <label className="block text-xs font-semibold text-gray-600">
                Active Loan
                <select
                  value={paymentForm.loan_id}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, loan_id: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                >
                  <option value="">Select Approved Loan</option>
                  {activeLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.member_name} — Balance: KES{" "}
                      {Number(
                        loan.remaining_balance ?? loan.principal
                      ).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {paymentForm.purpose === "Penalty payment" && (
              <label className="block text-xs font-semibold text-gray-600">
                Unpaid Penalty
                <select
                  value={paymentForm.penalty_id}
                  onChange={(e) => {
                    const penalty = defaulters.find(
                      (p) => String(p.id) === e.target.value
                    );
                    setPaymentForm({
                      ...paymentForm,
                      penalty_id: e.target.value,
                      amount: penalty
                        ? String(penalty.amount)
                        : paymentForm.amount,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                >
                  <option value="">Select Unpaid Penalty</option>
                  {defaulters.map((penalty) => (
                    <option key={penalty.id} value={penalty.id}>
                      {penalty.member_name} — KES{" "}
                      {Number(penalty.amount).toLocaleString()} ({penalty.reason})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {paymentForm.purpose !== "Penalty payment" && (
              <>
                <label className="block text-xs font-semibold text-gray-600">
                  Amount (KES)
                  <input
                    type="number"
                    min="1"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  Date Paid
                  <input
                    type="date"
                    value={paymentForm.paid_at}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        paid_at: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  M-Pesa Code (10 Characters)
                  <input
                    type="text"
                    maxLength="10"
                    placeholder="e.g. QWE123RTY4"
                    value={paymentForm.mpesa_code}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        mpesa_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase outline-none focus:border-green-800"
                    required
                  />
                </label>
              </>
            )}

            <ActionButton type="submit" loading={submitting}>
              Record Payment
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Recent M-Pesa Contributions" className="lg:col-span-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No M-Pesa contributions recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">M-Pesa Code</th>
                    <th className="px-3 py-3">Member</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-3 font-mono">{tx.mpesa_code}</td>
                      <td className="px-3 py-3">
                        {tx.member_name || `Member #${tx.membership_id}`}
                      </td>
                      <td className="px-3 py-3">
                        {tx.contribution_type_name || "Contribution"}
                      </td>
                      <td className="px-3 py-3">{formatCurrency(tx.amount)}</td>
                      <td className="px-3 py-3">
                        {tx.paid_at
                          ? new Date(tx.paid_at).toLocaleDateString("en-KE")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Pending Loan Requests" className="lg:col-span-2">
          {pendingLoans.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {loading ? "Loading loan requests..." : "No pending loan requests"}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {loan.member_name || `Member #${loan.membership_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(loan.principal)} · {loan.term_months} months
                      @ {loan.interest_rate}% — {loan.purpose || "General"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton
                      type="button"
                      loading={submitting}
                      onClick={() =>
                        handleLoanAction(loan.id, "approved", loan.member_name)
                      }
                    >
                      Approve
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="danger"
                      loading={submitting}
                      onClick={() =>
                        handleLoanAction(loan.id, "rejected", loan.member_name)
                      }
                    >
                      Reject
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Apply Penalty">
          <form onSubmit={handleApplyPenalty} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Member
              <select
                value={penaltyForm.membership_id}
                onChange={(e) =>
                  setPenaltyForm({
                    ...penaltyForm,
                    membership_id: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              >
                <option value="">Select Member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.member_number})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Penalty (KES)
              <input
                type="number"
                min="1"
                value={penaltyForm.amount}
                onChange={(e) =>
                  setPenaltyForm({ ...penaltyForm, amount: e.target.value })
                }
                placeholder="200"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Date Applied
              <input
                type="date"
                value={penaltyForm.date_applied}
                onChange={(e) =>
                  setPenaltyForm({
                    ...penaltyForm,
                    date_applied: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Reason
              <input
                type="text"
                value={penaltyForm.reason}
                onChange={(e) =>
                  setPenaltyForm({ ...penaltyForm, reason: e.target.value })
                }
                placeholder="e.g. Late monthly contribution"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <ActionButton type="submit" loading={submitting}>
              Apply Penalty
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Unpaid Penalties" className="lg:col-span-3">
          {defaulters.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {loading ? "Loading penalties..." : "No unpaid penalties right now"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">Member</th>
                    <th className="px-3 py-3">Reason</th>
                    <th className="px-3 py-3">Date Applied</th>
                    <th className="px-3 py-3">Penalty Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {defaulters.map((penalty) => (
                    <tr key={penalty.id}>
                      <td className="px-3 py-3">
                        {penalty.member_name ||
                          `Member #${penalty.membership_id}`}
                      </td>
                      <td className="px-3 py-3">{penalty.reason}</td>
                      <td className="px-3 py-3">{penalty.date_applied}</td>
                      <td className="px-3 py-3">
                        {formatCurrency(penalty.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}




