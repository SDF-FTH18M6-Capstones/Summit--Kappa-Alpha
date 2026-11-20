import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  Megaphone,
  Users,
  Trash2,
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

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const chamaId = user?.chama_id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [meetings, setMeetings] = useState([]);
  const [minutesList, setMinutesList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    date: "",
    time: "14:00",
    venue: "",
    agenda: "",
  });

  const [minutesForm, setMinutesForm] = useState({
    meeting_id: "",
    content: "",
    attachmentFile: null,
  });

  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [attendanceMeetingId, setAttendanceMeetingId] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });

  const showFeedback = (text) => {
    setError("");
    setMessage(text);
    setTimeout(() => setMessage(""), 4500);
  };

  const fetchSecretaryData = useCallback(async () => {
    if (!chamaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [meetingsRes, minutesRes, announcementsRes, membersRes] =
        await Promise.all([
          axiosClient.get(`/chamas/${chamaId}/meetings`, {
            params: { per_page: 50 },
          }),
          axiosClient.get(`/chamas/${chamaId}/minutes`, {
            params: { per_page: 50 },
          }),
          axiosClient.get(`/chamas/${chamaId}/announcements`, {
            params: { per_page: 50 },
          }),
          axiosClient.get(`/chamas/${chamaId}/memberships`, {
            params: { per_page: 100 },
          }),
        ]);

      setMeetings(meetingsRes.data?.items || []);
      setMinutesList(minutesRes.data?.items || []);
      setAnnouncements(announcementsRes.data?.items || []);
      setMembers(membersRes.data?.items || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [chamaId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchSecretaryData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSecretaryData]);

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const meetingDateIso = `${meetingForm.date}T${meetingForm.time || "10:00"}:00Z`;
      await axiosClient.post(`/chamas/${chamaId}/meetings`, {
        title: meetingForm.title.trim(),
        meeting_date: meetingDateIso,
        venue: meetingForm.venue.trim() || null,
        agenda: meetingForm.agenda.trim() || null,
      });

      setMeetingForm({
        title: "",
        date: "",
        time: "14:00",
        venue: "",
        agenda: "",
      });
      showFeedback("Meeting scheduled successfully.");
      await fetchSecretaryData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMeeting = async (id) => {
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.delete(`/meetings/${id}`);
      showFeedback("Meeting removed.");
      await fetchSecretaryData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMinutes = async (e) => {
    e.preventDefault();
    if (!minutesForm.meeting_id) {
      setError("Please select a scheduled meeting first.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let uploadedFileUrl = null;

      if (minutesForm.attachmentFile) {
        const formData = new FormData();
        formData.append("file", minutesForm.attachmentFile);
        const uploadRes = await axiosClient.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedFileUrl = uploadRes.data?.url || null;
      }

      await axiosClient.post(`/meetings/${minutesForm.meeting_id}/minutes`, {
        minutes: minutesForm.content.trim(),
        file_url: uploadedFileUrl,
      });

      setMinutesForm({
        meeting_id: "",
        content: "",
        attachmentFile: null,
      });
      showFeedback("Meeting minutes saved and published to members.");
      await fetchSecretaryData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAttendanceMeeting = async (meetingId) => {
    setAttendanceMeetingId(meetingId);
    if (!meetingId) {
      setAttendanceMap({});
      return;
    }
    try {
      const res = await axiosClient.get(`/meetings/${meetingId}/attendance`);
      const existing = {};
      (res.data?.items || []).forEach((rec) => {
        existing[rec.membership_id] = rec.status;
      });
      setAttendanceMap(existing);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceMeetingId) {
      setError("Please select a meeting to record attendance.");
      return;
    }

    const records = members
      .filter((m) => m.status === "active")
      .map((m) => ({
        membership_id: m.id,
        status: attendanceMap[m.id] || "present",
      }));

    if (records.length === 0) {
      setError("No active members found to record attendance.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await axiosClient.post(`/meetings/${attendanceMeetingId}/attendance`, {
        records,
      });
      showFeedback(`Attendance saved for ${records.length} members.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.post(`/chamas/${chamaId}/announcements`, {
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
      });

      setAnnouncementForm({ title: "", content: "" });
      showFeedback("Announcement published to members.");
      await fetchSecretaryData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    setSubmitting(true);
    setError("");
    try {
      await axiosClient.delete(`/announcements/${id}`);
      showFeedback("Announcement deleted.");
      await fetchSecretaryData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const recordedMeetingIds = new Set(minutesList.map((m) => m.meeting_id));
  const availableMeetingsForMinutes = meetings.filter(
    (m) => !recordedMeetingIds.has(m.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">Chama Secretariat</p>
        <h1 className="mt-1 text-2xl font-bold text-green-950">
          Welcome back, {user?.full_name || "Secretary"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Schedule meetings, publish minutes, post announcements, and maintain member records.
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
          title="Scheduled Meetings"
          value={loading ? "..." : meetings.length}
          icon={CalendarDays}
        />
        <StatCard
          title="Recorded Minutes"
          value={loading ? "..." : minutesList.length}
          icon={BookOpen}
        />
        <StatCard
          title="Announcements"
          value={loading ? "..." : announcements.length}
          icon={Megaphone}
        />
        <StatCard
          title="Registered Members"
          value={loading ? "..." : members.length}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Schedule Meeting">
          <form onSubmit={handleScheduleMeeting} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Meeting Title
              <input
                type="text"
                placeholder="e.g. Monthly General Meeting"
                value={meetingForm.title}
                onChange={(e) =>
                  setMeetingForm({ ...meetingForm, title: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-gray-600">
                Date
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) =>
                    setMeetingForm({ ...meetingForm, date: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Time
                <input
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) =>
                    setMeetingForm({ ...meetingForm, time: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                  required
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-gray-600">
              Venue / Meeting Link
              <input
                type="text"
                placeholder="e.g. Nairobi Community Hall / Google Meet"
                value={meetingForm.venue}
                onChange={(e) =>
                  setMeetingForm({ ...meetingForm, venue: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Agenda
              <textarea
                rows="3"
                placeholder="Key items to discuss..."
                value={meetingForm.agenda}
                onChange={(e) =>
                  setMeetingForm({ ...meetingForm, agenda: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <ActionButton type="submit" loading={submitting}>
              Schedule Meeting
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Scheduled Meetings" className="lg:col-span-2">
          {meetings.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading ? "Loading meetings..." : "No meetings scheduled yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const date = meeting.meeting_date
                  ? new Date(meeting.meeting_date)
                  : null;
                return (
                  <div
                    key={meeting.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {date
                          ? `${date.toLocaleDateString("en-KE")} at ${date.toLocaleTimeString(
                              "en-KE",
                              { hour: "2-digit", minute: "2-digit" }
                            )}`
                          : "Date TBD"}{" "}
                        · {meeting.venue || "TBD"}
                      </p>
                      {meeting.agenda && (
                        <p className="mt-2 text-sm text-gray-600">
                          {meeting.agenda}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => deleteMeeting(meeting.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Delete Meeting"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Publish Meeting Minutes" className="lg:col-span-2">
          <form onSubmit={handleSaveMinutes} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600">
              Select Meeting
              <select
                value={minutesForm.meeting_id}
                onChange={(e) =>
                  setMinutesForm({ ...minutesForm, meeting_id: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              >
                <option value="">Choose a scheduled meeting</option>
                {availableMeetingsForMinutes.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title} (
                    {meeting.meeting_date
                      ? new Date(meeting.meeting_date).toLocaleDateString("en-KE")
                      : ""}
                    )
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Meeting Minutes & Resolutions
              <textarea
                rows="4"
                placeholder="Write discussions, resolutions, and action items..."
                value={minutesForm.content}
                onChange={(e) =>
                  setMinutesForm({ ...minutesForm, content: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Attach Signed PDF / Photo (Optional)
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) =>
                  setMinutesForm({
                    ...minutesForm,
                    attachmentFile: e.target.files?.[0] || null,
                  })
                }
                className="mt-1 w-full text-sm"
              />
            </label>
            {minutesForm.attachmentFile && (
              <p className="text-xs text-gray-500">
                Selected: {minutesForm.attachmentFile.name}
              </p>
            )}
            <ActionButton type="submit" loading={submitting}>
              Save & Publish Minutes
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Meeting Minutes">
          {minutesList.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading ? "Loading minutes..." : "No meeting minutes recorded yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {minutesList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMinutes(item)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.meeting_title || `Meeting #${item.meeting_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.meeting_date
                        ? new Date(item.meeting_date).toLocaleDateString("en-KE")
                        : "-"}
                    </p>
                  </div>
                  <Eye size={16} />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Publish Announcement">
          <form onSubmit={handlePublishAnnouncement} className="space-y-3">
            <input
              type="text"
              placeholder="Announcement Title"
              value={announcementForm.title}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  title: e.target.value,
                })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              required
            />
            <textarea
              rows="4"
              placeholder="Write announcement message..."
              value={announcementForm.content}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  content: e.target.value,
                })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
              required
            />
            <ActionButton type="submit" loading={submitting}>
              Publish Announcement
            </ActionButton>
          </form>
        </Panel>

        <Panel title="Announcements" className="lg:col-span-2">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading
                ? "Loading announcements..."
                : "No announcements published yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      Posted{" "}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-KE")
                        : "Today"}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">{item.content}</p>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => deleteAnnouncement(item.id)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Delete Announcement"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Record Meeting Attendance" className="lg:col-span-3">
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <label className="block text-xs font-semibold text-gray-600">
              Select Meeting
              <select
                value={attendanceMeetingId}
                onChange={(e) => handleSelectAttendanceMeeting(e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-800"
                required
              >
                <option value="">Choose a meeting</option>
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title}
                  </option>
                ))}
              </select>
            </label>
            {attendanceMeetingId && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                        <th className="px-3 py-3">Member No.</th>
                        <th className="px-3 py-3">Member Name</th>
                        <th className="px-3 py-3">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {members
                        .filter((member) => member.status === "active")
                        .map((member) => (
                          <tr key={member.id}>
                            <td className="px-3 py-3">
                              {member.member_number || "-"}
                            </td>
                            <td className="px-3 py-3">{member.full_name}</td>
                            <td className="px-3 py-3">
                              <select
                                value={attendanceMap[member.id] || "present"}
                                onChange={(e) =>
                                  setAttendanceMap({
                                    ...attendanceMap,
                                    [member.id]: e.target.value,
                                  })
                                }
                                className="rounded-lg border px-3 py-1.5 text-sm"
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="excused">Excused</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <ActionButton type="submit" loading={submitting}>
                  Save Attendance Roll-Call
                </ActionButton>
              </>
            )}
          </form>
        </Panel>

        <Panel title="Registered Members" className="lg:col-span-3">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {loading ? "Loading members..." : "No registered members found"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <th className="px-3 py-3">Member No.</th>
                    <th className="px-3 py-3">Full Name</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-3 py-3">
                        {member.member_number || "-"}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {member.full_name}
                      </td>
                      <td className="px-3 py-3">
                        {member.phone_number || "-"}
                      </td>
                      <td className="px-3 py-3">{member.email}</td>
                      <td className="px-3 py-3 capitalize">
                        {(member.role || "member").replace(/_/g, " ")}
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
    </div>
  );
}