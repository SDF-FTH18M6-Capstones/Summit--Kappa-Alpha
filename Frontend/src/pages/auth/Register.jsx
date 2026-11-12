
import { useState } from "react";

const initialFormData = {
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
};

export default function Register() {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setSuccess("");

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Your passwords do not match.");
      return;
    }

    // Connect this form to your registration API here.
    console.log("Registration data:", formData);

    setSuccess("Your details have been validated successfully.");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100";

  return (
    <section className="min-h-screen bg-gray-50 px-5 py-14">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-950">
            Create Your Account
          </h1>
          <p className="mt-2 text-gray-500">
            Register to become part of our community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name
            </label>
            <input
              className={inputClass}
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email Address</label>
            <input
              className={inputClass}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Phone Number</label>
            <input
              className={inputClass}
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              className={inputClass}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Confirm Password
            </label>
            <input
              className={inputClass}
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Enter your password again"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-green-800 py-3 font-semibold text-white hover:bg-green-900"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-green-800">
            Login
          </a>
        </p>
      </div>
    </section>
  );
}



