import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";
import PasswordInput from "../../components/PasswordInput";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Password reset token is missing. Please use the full link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosClient.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(
        response.data?.message ||
          "Your password has been reset successfully! You can now log in."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <LockKeyhole size={28} className="text-green-800" />
          </div>
          <h1 className="text-2xl font-bold text-green-950">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create a strong new password (at least 8 characters with uppercase, lowercase, number, and symbol).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              New Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Confirm New Password
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-900 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-green-800 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </section>
  );
}



