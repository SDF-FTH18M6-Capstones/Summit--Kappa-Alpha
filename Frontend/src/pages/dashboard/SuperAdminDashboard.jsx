
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
  Eye,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";
// BACKEND DATA REQUIRED
// Replace these demo records with data from Flask.

// BACKEND NEEDED:
// GET /api/join-requests
// Expected response:
// [
//   {
//     id, full_name, email, phone_number,
//     message, status, created_at, chama_id
//   }
// ]
//
// Map Flask fields to the frontend names if necessary.
const initialRequests = [
  {
    id: 1,
    name: "Ann Stacia",
    email: "ann@example.com",
    position: "Member",
    phone: "0712345678",
    reason: "I would like to join and contribute monthly.",
    date: "12 Nov 2026",
  },
  {
    id: 2,
    name: "Rihanna Tanya",
    email: "rihanna@example.com",
    position: "Member",
    phone: "0723456789",
    reason: "I am interested in saving with this chama.",
    date: "13 Nov 2026",
  },
];

// BACKEND NEEDED:
// GET /api/memberships?status=active
// Expected response:
const members = [
  { id: 1, name: "Ann Stacia" },
  { id: 2, name: "Rihanna Tanya" },
];

// BACKEND NEEDED:
// GET /api/audit-logs?limit=5
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

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [officials, setOfficials] = useState({
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

  const handleRequest = (id, decision) => {
    const confirmed = window.confirm(
      `Are you sure you want to ${decision} this join request?`
    );

    if (!confirmed) return;

    // BACKEND NEEDED:
    // PATCH /api/join-requests/${id}
    //
    // Send:
    // { "status": "approved" }
    // or
    // { "status": "rejected" }
    //
    // Flask should:
    // 1. Verify the logged-in user is a chama_admin.
    // 2. Check that the request belongs to this admin's chama.
    // 3. Update the join request status.
    // 4. If approved, create an active Membership record.
    // 5. Return the updated request.
    //
    // IMPORTANT:
    // Replace the demo state update with an Axios PATCH request.
    // Only update the UI after Flask confirms success.

    setRequests((current) =>
      current.filter((request) => request.id !== id)
    );

    setSelectedRequest(null);

    setMessage(
      `Join request ${decision} successfully (demo).`
    );
  };

  // =====================================================
  // ASSIGN OFFICIALS
  // =====================================================

  const handleOfficialChange = (event) => {
    const { name, value } = event.target;

    setOfficials((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveOfficials = (event) => {
    event.preventDefault();
    setMessage("");

    const selected = Object.values(officials);

    if (selected.some((id) => !id)) {
      setMessage("Please select both officials.");
      return;
    }

    if (new Set(selected).size !== selected.length) {
      setMessage(
        "The treasurer and secretary must be different members."
      );
      return;
    }

    // BACKEND NEEDED:
    // POST /api/officials
    //
    // Send:
    // {
    //   "treasurer_id": 1,
    //   "secretary_id": 2
    // }
    //
    // Flask should:
    // 1. Verify the logged-in user is a chama_admin.
    // 2. Verify both users are active members of this chama.
    // 3. Prevent assigning the same member to both positions.
    // 4. Save the official assignments.
    //
    // NOTE:
    // Your current Membership model does not necessarily have
    // official-position fields. You may need an Officials table
    // or another suitable way of storing these assignments.

    console.log("Officials:", officials);

    setMessage("Officials saved successfully (demo).");
  }

  const handleRuleChange = (event) => {
    const { name, value } = event.target;

    setRules((current) => ({
      ...current,
      [name]: value,
    }));
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
      !Number.isFinite(monthlyContribution) ||
      !Number.isFinite(maxLoan) ||
      !Number.isFinite(latePenalty) ||
      !Number.isFinite(dueDay) ||
      !Number.isFinite(interestRate) ||
      monthlyContribution <= 0 ||
      maxLoan <= 0 ||
      latePenalty < 0 ||
      dueDay < 1 ||
      dueDay > 31 ||
      !Number.isInteger(dueDay) ||
      interestRate < 0
    ) {
      setMessage("Please enter valid chama rule values.");
      return;
    }

    // BACKEND NEEDED:
    // PATCH /api/chama/rules
    //
    // Send:
    // {
    //   "monthly_contribution": 2000,
    //   "due_day": 5,
    //   "late_penalty": 100,
    //   "interest_rate": 5,
    //   "max_loan": 50000
    // }
    //
    // Flask should:
    // 1. Verify the logged-in user is a chama_admin.
    // 2. Verify the admin manages this chama.
    // 3. Validate the financial values again on the backend.
    // 4. Save the rules.
    //
    // IMPORTANT:
    // Your current ContributionTypes model contains fields such as
    // amount, due_day, grace_days and penalty_amount.
    // Loan interest and maximum loan may need a separate
    // ChamaSettings model or equivalent configuration.

    console.log("Chama rules:", rules);

    setMessage("Chama rules saved successfully (demo).");
  };

  return (
    <div className="space-y-7">

      {/* DASHBOARD HEADING
          No separate endpoint required. */}

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

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {/*
          BACKEND ENDPOINTS NEEDED:

          GET /api/memberships?status=active
          Used to calculate Total Members.

          GET /api/join-requests?status=pending
          Used to calculate Pending Requests.

          GET /api/loans?status=disbursed
          Used to calculate Outstanding Loans.
          Sum the unpaid loan balances.

          GET /api/contributions
          Used to calculate Total Contributions.
          Sum the contributions for this chama.

          All endpoints must return data belonging only to
          the chama managed by the logged-in admin.
      */}

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

      {/* 
          GET /api/join-requests?status=pending
          Retrieves pending applications.

          PATCH /api/join-requests/<id>
          Approves or rejects an application.

          The backend should create a Membership when an
          application is approved.
      */}

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
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => {
                            setSelectedRequest(request);
                            setMessage("");
                          }}
                        >
                          <Eye size={15} />
                          View
                        </ActionButton>

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/*
            ASSIGN OFFICIALS

            GET /api/memberships?status=active
            Loads active members into the dropdown.

            POST /api/officials
            Saves the Treasurer and Secretary assignments.

            Backend must verify that selected members belong
            to the admin's chama.*/}

        <Panel title="Assign Officials">
          <p className="mb-5 text-sm text-gray-500">
            Select members to serve in the chama leadership positions.
          </p>

          <form
            onSubmit={saveOfficials}
            className="space-y-4"
          >
            {[
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
                      disabled={Object.entries(officials).some(
                        ([key, id]) =>
                          key !== role.name &&
                          String(id) === String(member.id)
                      )}
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

        {/* 
            CHAMA RULES

            GET /api/chama/rules
            Loads the existing financial settings.

            PATCH /api/chama/rules
            Saves updated settings.

            Check the Flask models before implementing this:
            ContributionTypes already stores contribution amount,
            due day, grace days and penalty amount.
            Interest rate and maximum loan may need additional
            chama settings fields or a separate model. */}

        <Panel title="Chama Rules">
          <p className="mb-5 text-sm text-gray-500">
            Set the financial rules that apply to all members.
          </p>

          <form
            onSubmit={saveRules}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Monthly Contribution (KES)",
                  name: "monthlyContribution",
                  placeholder: "e.g. 2000",
                  min: "1",
                },
                {
                  label: "Contribution Due Day",
                  name: "dueDay",
                  placeholder: "1 - 31",
                  min: "1",
                  max: "31",
                },
                {
                  label: "Late Penalty (KES)",
                  name: "latePenalty",
                  placeholder: "e.g. 100",
                  min: "0",
                },
                {
                  label: "Loan Interest Rate (%)",
                  name: "interestRate",
                  placeholder: "e.g. 5",
                  min: "0",
                  step: "0.01",
                },
                {
                  label: "Maximum Loan (KES)",
                  name: "maxLoan",
                  placeholder: "e.g. 50000",
                  min: "1",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>

                  <input
                    name={field.name}
                    type="number"
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

      {/*
          RECENT AUDIT ACTIVITY

          GET /api/audit-logs?limit=5

          Backend should return the latest actions performed
          within this chama, including the official's name,
          action, and timestamp. */}

      <Panel
        title="Recent Audit Activity"
        action={
          <ClipboardList
            size={20}
            className="text-green-800"
          />
        }
      >
        {auditRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No administrative activity has been recorded yet.
          </p>
        ) : (
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
        )}
      </Panel>

      {/*
          JOIN REQUEST DETAILS MODAL

          No separate endpoint is required to open this modal.
          It displays the selected request already loaded from
          GET /api/join-requests.

          Approve and Reject use:
          PATCH /api/join-requests/<id> */}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-request-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="join-request-title"
                className="text-xl font-bold text-gray-900"
              >
                Join Request Details
              </h2>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close join request details"
                className="text-gray-500 hover:text-gray-800"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Full Name
                </label>

                <input
                  value={selectedRequest.name}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>

                <input
                  value={selectedRequest.email}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number
                </label>

                <input
                  value={selectedRequest.phone}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason for Joining
                </label>

                <textarea
                  value={selectedRequest.reason}
                  readOnly
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleRequest(selectedRequest.id, "rejected")
                  }
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleRequest(selectedRequest.id, "approved")
                  }
                  className="rounded-lg bg-green-900 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
