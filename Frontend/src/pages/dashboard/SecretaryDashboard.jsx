
import { useState } from "react";
import {
  CalendarDays,
  Users,
  FileText,
  Megaphone,
  Plus,
  Eye,
  Trash2,
  Search,
  Upload,
  X,
} from "lucide-react";

import {
  StatCard,
  Panel,
  ActionButton,
} from "./DashboardShared";

// DEMO DATA: Replace with information from your Flask API later.
const initialMeetings = [
  {
    id: 1,
    title: "Monthly Chama Meeting",
    date: "2026-11-20",
    time: "10:00",
    venue: "Community Hall",
    agenda: "Monthly contributions, financial updates and member concerns.",
    status: "Upcoming",
  },
  {
    id: 2,
    title: "Annual General Meeting",
    date: "2026-12-05",
    time: "14:00",
    venue: "Summit Conference Room",
    agenda: "Annual reports, elections and planning for the coming year.",
    status: "Upcoming",
  },
];

const initialAnnouncements = [
  {
    id: 1,
    title: "Monthly Contributions Reminder",
    message: "Members are reminded to make their monthly contributions.",
    date: "2026-11-12",
  },
  {
    id: 2,
    title: "Upcoming Chama Meeting",
    message: "Our next monthly meeting will take place on 20 November.",
    date: "2026-11-10",
  },
];

const initialMembers = [
  {
    id: 1,
    name: "Jane Wanjiku",
    phone: "0712345678",
    email: "jane@example.com",
    joined: "2025-01-10",
    status: "Active",
  },
  {
    id: 2,
    name: "Peter Kamau",
    phone: "0723456789",
    email: "peter@example.com",
    joined: "2025-03-15",
    status: "Active",
  },
  {
    id: 3,
    name: "Mary Njeri",
    phone: "0734567890",
    email: "mary@example.com",
    joined: "2025-05-20",
    status: "Inactive",
  },
];

const initialMinutes = [
  {
    id: 1,
    title: "Monthly Chama Meeting",
    date: "2026-10-20",
    attendance: 18,
    content:
      "Members discussed monthly contributions, financial progress and upcoming activities. The treasurer presented the financial report. Members agreed to continue making contributions before the monthly deadline.",
    attachments: [],
    status: "Published",
  },
  {
    id: 2,
    title: "Finance Review Meeting",
    date: "2026-09-15",
    attendance: 15,
    content:
      "The meeting reviewed the financial records and outstanding contributions. Members agreed that reminders should be sent before the next payment deadline.",
    attachments: [],
    status: "Draft",
  },
];

