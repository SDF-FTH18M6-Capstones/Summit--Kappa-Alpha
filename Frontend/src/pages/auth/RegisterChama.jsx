import { useState } from "react";
import { Link } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput";

const initialFormData = {
  chama_name: "",
  location: "",
  date_founded: "",
  meeting_frequency: "monthly",
  contribution_amount: "",
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-100";

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-gray-700">
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
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

    // TODO (backend): send the form data to your registration API here.
    // Don't send confirm_password.
    const { confirm_password, ...payload } = formData;
    console.log("Register chama:", payload);

    setSuccess("Your details have been validated successfully.");
  };

  return (
    <section className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-800">
            Summit Chama
          </p>
          <h1 className="text-3xl font-bold text-green-950">Register a New Chama</h1>
          <p className="mt-2 text-gray-500">
            Enter your chama's details and create the administrator account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <h2 className="text-lg font-bold text-green-950">Chama details</h2>

          <Field label="Chama name" id="chama_name">
            <input
              id="chama_name"
              name="chama_name"
              value={formData.chama_name}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Summit Savers Group"
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Location" id="location">
              <input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Nairobi"
                required
              />
            </Field>

            <Field label="Date founded" id="date_founded">
              <input
                id="date_founded"
                type="date"
                name="date_founded"
                value={formData.date_founded}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Meeting frequency" id="meeting_frequency">
              <select
                id="meeting_frequency"
                name="meeting_frequency"
                value={formData.meeting_frequency}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </Field>

            <Field label="Contribution amount (KES)" id="contribution_amount">
              <input
                id="contribution_amount"
                type="number"
                min="1"
                name="contribution_amount"
                value={formData.contribution_amount}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. 1000"
                required
              />
            </Field>
          </div>

          <h2 className="pt-4 text-lg font-bold text-green-950">Administrator account</h2>

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
                placeholder="Enter it again"
                required
              />
            </Field>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{success}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-green-900 py-3 font-semibold text-white shadow-sm transition hover:bg-green-800"
          >
            Register Chama
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-green-800 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}


