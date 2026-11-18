
import { useState } from "react";
import { Link } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput";
import axiosClient from "../../api/axiosClient";

const initialFormData = {
  chama_name: "",
  location: "",
  description: "",
  constitution: "",
  registration_number: "",
  logo_url: "",
  full_name: "",
  email: "",
  phone_number: "",
  profile_image_url: "",
  password: "",
  confirm_password: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-100";

function Field({ label, id, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function RegisterChama() {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
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

    const { confirm_password, ...payload } = formData;

    try {
      setLoading(true);

      const response = await axiosClient.post(
        "/auth/register-chama",
        payload
      );

      setSuccess(
        response.data.message ||
          "Chama registered successfully! Please check your email to verify your account."
      );

      setFormData(initialFormData);

    } catch (err) {
      console.error("Chama registration failed:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-800">
            Summit Chama
          </p>

          <h1 className="text-3xl font-bold text-green-950">
            Register a New Chama
          </h1>

          <p className="mt-2 text-gray-500">
            Enter your Chama details and create the administrator account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* CHAMA DETAILS */}
          <h2 className="text-lg font-bold text-green-950">
            Chama details
          </h2>

          <Field label="Chama name" id="chama_name">
            <input
              id="chama_name"
              name="chama_name"
              value={formData.chama_name}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Pamoja Savers"
              required
            />
          </Field>

          <Field label="Location" id="location">
            <input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Nairobi"
            />
          </Field>

          <Field label="Description" id="description">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={inputClass}
              rows={3}
              placeholder="Briefly describe your Chama and its objectives"
            />
          </Field>

          <Field label="Constitution" id="constitution">
            <textarea
              id="constitution"
              name="constitution"
              value={formData.constitution}
              onChange={handleChange}
              className={inputClass}
              rows={4}
              placeholder="Enter your Chama constitution (optional)"
            />
          </Field>

          <Field label="Registration number" id="registration_number">
            <input
              id="registration_number"
              name="registration_number"
              value={formData.registration_number}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. CHM-2026-5467"
            />
          </Field>

          <Field label="Chama logo URL" id="logo_url">
            <input
              id="logo_url"
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://example.com/logo.png"
            />
          </Field>

          {/* ADMINISTRATOR DETAILS */}
          <h2 className="pt-4 text-lg font-bold text-green-950">
            Administrator account
          </h2>

          <Field label="Full name" id="full_name">
            <input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={inputClass}
              placeholder="Enter your full name"
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">

            <Field label="Email address" id="email">
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label="Phone number" id="phone_number">
              <input
                id="phone_number"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. 0712 345 678"
                required
              />
            </Field>

          </div>

          <Field label="Profile image URL" id="profile_image_url">
            <input
              id="profile_image_url"
              type="url"
              name="profile_image_url"
              value={formData.profile_image_url}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://example.com/profile.png"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">

            <Field label="Password" id="password">
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </Field>

            <Field label="Confirm password" id="confirm_password">
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Confirm password"
                required
              />
            </Field>

          </div>

          {/* ERRORS AND SUCCESS */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
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
            disabled={loading}
            className="w-full rounded-lg bg-green-900 py-3 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registering..." : "Register Chama"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-green-800 hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </section>
  );
}


