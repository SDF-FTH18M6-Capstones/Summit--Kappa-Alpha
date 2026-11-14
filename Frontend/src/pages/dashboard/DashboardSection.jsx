
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  StatCard,
  Panel,
  DataTable,
  StatusBadge,
} from "./DashboardShared";

import {
  Users,
  Wallet,
  HandCoins,
  CalendarDays,
  FileText,
  ClipboardList,
  Receipt,
  Megaphone,
  ShieldCheck,
  Building2,
} from "lucide-react";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const pageTitles = {
  members: "Members",
  contributions: "Contributions",
  chamas: "Chamas",
  reports: "Reports",
  records: "Records",
  settings: "Settings",
  loans: "Loans",
  penalties: "Penalties",
  meetings: "Meetings",
  minutes: "Minutes",
  announcements: "Announcements",
  officials: "Officials",
  "join-requests": "Join Requests",
  "chama-rules": "Chama Rules",
  administrators: "Administrators",
  organizations: "Organizations",
  users: "Users",
  "audit-logs": "Audit Logs",
  news: "News",
  "member-register": "Member Register",
};

const rolePermissions = {
  superadmin: [
    "administrators",
    "organizations",
    "users",
    "reports",
    "audit-logs",
    "settings",
  ],
  chama_admin: [
    "join-requests",
    "members",
    "officials",
    "chama-rules",
    "reports",
  ],
  treasurer: [
    "contributions",
    "loans",
    "penalties",
    "members",
    "reports",
  ],
  secretary: [
    "meetings",
    "minutes",
    "announcements",
    "member-register",
  ],
  member: [
    "loans",
    "meetings",
    "news",
    "contributions",
  ],
};

// DEMO DATA
const demoMembers = [
  { id: 1, name: "Ann Stacia", email: "ann@example.com", phone: "0712345678", status: "Active" },
  { id: 2, name: "Rihanna Tanya", email: "rihanna@example.com", phone: "0723456789", status: "Active" },
  { id: 3, name: "Mary Wanjiku", email: "mary@example.com", phone: "0734567890", status: "Pending" },
];

const demoContributions = [
  { id: 1, member: "Ann Stacia", amount: "KES 2,000", mpesa: "QWE123456", date: "13 Nov 2026", status: "Paid" },
  { id: 2, member: "Rihanna Tanya", amount: "KES 2,000", mpesa: "RTY234567", date: "12 Nov 2026", status: "Paid" },
  { id: 3, member: "Mary Wanjiku", amount: "KES 2,000", mpesa: "—", date: "—", status: "Pending" },
];

const demoLoans = [
  { id: 1, member: "Ann Stacia", amount: "KES 20,000", purpose: "Business", date: "10 Nov 2026", status: "Pending" },
  { id: 2, member: "Rihanna Tanya", amount: "KES 15,000", purpose: "School fees", date: "08 Nov 2026", status: "Approved" },
];

const demoMeetings = [
  { id: 1, title: "Monthly Chama Meeting", date: "20 Nov 2026", venue: "Community Hall", status: "Upcoming" },
  { id: 2, title: "Annual General Meeting", date: "30 Nov 2026", venue: "Main Hall", status: "Upcoming" },
];

const demoRequests = [
  { id: 1, name: "Jane Wanjiku", email: "jane@example.com", phone: "0711111111", date: "13 Nov 2026", status: "Pending" },
  { id: 2, name: "Peter Kamau", email: "peter@example.com", phone: "0722222222", date: "12 Nov 2026", status: "Pending" },
];

const demoOfficials = [
  { id: 1, name: "Ann Stacia", position: "Treasurer", status: "Active" },
  { id: 2, name: "Rihanna Tanya", position: "Secretary", status: "Active" },
];

const demoPenalties = [
  { id: 1, member: "Mary Wanjiku", reason: "Late monthly contribution", amount: "KES 100", date: "10 Nov 2026", status: "Pending" },
  { id: 2, member: "Peter Kamau", reason: "Missed contribution", amount: "KES 200", date: "08 Nov 2026", status: "Paid" },
];

function PageStats({ items }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <StatCard
          key={item.title}
          title={item.title}
          value={item.value}
          description={item.description}
          icon={item.icon}
        />
      ))}
    </div>
  );
}

function RecordsTable({ columns, data, emptyMessage }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage={emptyMessage}
    />
  );
}

