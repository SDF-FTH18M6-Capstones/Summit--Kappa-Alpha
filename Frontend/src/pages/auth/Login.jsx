
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    // Connect your login API here.
    console.log("Login details:", formData);

    // Temporary navigation for frontend testing only.
    // Replace this with navigation after successful API login.
    // navigate("/dashboard");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100";

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-2">

        {/* Left side */}
        <div className="flex flex-col justify-center bg-green-950 p-10 text-white">
          <h1 className="text-3xl font-bold">Welcome Back!</h1>

          <p className="mt-5 leading-7 text-gray-300">
            Your financial growth journey continues here.
            Log in to manage your contributions, track your
            savings, view loan updates, and stay connected
            with your Chama community.
          </p>

          <div className="mt-10 rounded-xl bg-green-900 p-6">
            <p className="text-lg font-semibold">
              Together We Grow
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Saving together, supporting each other,
              and building a better financial future.
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="p-8 md:p-12">
          <div className="mb-8">
            <p className="font-semibold text-green-800">
              MEMBER PORTAL
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-950">
              Member Login
            </h2>

            <p className="mt-2 text-gray-500">
              Enter your details to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-20`}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-green-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-green-800 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-green-800 py-3 font-semibold text-white transition hover:bg-green-900"
            >
              Login to Account
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/register"
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


