
import { useParams } from "react-router-dom";
import { Panel } from "./DashboardShared";

export default function DashboardSection() {
  const { section } = useParams();

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

  const title = pageTitles[section];

  if (!title) {
    return (
      <Panel title="Page Not Found">
        <p className="text-gray-600">
          The page you are looking for does not exist.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title={title}>
      <p className="text-gray-600">
        Welcome to the {title} section.
      </p>

      <p className="mt-2 text-sm text-gray-500">
        This section will be developed to match your Chama dashboard wireframe.
      </p>
    </Panel>
  );
}

