
import { useState } from "react";
import {
  Wallet,
  HandCoins,
  AlertTriangle,
  Clock,
  Smartphone,
  CheckCircle,
  Receipt,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";

// DEMO DATA: Replace with Flask API data later.
const initialTransactions = [
  {
    id: 1,
    member: "Jane Wanjiku",
    mpesaCode: "QWE123ABC",
    amount: 2000,
    date: "13 Nov 2026",
    purpose: "Monthly contribution",
  },
  {
    id: 2,
    member: "Peter Kamau",
    mpesaCode: "RTY456DEF",
    amount: 3000,
    date: "12 Nov 2026",
    purpose: "Monthly contribution",
  },
];

const initialLoanRequests = [
  {
    id: 1,
    member: "David Otieno",
    amount: 15000,
    period: "3 months",
    purpose: "School fees",
  },
  {
    id: 2,
    member: "Grace Akinyi",
    amount: 10000,
    period: "2 months",
    purpose: "Business expansion",
  },
];

const defaulters = [
  {
    id: 1,
    member: "Brian Mwangi",
    amount: 5000,
    daysLate: 12,
  },
  {
    id: 2,
    member: "Susan Wairimu",
    amount: 3000,
    daysLate: 7,
  },
  {
    id: 3,
    member: "Kevin Otieno",
    amount: 2000,
    daysLate: 5,
  },
];

const members = [
  { id: 1, name: "Jane Wanjiku" },
  { id: 2, name: "Peter Kamau" },
  { id: 3, name: "Mary Njeri" },
  { id: 4, name: "David Otieno" },
  { id: 5, name: "Grace Akinyi" },
  { id: 6, name: "Brian Mwangi" },
  { id: 7, name: "Susan Wairimu" },
  { id: 8, name: "Kevin Otieno" },
];

const formatCurrency = (amount) =>
  `KES ${Number(amount).toLocaleString("en-KE")}`;

export default function TreasurerDashboard() {
  const [transactions, setTransactions] = useState(
    initialTransactions
  );

  const [loanRequests, setLoanRequests] = useState(
    initialLoanRequests
  );

  const [contribution, setContribution] = useState({
    member: "",
    mpesaCode: "",
    amount: "",
    date: "2026-11-13",
    purpose: "Monthly contribution",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle changes in the contribution form.
  const handleContributionChange = (event) => {
    const { name, value } = event.target;

    setContribution((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Record an M-Pesa payment.
  const recordContribution = (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const member = members.find(
      (item) => String(item.id) === contribution.member
    );

    if (!member) {
      setError("Please select a member.");
      return;
    }

    const code = contribution.mpesaCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter the M-Pesa transaction code.");
      return;
    }

    // Prevent duplicate M-Pesa transaction codes.
    const duplicate = transactions.some(
      (transaction) =>
        transaction.mpesaCode.toUpperCase() === code
    );

    if (duplicate) {
      setError(
        "This M-Pesa transaction code has already been recorded."
      );
      return;
    }

    const amount = Number(contribution.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (!contribution.date) {
      setError("Please select the payment date.");
      return;
    }

    // BACKEND CONNECTION:
    // POST /api/contributions
    // Send member_id, mpesa_code, amount, date and purpose.
    // The Flask backend must also check duplicate M-Pesa codes.

    const newTransaction = {
      id: Date.now(),
      member: member.name,
      mpesaCode: code,
      amount,
      date: new Date(
        `${contribution.date}T00:00:00`
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      purpose: contribution.purpose,
    };

    setTransactions((current) => [
      newTransaction,
      ...current,
    ]);

    setContribution({
      member: "",
      mpesaCode: "",
      amount: "",
      date: "2026-11-13",
      purpose: "Monthly contribution",
    });

    setSuccess("M-Pesa payment recorded successfully (demo).");
  };

  // Approve or reject a loan request.
  const handleLoanRequest = (id, decision) => {
    // BACKEND CONNECTION:
    // PATCH /api/loans/${id}
    // Send { status: decision } to Flask.

    setLoanRequests((current) =>
      current.filter((request) => request.id !== id)
    );

    setSuccess(`Loan request ${decision} (demo).`);
    setError("");
  };

  // Calculate total recorded transactions for this demo.
  const totalContributions = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

  return (
    <div className="space-y-7">

      {/* DASHBOARD HEADING */}
      <div>
        <p className="text-sm font-semibold text-green-800">
          SUMMIT CHAMA / FINANCIAL MANAGEMENT
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Treasurer Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage M-Pesa contributions, loans, repayments and penalties.
        </p>
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Contributions"
          value={formatCurrency(totalContributions)}
          description="Recorded demo transactions"
          icon={Wallet}
        />

        <StatCard
          title="Outstanding Loans"
          value="KES 85,000"
          description="Loans yet to be repaid"
          icon={HandCoins}
        />

        <StatCard
          title="Defaulters"
          value={defaulters.length}
          description="Members with overdue payments"
          icon={AlertTriangle}
        />

        <StatCard
          title="Pending Loan Requests"
          value={loanRequests.length}
          description="Awaiting your decision"
          icon={Clock}
        />
      </div>

      {/* RECORD M-PESA CONTRIBUTION */}
      <Panel title="Record M-Pesa Contribution">
        <div className="mb-5 flex items-center gap-3 rounded-lg bg-green-50 p-4">
          <div className="rounded-lg bg-green-100 p-3">
            <Smartphone
              size={25}
              className="text-green-800"
            />
          </div>

          <div>
            <h3 className="font-semibold text-green-950">
              M-Pesa Payment Recording
            </h3>

            <p className="text-sm text-green-800">
              Enter the transaction details from the member's M-Pesa confirmation message.
            </p>
          </div>
        </div>

        <form
          onSubmit={recordContribution}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {/* MEMBER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Member
              </label>

              <select
                name="member"
                value={contribution.member}
                onChange={handleContributionChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                required
              >
                <option value="">Choose a member</option>

                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* M-PESA CODE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                M-Pesa Transaction Code
              </label>

              <input
                type="text"
                name="mpesaCode"
                value={contribution.mpesaCode}
                onChange={handleContributionChange}
                placeholder="e.g. QWE123ABC"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm uppercase outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Enter the code from the M-Pesa confirmation SMS.
              </p>
            </div>

            {/* AMOUNT */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Amount (KES)
              </label>

              <input
                type="number"
                name="amount"
                min="1"
                step="0.01"
                value={contribution.amount}
                onChange={handleContributionChange}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                required
              />
            </div>

            {/* DATE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Date
              </label>

              <input
                type="date"
                name="date"
                value={contribution.date}
                onChange={handleContributionChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                required
              />
            </div>

            {/* PURPOSE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Purpose
              </label>

              <select
                name="purpose"
                value={contribution.purpose}
                onChange={handleContributionChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
              >
                <option>Monthly contribution</option>
                <option>Loan repayment</option>
                <option>Penalty payment</option>
                <option>Other payment</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton type="submit">
              <Receipt size={17} />
              Record Payment
            </ActionButton>

            <p className="text-xs text-gray-500">
              Duplicate transaction codes will be rejected.
            </p>
          </div>
        </form>
      </Panel>

      {/* RECENT M-PESA TRANSACTIONS */}
      <Panel
        title="Recent M-Pesa Transactions"
        action={
          <span className="text-xs font-medium text-gray-500">
            {transactions.length} Records
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">M-Pesa Code</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-4 font-semibold text-gray-800">
                    {transaction.member}
                  </td>

                  <td className="px-4 py-4 font-mono text-gray-600">
                    {transaction.mpesaCode}
                  </td>

                  <td className="px-4 py-4 font-semibold text-green-800">
                    {formatCurrency(transaction.amount)}
                  </td>

                  <td className="px-4 py-4 text-gray-500">
                    {transaction.date}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {transaction.purpose}
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Recorded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* LOAN REQUESTS */}
      <Panel
        title="Pending Loan Requests"
        action={
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {loanRequests.length} Pending
          </span>
        }
      >
        {loanRequests.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No pending loan requests.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Repayment Period</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loanRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100"
                  >
                    <td className="px-4 py-4 font-semibold text-gray-800">
                      {request.member}
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-800">
                      {formatCurrency(request.amount)}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.period}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.purpose}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <ActionButton
                          onClick={() =>
                            handleLoanRequest(request.id, "approved")
                          }
                        >
                          Approve
                        </ActionButton>

                        <ActionButton
                          variant="danger"
                          onClick={() =>
                            handleLoanRequest(request.id, "rejected")
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

      {/* DEFAULTERS */}
      <Panel title="Members with Outstanding Payments">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Outstanding Amount</th>
                <th className="px-4 py-3 font-medium">Days Late</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {defaulters.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100"
                >
                  <td className="px-4 py-4 font-semibold text-gray-800">
                    {member.member}
                  </td>

                  <td className="px-4 py-4 text-gray-700">
                    {formatCurrency(member.amount)}
                  </td>

                  <td className="px-4 py-4 text-red-600">
                    {member.daysLate} days
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      Overdue
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}