function SectionContent({ section }) {
  switch (section) {
    case "members":
    case "member-register":
      return (
        <>
          <PageStats items={[
            { title: "Total Members", value: "120", description: "Registered members", icon: Users },
            { title: "Active Members", value: "115", description: "Currently active", icon: ShieldCheck },
            { title: "Pending Members", value: "5", description: "Awaiting approval", icon: ClipboardList },
          ]} />
          <Panel title="Member Register">
            <RecordsTable
              data={demoMembers}
              columns={[
                { key: "name", label: "Full Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        </>
      );

    case "contributions":
      return (
        <>
          <PageStats items={[
            { title: "Total Contributions", value: "KES 450,000", description: "All recorded payments", icon: Wallet },
            { title: "Payments Received", value: "95", description: "Successful payments", icon: Receipt },
            { title: "Pending Payments", value: "25", description: "Awaiting payment", icon: ClipboardList },
          ]} />
          <Panel title="Contribution Records">
            <RecordsTable
              data={demoContributions}
              columns={[
                { key: "member", label: "Member" },
                { key: "amount", label: "Amount" },
                { key: "mpesa", label: "M-Pesa Code" },
                { key: "date", label: "Payment Date" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        </>
      );

    case "loans":
      return (
        <>
          <PageStats items={[
            { title: "Total Loans", value: "KES 180,000", description: "Loan portfolio", icon: HandCoins },
            { title: "Pending Applications", value: "8", description: "Awaiting review", icon: ClipboardList },
            { title: "Approved Loans", value: "12", description: "Approved applications", icon: ShieldCheck },
          ]} />
          <Panel title="Loan Applications">
            <RecordsTable
              data={demoLoans}
              columns={[
                { key: "member", label: "Applicant" },
                { key: "amount", label: "Loan Amount" },
                { key: "purpose", label: "Purpose" },
                { key: "date", label: "Application Date" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        </>
      );

    case "join-requests":
      return (
        <Panel title="Membership Applications">
          <RecordsTable
            data={demoRequests}
            columns={[
              { key: "name", label: "Applicant" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "date", label: "Application Date" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      );

    case "officials":
      return (
        <Panel title="Chama Leadership">
          <RecordsTable
            data={demoOfficials}
            columns={[
              { key: "name", label: "Official" },
              { key: "position", label: "Position" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      );

    case "penalties":
      return (
        <Panel title="Penalty Records">
          <RecordsTable
            data={demoPenalties}
            columns={[
              { key: "member", label: "Member" },
              { key: "reason", label: "Reason" },
              { key: "amount", label: "Amount" },
              { key: "date", label: "Date Applied" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      );

    case "meetings":
      return (
        <Panel title="Scheduled Meetings">
          <RecordsTable
            data={demoMeetings}
            columns={[
              { key: "title", label: "Meeting" },
              { key: "date", label: "Date" },
              { key: "venue", label: "Venue" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      );

    case "minutes":
      return (
        <Panel title="Meeting Minutes">
          <p className="text-sm text-gray-600">
            Meeting minutes and uploaded documents will appear here.
          </p>
        </Panel>
      );

    case "announcements":
    case "news":
      return (
        <Panel title="Announcements and News">
          <p className="text-sm text-gray-600">
            Chama announcements and news updates will appear here.
          </p>
        </Panel>
      );

    case "chama-rules":
      return (
        <Panel title="Chama Financial Rules">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Monthly Contribution", "KES 2,000"],
              ["Contribution Due Day", "5th of every month"],
              ["Late Payment Penalty", "KES 100"],
              ["Loan Interest Rate", "5%"],
              ["Maximum Loan", "KES 50,000"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-2 font-bold text-green-950">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            These are demonstration values, not saved backend settings.
          </p>
        </Panel>
      );

    case "reports":
      return (
        <>
          <PageStats items={[
            { title: "Total Contributions", value: "KES 450,000", description: "Recorded contributions", icon: Wallet },
            { title: "Outstanding Loans", value: "KES 85,000", description: "Unpaid loan balances", icon: HandCoins },
            { title: "Registered Members", value: "120", description: "Current membership", icon: Users },
          ]} />
          <Panel title="Reports">
            <p className="text-sm text-gray-600">
              Financial, contribution, loan and membership reports will be available here.
            </p>
          </Panel>
        </>
      );

    case "administrators":
      return (
        <Panel title="System Administrators">
          <p className="text-sm text-gray-600">
            Administrator accounts and role assignments will appear here.
          </p>
        </Panel>
      );

    case "organizations":
    case "chamas":
      return (
        <Panel title="Organizations">
          <div className="flex items-center gap-3">
            <Building2 className="text-green-800" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Summit Chama</p>
              <p className="text-sm text-gray-500">Registered organization</p>
            </div>
          </div>
        </Panel>
      );

    case "users":
      return (
        <Panel title="System Users">
          <RecordsTable
            data={demoMembers}
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </Panel>
      );

    case "audit-logs":
      return (
        <Panel title="System Audit Logs">
          <p className="text-sm text-gray-600">
            Administrative actions and system activity will appear here.
          </p>
        </Panel>
      );

    case "settings":
      return (
        <Panel title="System Settings">
          <p className="text-sm text-gray-600">
            System configuration and account preferences will appear here.
          </p>
        </Panel>
      );

    default:
      return (
        <Panel title="Records">
          <p className="text-sm text-gray-600">
            No content has been configured for this section yet.
          </p>
        </Panel>
      );
  }
}

export default function DashboardSection() {
  const { section } = useParams();
  const { user } = useAuth();

  const title = pageTitles[section];

  const role = normalizeRole(
    user?.role ||
    user?.role_name ||
    user?.user?.role ||
    user?.membership?.role
  );

  if (!title) {
    return (
      <Panel title="Page Not Found">
        <p className="text-gray-600">
          The page you are looking for does not exist.
        </p>
      </Panel>
    );
  }

  const allowedSections = rolePermissions[role] || [];

  if (!allowedSections.includes(section)) {
    return (
      <Panel title="Access Denied">
        <p className="text-gray-600">
          You do not have permission to access {title}.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block font-semibold text-green-800 hover:underline"
        >
          Return to your dashboard
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-800">
          Summit Chama / Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and view your {title.toLowerCase()} information.
        </p>
      </div>

      <SectionContent section={section} />
    </div>
  );
}


