
import { useState } from "react";
import {
  Wallet,
  HandCoins,
  CalendarDays,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  FileText,
  PlusCircle,
  Eye,
  X,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";

// DEMO DATA: Replace with the logged-in member's information from Flask.
const member = {
  name: "Jane Wanjiku",
  chama: "Summit Investment Chama",
  totalContributions: 45000,
  savingsBalance: 45000,
  outstandingLoan: 12000,
  penalties: 500,
};

const initialContributions = [
  {
    id: 1,
    mpesaCode: "QWE123ABC",
    amount: 2000,
    date: "2026-11-05",
    purpose: "Monthly contribution",
  },
  {
    id: 2,
    mpesaCode: "RTY456DEF",
    amount: 2000,
    date: "2026-10-05",
    purpose: "Monthly contribution",
  },
  {
    id: 3,
    mpesaCode: "UIO789GHI",
    amount: 3000,
    date: "2026-09-05",
    purpose: "Monthly contribution",
  },
  {
    id: 4,
    mpesaCode: "ABC456XYZ",
    amount: 1500,
    date: "2026-08-05",
    purpose: "Extra savings",
  },
];

const initialLoans = [
  {
    id: 1,
    amount: 20000,
    purpose: "Business expansion",
    date: "2026-09-10",
    status: "Active",
    balance: 12000,
    nextPayment: "2026-11-25",
  },
];

const upcomingMeetings = [
  {
    id: 1,
    title: "Monthly Chama Meeting",
    date: "2026-11-20",
    time: "10:00 AM",
    venue: "Community Hall",
  },
  {
    id: 2,
    title: "Annual General Meeting",
    date: "2026-12-05",
    time: "2:00 PM",
    venue: "Summit Conference Room",
  },
];

const announcements = [
  {
    id: 1,
    title: "Monthly Contributions Reminder",
    message: "Remember to make your monthly contribution before the 5th.",
    date: "2026-11-12",
  },
  {
    id: 2,
    title: "Upcoming Chama Meeting",
    message: "Our next monthly meeting will take place on 20 November.",
    date: "2026-11-10",
  },
];

const initialMinutes = [
  {
    id: 1,
    title: "Monthly Chama Meeting",
    date: "2026-10-20",
    attendance: 18,
    status: "Published",
    content:
      "Members discussed monthly contributions, financial progress and upcoming activities. The treasurer presented the financial report. Members agreed to continue making contributions before the monthly deadline.",
  },
  {
    id: 2,
    title: "Finance Review Meeting",
    date: "2026-09-15",
    attendance: 15,
    status: "Published",
    content:
      "The meeting reviewed financial records and outstanding contributions. Members agreed that reminders should be sent before the next payment deadline.",
  },
];

const money = (amount) =>
  `KES ${Number(amount).toLocaleString("en-KE")}`;

const DEMO_INTEREST_RATE = 10;

const getToday = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();

  return new Date(today.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function MemberDashboard() {
  const [contributions] = useState(initialContributions);
  const [loans] = useState(initialLoans);
  const [loanRequests, setLoanRequests] = useState([]);
  const [minutes] = useState(initialMinutes);

  const [loanForm, setLoanForm] = useState({
    amount: "",
    repaymentMonths: "3",
    purpose: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState(null);

  // Calculate loan repayment estimates automatically.
  const loanAmount = Number(loanForm.amount) || 0;
  const repaymentMonths = Number(loanForm.repaymentMonths) || 0;

  const interest = loanAmount * (DEMO_INTEREST_RATE / 100);
  const totalRepayable = loanAmount + interest;

  const monthlyInstallment =
    repaymentMonths > 0
      ? totalRepayable / repaymentMonths
      : 0;

  const activeLoan = loans.find(
    (loan) => loan.status === "Active"
  );

  // Handle loan application submission.
  const submitLoanRequest = (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const amount = Number(loanForm.amount);
    const months = Number(loanForm.repaymentMonths);
    const purpose = loanForm.purpose.trim();

    if (
      loanForm.amount.trim() === "" ||
      !Number.isFinite(amount)
    ) {
      setError("Please enter a valid loan amount.");
      return;
    }

    if (amount < 1000 || amount > 100000) {
      setError(
        "Loan amount must be between KES 1,000 and KES 100,000."
      );
      return;
    }

    if (!Number.isInteger(months) || months < 1) {
      setError("Please select a valid repayment period.");
      return;
    }

    if (purpose.length < 5) {
      setError(
        "Please provide a loan purpose of at least 5 characters."
      );
      return;
    }

    const hasPendingRequest = loanRequests.some(
      (request) => request.status === "Pending"
    );

    if (hasPendingRequest) {
      setError(
        "You already have a pending loan application. Please wait for a decision."
      );
      return;
    }

    const calculatedInterest =
      amount * (DEMO_INTEREST_RATE / 100);

    const calculatedTotal = amount + calculatedInterest;

    const newRequest = {
      id: Date.now(),
      amount,
      purpose,
      date: getToday(),
      repaymentMonths: months,
      interest: calculatedInterest,
      totalRepayable: calculatedTotal,
      monthlyInstallment: calculatedTotal / months,
      status: "Pending",
    };

    // DEMO: Add the application to local React state.
    // BACKEND: Connect this to POST /api/loans later.
    setLoanRequests((current) => [
      newRequest,
      ...current,
    ]);

    setLoanForm({
      amount: "",
      repaymentMonths: "3",
      purpose: "",
    });

    setMessage(
      "Your loan application has been submitted successfully."
    );
  };

  return (
    <div className="space-y-6">

      {/* Welcome section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-green-800">
            {member.chama}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-green-950">
            Welcome back, {member.name}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Here's an overview of your Chama account.
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-900">
          {member.name.charAt(0)}
        </div>
      </div>

      {/* Success message */}
      {message && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span className="flex items-center gap-2">
            <CheckCircle size={18} />
            {message}
          </span>

          <button
            type="button"
            onClick={() => setMessage("")}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Account statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Contributions"
          value={money(member.totalContributions)}
          description="Your total savings contributions"
          icon={Wallet}
        />

        <StatCard
          title="Savings Balance"
          value={money(member.savingsBalance)}
          description="Your current savings"
          icon={ArrowUpRight}
        />

        <StatCard
          title="Outstanding Loan"
          value={money(member.outstandingLoan)}
          description="Remaining loan balance"
          icon={HandCoins}
        />

        <StatCard
          title="Penalties"
          value={money(member.penalties)}
          description="Outstanding penalties"
          icon={AlertTriangle}
        />
      </div>

      {/* Loan information */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <Panel title="My Active Loan">
          {activeLoan ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">
                  Outstanding loan balance
                </p>

                <h2 className="mt-1 text-3xl font-bold text-green-950">
                  {money(activeLoan.balance)}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">
                    Original loan
                  </p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {money(activeLoan.amount)}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">
                    Next repayment
                  </p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {activeLoan.nextPayment}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle size={17} />
                Loan status: {activeLoan.status}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You currently have no active loans.
            </p>
          )}
        </Panel>

        <Panel title="Loan Application Status">
          {loanRequests.length > 0 ? (
            <div className="space-y-3">
              {loanRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {money(request.amount)}
                    </p>

                    <p className="text-xs text-gray-500">
                      {request.purpose}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Applied: {request.date}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You have no recent loan applications.
            </p>
          )}
        </Panel>

      </div>

      {/* Loan application form */}
      <Panel title="Apply for a Loan">

        <div className="mb-5 rounded-lg border border-green-100 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-900">
            <HandCoins size={21} />
            <h3 className="font-semibold">
              Loan Application
            </h3>
          </div>

          <p className="mt-1 text-sm text-green-800">
            Enter the amount you need and your preferred repayment period.
            Your estimated repayment will be calculated below.
          </p>
        </div>

        <form
          onSubmit={submitLoanRequest}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Loan Amount (KES)
              </label>

              <input
                type="number"
                name="amount"
                min="1000"
                max="100000"
                step="100"
                required
                value={loanForm.amount}
                onChange={(event) =>
                  setLoanForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="e.g. 15000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
              />

              <p className="mt-1 text-xs text-gray-400">
                Demo application range: KES 1,000–100,000.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Repayment Period
              </label>

              <select
                name="repaymentMonths"
                required
                value={loanForm.repaymentMonths}
                onChange={(event) =>
                  setLoanForm((current) => ({
                    ...current,
                    repaymentMonths: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              >
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="9">9 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>

          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Purpose of Loan
            </label>

            <textarea
              name="purpose"
              rows="3"
              required
              minLength={5}
              value={loanForm.purpose}
              onChange={(event) =>
                setLoanForm((current) => ({
                  ...current,
                  purpose: event.target.value,
                }))
              }
              placeholder="Explain why you are requesting this loan..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
            />
          </div>

          {/* Repayment estimate */}
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-4 font-semibold text-green-950">
              Estimated Loan Repayment
            </h3>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">
                  Loan amount
                </span>

                <span className="font-medium text-gray-800">
                  {money(loanAmount)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">
                  Interest ({DEMO_INTEREST_RATE}% flat)
                </span>

                <span className="font-medium text-gray-800">
                  {money(interest)}
                </span>
              </div>

              <div className="flex justify-between gap-3 border-t border-gray-100 pt-3">
                <span className="font-semibold text-gray-700">
                  Total repayable
                </span>

                <span className="font-bold text-green-900">
                  {money(totalRepayable)}
                </span>
              </div>

              <div className="flex justify-between gap-3 rounded-lg bg-green-50 p-3">
                <span className="font-medium text-green-900">
                  Monthly instalment
                </span>

                <span className="font-bold text-green-900">
                  {money(monthlyInstallment)}
                </span>
              </div>

            </div>

            <p className="mt-3 text-xs text-gray-500">
              This is an illustrative estimate using a 10% flat interest rate.
              The actual rate and approved repayment terms will be determined
              by your Chama's loan rules.
            </p>
          </div>

          {/* Native submit button */}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 px-5 py-3 font-semibold text-white transition hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
          >
            <PlusCircle size={18} />
            Submit Loan Application
          </button>

        </form>
      </Panel>

      {/* Contribution history */}
      <Panel title="My Contribution History">
        <p className="mb-4 text-sm text-gray-500">
          View your recorded contributions and M-Pesa transaction references.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">M-Pesa Code</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {contributions.map((contribution) => (
                <tr key={contribution.id}>
                  <td className="p-3 font-medium text-gray-800">
                    {contribution.mpesaCode}
                  </td>

                  <td className="p-3 font-semibold text-gray-800">
                    {money(contribution.amount)}
                  </td>

                  <td className="p-3">
                    {contribution.date}
                  </td>

                  <td className="p-3">
                    {contribution.purpose}
                  </td>

                  <td className="p-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Recorded
                    </span>
                  </td>
                </tr>
              ))}

              {contributions.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-5 text-center text-gray-500"
                  >
                    You have no recorded contributions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Upcoming meetings */}
      <Panel title="Upcoming Meetings">
        <div className="space-y-3">
          {upcomingMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-100 p-3 text-green-800">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800">
                    {meeting.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {meeting.date} · {meeting.time}
                  </p>

                  <p className="text-sm text-gray-500">
                    {meeting.venue}
                  </p>
                </div>
              </div>

              <span className="self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Upcoming
              </span>
            </div>
          ))}

          {upcomingMeetings.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              There are no upcoming meetings.
            </p>
          )}
        </div>
      </Panel>

      {/* Announcements */}
      <Panel title="Chama Announcements">
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-green-800" />

                <h3 className="font-semibold text-gray-800">
                  {announcement.title}
                </h3>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                {announcement.message}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                {announcement.date}
              </p>
            </div>
          ))}

          {announcements.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              There are no announcements at the moment.
            </p>
          )}
        </div>
      </Panel>

      {/* Meeting minutes */}
      <Panel title="Meeting Minutes">
        <p className="mb-4 text-sm text-gray-500">
          View published minutes and meeting records shared by your Secretary.
        </p>

        <div className="space-y-3">
          {minutes
            .filter((item) => item.status === "Published")
            .map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.date} · {item.attendance} attendees
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMinutes(item)}
                  className="flex items-center gap-2 self-start text-sm font-medium text-green-800 hover:underline sm:self-center"
                >
                  <Eye size={17} />
                  View Minutes
                </button>
              </div>
            ))}

          {minutes.filter((item) => item.status === "Published").length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">
              No published meeting minutes are available.
            </p>
          )}
        </div>
      </Panel>

      {/* Meeting minutes modal */}
      {selectedMinutes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">

            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-green-950">
                  Meeting Minutes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedMinutes.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMinutes(null)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Close meeting minutes"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p>
                <strong>Meeting Date:</strong>{" "}
                {selectedMinutes.date}
              </p>

              <p>
                <strong>Attendance:</strong>{" "}
                {selectedMinutes.attendance} members
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {selectedMinutes.status}
              </p>

              <div>
                <strong>Minutes:</strong>

                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 leading-6 text-gray-700">
                  {selectedMinutes.content}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <ActionButton
                type="button"
                onClick={() => setSelectedMinutes(null)}
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