const getToday = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();

  return new Date(today.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function SecretaryDashboard() {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [members] = useState(initialMembers);
  const [minutes, setMinutes] = useState(initialMinutes);

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    date: "",
    time: "",
    venue: "",
    agenda: "",
    emailReminder: true,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    emailNotification: false,
  });

  const [minutesForm, setMinutesForm] = useState({
    title: "",
    date: "",
    attendance: "",
    content: "",
  });

  const [attachments, setAttachments] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState(null);

  const showSuccess = (text) => {
    setMessage(text);
    setError("");
  };

  const showError = (text) => {
    setError(text);
    setMessage("");
  };

  const scheduleMeeting = (event) => {
    event.preventDefault();

    if (
      !meetingForm.title.trim() ||
      !meetingForm.date ||
      !meetingForm.time ||
      !meetingForm.venue.trim() ||
      !meetingForm.agenda.trim()
    ) {
      showError("Please fill in all meeting details.");
      return;
    }

    if (meetingForm.date < getToday()) {
      showError("Please select today or a future date for the meeting.");
      return;
    }

    // BACKEND: POST /api/meetings
    // Send meeting details and email reminder preference.

    const newMeeting = {
      id: Date.now(),
      title: meetingForm.title.trim(),
      date: meetingForm.date,
      time: meetingForm.time,
      venue: meetingForm.venue.trim(),
      agenda: meetingForm.agenda.trim(),
      status: "Upcoming",
    };

    setMeetings((current) => [...current, newMeeting]);

    setMeetingForm({
      title: "",
      date: "",
      time: "",
      venue: "",
      agenda: "",
      emailReminder: true,
    });

    showSuccess("Meeting scheduled successfully.");
  };

  const viewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
  };

  const deleteMeeting = (id) => {
    const meeting = meetings.find((item) => item.id === id);

    if (!meeting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${meeting.title}"?`
    );

    if (!confirmed) return;

    // BACKEND: DELETE /api/meetings/${id}

    setMeetings((current) =>
      current.filter((item) => item.id !== id)
    );

    setSelectedMeeting(null);
    showSuccess("Meeting deleted successfully.");
  };

  const postAnnouncement = (event) => {
    event.preventDefault();

    if (
      !announcementForm.title.trim() ||
      !announcementForm.message.trim()
    ) {
      showError("Please enter an announcement title and message.");
      return;
    }

    // BACKEND: POST /api/announcements

    setAnnouncements((current) => [
      {
        id: Date.now(),
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        date: getToday(),
      },
      ...current,
    ]);

    setAnnouncementForm({
      title: "",
      message: "",
      emailNotification: false,
    });

    showSuccess("Announcement published successfully.");
  };
  const deleteAnnouncement = (id) => {
    const announcement = announcements.find(
      (item) => item.id === id
    );

    if (!announcement) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${announcement.title}"?`
    );

    if (!confirmed) return;

    // BACKEND: DELETE /api/announcements/${id}

    setAnnouncements((current) =>
      current.filter((item) => item.id !== id)
    );

    showSuccess("Announcement removed successfully.");
  };

  const handleAttachments = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const allowedFiles = selectedFiles.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");

      return isPdf || isImage;
    });

    if (allowedFiles.length !== selectedFiles.length) {
      showError("Only PDF files and images are allowed.");
    } else {
      setError("");
    }

    setAttachments((current) => [...current, ...allowedFiles]);
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const saveMinutes = (event) => {
    event.preventDefault();

    if (
      !minutesForm.title.trim() ||
      !minutesForm.date ||
      minutesForm.attendance === "" ||
      !minutesForm.content.trim()
    ) {
      showError("Please complete all meeting minutes details.");
      return;
    }

    const attendance = Number(minutesForm.attendance);

    if (!Number.isInteger(attendance) || attendance < 0) {
      showError("Attendance must be a valid non-negative whole number.");
      return;
    }

    // BACKEND: POST /api/meetings/minutes

    const newMinutes = {
      id: Date.now(),
      title: minutesForm.title.trim(),
      date: minutesForm.date,
      attendance,
      content: minutesForm.content.trim(),
      attachments: attachments.map((file) => file.name),
      status: "Draft",
    };

    setMinutes((current) => [newMinutes, ...current]);

    setMinutesForm({
      title: "",
      date: "",
      attendance: "",
      content: "",
    });

    setAttachments([]);

    showSuccess("Meeting minutes saved as a draft.");
  };

  const publishMinutes = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to publish these meeting minutes?"
    );

    if (!confirmed) return;

    // BACKEND: PATCH /api/meetings/minutes/${id}/publish

    setMinutes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "Published" }
          : item
      )
    );

    setSelectedMinutes(null);
    showSuccess("Meeting minutes published successfully.");
  };

  const filteredMembers = members.filter((member) =>
    `${member.name} ${member.phone} ${member.email}`
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">
          Chama Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Secretary Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage meetings, announcements, minutes and member records.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
            error
              ? "border-gray-300 bg-gray-50 text-gray-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <span>{error || message}</span>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setError("");
            }}
            className="ml-3 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Members"
          value={members.length}
          description="Registered Chama members"
          icon={Users}
        />

        <StatCard
          title="Upcoming Meetings"
          value={meetings.length}
          description="Scheduled meetings"
          icon={CalendarDays}
        />

        <StatCard
          title="Announcements"
          value={announcements.length}
          description="Published announcements"
          icon={Megaphone}
        />

        <StatCard
          title="Meeting Minutes"
          value={minutes.length}
          description="Saved meeting records"
          icon={FileText}
        />
      </div>

      <Panel title="Schedule a Meeting">
        <form onSubmit={scheduleMeeting} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Title
              </label>

              <input
                type="text"
                value={meetingForm.title}
                onChange={(e) =>
                  setMeetingForm({
                    ...meetingForm,
                    title: e.target.value,
                  })
                }
                placeholder="Enter meeting title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Venue
              </label>

              <input
                type="text"
                value={meetingForm.venue}
                onChange={(e) =>
                  setMeetingForm({
                    ...meetingForm,
                    venue: e.target.value,
                  })
                }
                placeholder="Enter venue"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Date
              </label>

              <input
                type="date"
                min={getToday()}
                value={meetingForm.date}
                onChange={(e) =>
                  setMeetingForm({
                    ...meetingForm,
                    date: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Time
              </label>

              <input
                type="time"
                value={meetingForm.time}
                onChange={(e) =>
                  setMeetingForm({
                    ...meetingForm,
                    time: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Meeting Agenda
            </label>

            <textarea
              rows="3"
              value={meetingForm.agenda}
              onChange={(e) =>
                setMeetingForm({
                  ...meetingForm,
                  agenda: e.target.value,
                })
              }
              placeholder="Enter the meeting agenda..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={meetingForm.emailReminder}
              onChange={(e) =>
                setMeetingForm({
                  ...meetingForm,
                  emailReminder: e.target.checked,
                })
              }
              className="accent-green-800"
            />
            Send email reminders to members
          </label>

          <ActionButton type="submit">
            <span className="flex items-center gap-2">
              <Plus size={17} />
              Schedule Meeting
            </span>
          </ActionButton>
        </form>
      </Panel>

      <Panel title="Upcoming Meetings">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Meeting</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Venue</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {meetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td className="p-3 font-medium text-gray-800">
                    {meeting.title}
                  </td>

                  <td className="p-3">{meeting.date}</td>
                  <td className="p-3">{meeting.time}</td>
                  <td className="p-3">{meeting.venue}</td>

                  <td className="p-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      {meeting.status}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => viewMeeting(meeting)}
                        className="text-green-800 hover:text-green-950"
                        title="View meeting"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMeeting(meeting.id)}
                        className="text-gray-500 hover:text-red-700"
                        title="Delete meeting"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {meetings.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-5 text-center text-gray-500"
                  >
                    No meetings scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Post an Announcement">
        <form onSubmit={postAnnouncement} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Announcement Headline
            </label>

            <input
              type="text"
              value={announcementForm.title}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  title: e.target.value,
                })
              }
              placeholder="Enter announcement headline"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Announcement Message
            </label>

            <textarea
              rows="4"
              value={announcementForm.message}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  message: e.target.value,
                })
              }
              placeholder="Write your announcement..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={announcementForm.emailNotification}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  emailNotification: e.target.checked,
                })
              }
              className="accent-green-800"
            />
            Also send this announcement by email
          </label>

          <ActionButton type="submit">
            <span className="flex items-center gap-2">
              <Megaphone size={17} />
              Publish Announcement
            </span>
          </ActionButton>
        </form>
      </Panel>

      <Panel title="Recent Announcements">
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <h3 className="font-semibold text-gray-800">
                  {announcement.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {announcement.message}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Published: {announcement.date}
                </p>
              </div>

              <button
                type="button"
                onClick={() => deleteAnnouncement(announcement.id)}
                className="flex items-center gap-2 self-start text-sm font-medium text-gray-600 hover:text-red-700 sm:self-center"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          ))}

          {announcements.length === 0 && (
            <p className="py-5 text-center text-sm text-gray-500">
              No announcements have been published yet.
            </p>
          )}
        </div>
      </Panel>

      {/* Member register */}
      <Panel title="Member Register">
        <div className="relative mb-4 max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-green-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Member Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Date Joined</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td className="p-3 font-medium text-gray-800">
                    {member.name}
                  </td>

                  <td className="p-3">{member.phone}</td>
                  <td className="p-3">{member.email}</td>
                  <td className="p-3">{member.joined}</td>

                  <td className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-5 text-center text-gray-500"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Meeting Minutes Management">
        <form onSubmit={saveMinutes} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Title
              </label>

              <input
                type="text"
                value={minutesForm.title}
                onChange={(e) =>
                  setMinutesForm({
                    ...minutesForm,
                    title: e.target.value,
                  })
                }
                placeholder="Meeting title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meeting Date
              </label>

              <input
                type="date"
                value={minutesForm.date}
                onChange={(e) =>
                  setMinutesForm({
                    ...minutesForm,
                    date: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Number of Attendees
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={minutesForm.attendance}
                onChange={(e) =>
                  setMinutesForm({
                    ...minutesForm,
                    attendance: e.target.value,
                  })
                }
                placeholder="Enter attendance"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Meeting Minutes
            </label>

            <textarea
              rows="5"
              value={minutesForm.content}
              onChange={(e) =>
                setMinutesForm({
                  ...minutesForm,
                  content: e.target.value,
                })
              }
              placeholder="Write the meeting minutes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
            />
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Upload size={18} />
              Attach Minutes PDF or Meeting Photos
            </div>

            <input
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={handleAttachments}
              className="mt-3 block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-green-100 file:px-4 file:py-2 file:font-medium file:text-green-800"
            />

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-700">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="ml-3 text-gray-500 hover:text-red-700"
                      title="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-gray-400">
              Selected files are listed for this demo. Actual file storage
              will be connected to the backend later.
            </p>
          </div>

          <ActionButton type="submit">
            Save Minutes as Draft
          </ActionButton>
        </form>

        <div className="mt-6">
          <h3 className="mb-3 font-semibold text-gray-800">
            Saved Meeting Minutes
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Meeting</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {minutes.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium text-gray-800">
                      {item.title}
                    </td>

                    <td className="p-3">{item.date}</td>
                    <td className="p-3">{item.attendance}</td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "Published"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMinutes(item)}
                          className="flex items-center gap-1 text-green-800 hover:underline"
                          title="View minutes"
                        >
                          <Eye size={16} />
                          View
                        </button>

                        {item.status === "Draft" && (
                          <button
                            type="button"
                            onClick={() => publishMinutes(item.id)}
                            className="font-medium text-green-800 hover:underline"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {minutes.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-5 text-center text-gray-500"
                    >
                      No meeting minutes saved yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-green-950">
                  Meeting Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedMeeting.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p>
                <strong>Date:</strong> {selectedMeeting.date}
              </p>

              <p>
                <strong>Time:</strong> {selectedMeeting.time}
              </p>

              <p>
                <strong>Venue:</strong> {selectedMeeting.venue}
              </p>

              <div>
                <strong>Agenda:</strong>
                <p className="mt-1 whitespace-pre-wrap text-gray-600">
                  {selectedMeeting.agenda}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <ActionButton
                type="button"
                onClick={() => setSelectedMeeting(null)}
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}

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
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p>
                <strong>Meeting Date:</strong> {selectedMinutes.date}
              </p>

              <p>
                <strong>Attendance:</strong> {selectedMinutes.attendance} members
              </p>

              <p>
                <strong>Status:</strong> {selectedMinutes.status}
              </p>

              <div>
                <strong>Minutes:</strong>

                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 leading-6 text-gray-700">
                  {selectedMinutes.content}
                </p>
              </div>

              {selectedMinutes.attachments?.length > 0 && (
                <div>
                  <strong>Attachments:</strong>

                  <ul className="mt-2 list-inside list-disc text-gray-600">
                    {selectedMinutes.attachments.map((file, index) => (
                      <li key={`${file}-${index}`}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {selectedMinutes.status === "Draft" && (
                <ActionButton
                  type="button"
                  onClick={() => publishMinutes(selectedMinutes.id)}
                >
                  Publish Minutes
                </ActionButton>
              )}

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


