
import { useState } from "react";
import {
  Users,
  UserPlus,
  Wallet,
  HandCoins,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  ClipboardList,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";

// DEMO DATA: Replace with Flask API data later.
const initialRequests = [
  {
    id: 1,
    name: "Jane Wanjiku",
    position: "Member",
    phone: "0712345678",
    reason: "I would like to join and contribute monthly.",
    date: "12 Nov 2026",
  },
  {
    id: 2,
    name: "Peter Kamau",
    position: "Member",
    phone: "0723456789",
    reason: "I am interested in saving with this chama.",
    date: "13 Nov 2026",
  },
];

const members = [
  { id: 1, name: "Jane Wanjiku" },
  { id: 2, name: "Peter Kamau" },
  { id: 3, name: "Mary Njeri" },
  { id: 4, name: "David Otieno" },
];

const auditRecords = [
  {
    id: 1,
    official: "Admin",
    action: "Edited contribution record",
    date: "13 Nov 2026, 10:30 AM",
  },
  {
    id: 2,
    official: "Treasurer",
    action: "Approved loan",
    date: "12 Nov 2026, 02:15 PM",
  },
];

export default function AdminDashboard() {
  const [requests, setRequests] = useState(initialRequests);

  const [officials, setOfficials] = useState({
    chairperson: "",
    treasurer: "",
    secretary: "",
  });

  const [rules, setRules] = useState({
    monthlyContribution: "",
    dueDay: "",
    latePenalty: "",
    interestRate: "",
    maxLoan: "",
  });

  const [message, setMessage] = useState("");

  // Approve or reject a join request.
  const handleRequest = (id, decision) => {
    // BACKEND CONNECTION:
    // PATCH /api/join-requests/${id}
    // Send { status: decision } to Flask.

    setRequests((current) =>
      current.filter((request) => request.id !== id)
    );

    setMessage(`Join request ${decision} successfully (demo).`);
  };

  const handleOfficialChange = (event) => {
    const { name, value } = event.target;

    setOfficials((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRuleChange = (event) => {
    const { name, value } = event.target;

    setRules((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveOfficials = (event) => {
    event.preventDefault();
    setMessage("");

    const selected = Object.values(officials);

    if (selected.some((id) => !id)) {
      setMessage("Please select all three officials.");
      return;
    }

    if (new Set(selected).size !== selected.length) {
      setMessage("Each official must be a different member.");
      return;
    }

    // BACKEND CONNECTION:
    // POST /api/officials
    // Send the selected official IDs to Flask.

    console.log("Officials:", officials);
    setMessage("Officials saved successfully (demo).");
  };

  const saveRules = (event) => {
    event.preventDefault();
    setMessage("");

    const dueDay = Number(rules.dueDay);
    const interestRate = Number(rules.interestRate);
    const monthlyContribution = Number(rules.monthlyContribution);
    const maxLoan = Number(rules.maxLoan);
    const latePenalty = Number(rules.latePenalty);

    if (
      monthlyContribution <= 0 ||
      maxLoan <= 0 ||
      latePenalty < 0 ||
      dueDay < 1 ||
      dueDay > 31 ||
      interestRate < 0
    ) {
      setMessage("Please enter valid chama rule values.");
      return;
    }

    // BACKEND CONNECTION:
    // PATCH /api/chama/rules

    console.log("Chama rules:", rules);
    setMessage("Chama rules saved successfully (demo).");
  };

  return (
    <div className="space-y-7">

      {/* DASHBOARD HEADING */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-green-800">
            SUMMIT CHAMA / ADMINISTRATION
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your chama, members, officials and financial rules.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          13 November 2026
        </div>
      </div>

      {/* FEEDBACK MESSAGE */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Members"
          value="120"
          description="Registered chama members"
          icon={Users}
        />

        <StatCard
          title="Pending Requests"
          value={requests.length}
          description="Awaiting your approval"
          icon={UserPlus}
        />

        <StatCard
          title="Outstanding Loans"
          value="KES 85,000"
          description="Loans yet to be repaid"
          icon={HandCoins}
        />

        <StatCard
          title="Total Contributions"
          value="KES 450,000"
          description="Total contributions received"
          icon={Wallet}
        />
      </div>

      {/* JOIN REQUESTS */}
      <Panel
        title="Join Requests"
        action={
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {requests.length} Pending
          </span>
        }
      >
        {requests.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle
              size={35}
              className="mx-auto text-green-700"
            />
            <p className="mt-3 font-medium text-gray-800">
              All caught up!
            </p>
            <p className="mt-1 text-sm text-gray-500">
              There are no pending join requests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">
                        {request.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.position}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {request.phone}
                    </td>

                    <td className="max-w-xs px-4 py-4 text-gray-600">
                      {request.reason}
                    </td>

                    <td className="px-4 py-4 text-gray-500">
                      {request.date}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <ActionButton
                          onClick={() =>
                            handleRequest(request.id, "approved")
                          }
                        >
                          <CheckCircle size={15} />
                          Approve
                        </ActionButton>

                        <ActionButton
                          variant="danger"
                          onClick={() =>
                            handleRequest(request.id, "rejected")
                          }
                        >
                          <XCircle size={15} />
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

      {/* OFFICIALS AND RULES */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ASSIGN OFFICIALS */}
        <Panel title="Assign Officials">
          <p className="mb-5 text-sm text-gray-500">
            Select members to serve in the chama leadership positions.
          </p>

          <form onSubmit={saveOfficials} className="space-y-4">
            {[
              { label: "Chairperson", name: "chairperson" },
              { label: "Treasurer", name: "treasurer" },
              { label: "Secretary", name: "secretary" },
            ].map((role) => (
              <div key={role.name}>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {role.label}
                </label>

                <select
                  name={role.name}
                  value={officials[role.name]}
                  onChange={handleOfficialChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                  required
                >
                  <option value="">Select member</option>

                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                      disabled={
                        Object.entries(officials).some(
                          ([key, id]) =>
                            key !== role.name &&
                            String(id) === String(member.id)
                        )
                      }
                    >
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <ActionButton type="submit">
              Save Officials
            </ActionButton>
          </form>
        </Panel>

        {/* CHAMA RULES */}
        <Panel title="Chama Rules">
          <p className="mb-5 text-sm text-gray-500">
            Set the financial rules that apply to all members.
          </p>

          <form onSubmit={saveRules} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {[
                {
                  label: "Monthly Contribution (KES)",
                  name: "monthlyContribution",
                  placeholder: "e.g. 2000",
                  type: "number",
                  min: "1",
                },
                {
                  label: "Contribution Due Day",
                  name: "dueDay",
                  placeholder: "1 - 31",
                  type: "number",
                  min: "1",
                  max: "31",
                },
                {
                  label: "Late Penalty (KES)",
                  name: "latePenalty",
                  placeholder: "e.g. 100",
                  type: "number",
                  min: "0",
                },
                {
                  label: "Loan Interest Rate (%)",
                  name: "interestRate",
                  placeholder: "e.g. 5",
                  type: "number",
                  min: "0",
                  step: "0.01",
                },
                {
                  label: "Maximum Loan (KES)",
                  name: "maxLoan",
                  placeholder: "e.g. 50000",
                  type: "number",
                  min: "1",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>

                  <input
                    name={field.name}
                    type={field.type}
                    min={field.min}
                    max={field.max}
                    step={field.step || "1"}
                    value={rules[field.name]}
                    onChange={handleRuleChange}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
                    required
                  />
                </div>
              ))}
            </div>

            <ActionButton type="submit">
              <Settings size={16} />
              Save Chama Rules
            </ActionButton>
          </form>
        </Panel>
      </div>

      {/* AUDIT TRAIL */}
      <Panel
        title="Recent Audit Activity"
        action={
          <ClipboardList size={20} className="text-green-800" />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Official</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
              </tr>
            </thead>

            <tbody>
              {auditRecords.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-4 font-semibold text-gray-800">
                    {record.official}
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {record.action}
                  </td>

                  <td className="px-4 py-4 text-gray-500">
                    {record.date}
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

