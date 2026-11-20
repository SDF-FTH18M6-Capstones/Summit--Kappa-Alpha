import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axiosClient.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setMessage(
        response.data?.message ||
          "If an account exists for that email address, a password reset link has been sent."
      );
      setEmail("");
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
            <Mail size={28} className="text-green-800" />
          </div>
          <h1 className="text-2xl font-bold text-green-950">
            Forgot Password?
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
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
            {loading ? "Sending..." : "Send Reset Instructions"}
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
