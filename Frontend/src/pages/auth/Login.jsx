
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    // Prevent the browser's default form submission
    event.preventDefault();

    console.log("================================");
    console.log("LOGIN BUTTON CLICKED");
    console.log("Form submission prevented.");
    console.log("Email entered:", formData.email);
    console.log("================================");

    setError("");
    setLoading(true);

    try {
      console.log("Sending login request to Flask backend...");

      const result = await login(
        formData.email.trim(),
        formData.password
      );

      console.log("LOGIN SUCCESSFUL!");
      console.log("Authenticated user:", result.user);
      console.log("Preparing to navigate to dashboard...");

      navigate("/dashboard", { replace: true });

      console.log("Navigation to dashboard triggered.");

    } catch (error) {
      console.error("LOGIN FAILED!");
      console.error("Error message:", error.message);
      console.error("Full login error:", error);

      setError(
        error.message || "Login failed. Please try again."
      );

    } finally {
      setLoading(false);
      console.log("Login request completed.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-800 outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100";

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">

        {/* Welcome section */}
        <div className="relative flex flex-col justify-center overflow-hidden bg-green-950 p-8 text-white md:p-12">
          <div className="relative z-10">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-green-300">
              Summit Chama
            </p>

            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              Welcome Back!
            </h1>

            <p className="mt-5 leading-7 text-green-100">
              Your financial growth journey continues here.
              Log in to manage your contributions, track your
              savings, view loan updates, and stay connected
              with your Chama community.
            </p>

            <div className="mt-10 rounded-xl border border-green-800 bg-green-900/70 p-6">
              <ShieldCheck size={30} className="mb-4 text-green-300" />

              <p className="text-lg font-semibold">
                Together We Grow
              </p>

              <p className="mt-2 text-sm leading-6 text-green-100">
                Saving together, supporting each other,
                and building a better financial future.
              </p>
            </div>
          </div>

          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-green-800/30" />
          <div className="absolute -top-20 -left-20 h-52 w-52 rounded-full bg-green-800/20" />
        </div>

        {/* Login form */}
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="mb-8">
            <p className="font-semibold tracking-wider text-green-800">
              MEMBER PORTAL
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-950">
              Member Login
            </h2>

            <p className="mt-2 text-gray-500">
              Enter your details to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={inputClass}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-12`}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-green-800"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Remember me and forgot password */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  disabled={loading}
                  className="h-4 w-4 accent-green-800"
                />
                Remember me
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-green-800 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-900 py-3 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to Account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup-choice"
              className="font-semibold text-green-800 hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}


