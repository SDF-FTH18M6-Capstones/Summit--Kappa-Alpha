
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  UserRound,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import PasswordInput from "../../components/PasswordInput";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";



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
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-100";

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

const steps = [
  {
    title: "Chama Details",
    description: "Tell us about your savings group.",
    icon: Building2,
  },
  {
    title: "Administrator",
    description: "Create your administrator profile.",
    icon: UserRound,
  },
  {
    title: "Security & Review",
    description: "Secure your account and review details.",
    icon: ShieldCheck,
  },
];

export default function RegisterChama() {
  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
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

  const validateStep = () => {
    if (currentStep === 0) {
      if (!formData.chama_name.trim()) {
        setError("Please enter your Chama name.");
        return false;
      }

      if (!formData.location.trim()) {
        setError("Please enter your Chama location.");
        return false;
      }
    }

    if (currentStep === 1) {
      if (!formData.full_name.trim()) {
        setError("Please enter your full name.");
        return false;
      }

      if (!formData.email.trim()) {
        setError("Please enter your email address.");
        return false;
      }

      if (!formData.phone_number.trim()) {
        setError("Please enter your phone number.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (formData.password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return false;
      }

      if (formData.password !== formData.confirm_password) {
        setError("Your passwords do not match.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    setCurrentStep((previous) => previous + 1);
    setError("");
  };

  const handlePrevious = () => {
    setCurrentStep((previous) => Math.max(0, previous - 1));
    setError("");
  };

  const handleSubmit = async (event) => {
  event.preventDefault();

  if (!validateStep()) return;

  const payload = {
    chama_name: formData.chama_name.trim(),
    location: formData.location.trim(),
    description: formData.description.trim() || null,
    constitution: formData.constitution.trim() || null,
    registration_number: formData.registration_number.trim() || null,
    logo_url: formData.logo_url.trim() || null,
    full_name: formData.full_name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone_number: formData.phone_number.trim(),
    profile_image_url: formData.profile_image_url.trim() || null,
    password: formData.password,
  };

  try {
    setLoading(true);
    setError("");
    setSuccess("");

    const response = await axiosClient.post(
      "/auth/register-chama",
      payload
    );

    setSuccess(
      response.data.message ||
        "Chama registered successfully! Please check your email to verify your account."
    );

    setFormData(initialFormData);
    setCurrentStep(0);
  } catch (err) {
    console.error("Chama registration failed:", err.response?.data || err);
    setError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
};


  const progress = ((currentStep + 1) / steps.length) * 100;

  const renderChamaDetails = () => (
    <div className="space-y-5">
      <Field label="Chama name *" id="chama_name">
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

      <Field label="Location *" id="location">
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

      <Field label="Description" id="description">
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={inputClass}
          rows={3}
          placeholder="Briefly describe your Chama..."
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
    </div>
  );

  const renderAdministrator = () => (
    <div className="space-y-5">
      <Field label="Full name *" id="full_name">
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

      <Field label="Email address *" id="email">
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

      <Field label="Phone number *" id="phone_number">
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
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-bold text-green-950">
          Chama information
        </h3>

        {[
          ["Chama name", formData.chama_name],
          ["Location", formData.location],
          ["Description", formData.description],
          ["Registration number", formData.registration_number],
          ["Constitution", formData.constitution],
          ["Logo URL", formData.logo_url],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm"
          >
            <span className="font-medium text-gray-500">{label}</span>
            <span className="max-w-[60%] break-words text-right text-gray-800">
              {value || "Not provided"}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 font-bold text-green-950">
          Administrator information
        </h3>

        {[
          ["Full name", formData.full_name],
          ["Email", formData.email],
          ["Phone number", formData.phone_number],
          ["Profile image", formData.profile_image_url],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm"
          >
            <span className="font-medium text-gray-500">{label}</span>
            <span className="max-w-[60%] break-words text-right text-gray-800">
              {value || "Not provided"}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900">
        <CheckCircle2 className="mb-2" size={22} />
        Your password has been entered securely. It will not be displayed here.
      </div>
    </div>
  );

  const StepIcon = steps[currentStep].icon;

  return (
    <section className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-green-800">
            Summit Chama
          </p>

          <h1 className="text-3xl font-bold text-green-950 sm:text-4xl">
            Register Your Chama
          </h1>

          <p className="mt-2 text-gray-500">
            Set up your savings group in a few simple steps.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">

          {/* PROGRESS */}
          <div className="border-b border-gray-100 px-6 py-7 sm:px-10">

            <div className="mb-5 flex items-center justify-between gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const active = index === currentStep;
                const completed = index < currentStep;

                return (
                  <div
                    key={step.title}
                    className="flex flex-1 flex-col items-center text-center"
                  >
                    <div
                      className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full transition ${
                        completed
                          ? "bg-green-800 text-white"
                          : active
                          ? "bg-green-100 text-green-900 ring-2 ring-green-800"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {completed ? (
                        <Check size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>

                    <span
                      className={`text-xs font-semibold sm:text-sm ${
                        active || completed
                          ? "text-green-900"
                          : "text-gray-400"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-800 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-right text-xs font-medium text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-6 py-8 sm:px-10"
          >

            <div className="mb-7">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-3 text-green-900">
                  <StepIcon size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-green-950">
                    {steps[currentStep].title}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {steps[currentStep].description}
                  </p>
                </div>
              </div>
            </div>

            {currentStep === 0 && renderChamaDetails()}
            {currentStep === 1 && renderAdministrator()}

            {currentStep === 2 && (
              <>
                <div className="mb-6 space-y-5">
                  <Field label="Password *" id="password">
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

                  <Field
                    label="Confirm password *"
                    id="confirm_password"
                  >
                    <PasswordInput
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Confirm your password"
                      required
                    />
                  </Field>
                </div>

                <div className="my-8 border-t border-gray-200 pt-7">
                  <h3 className="mb-2 text-xl font-bold text-green-950">
                    Review your information
                  </h3>

                  <p className="mb-5 text-sm text-gray-500">
                    Check your details before submitting your registration.
                  </p>

                  {renderReview()}
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
              >
                {success}
              </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-between">

              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowLeft size={18} />
                  Previous
                </button>
              ) : (
                <div />
              )}

              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-900 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-green-800"
                >
                  Next Step
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-900 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    "Registering..."
                  ) : (
                    <>
                      Complete Registration
                      <CheckCircle2 size={18} />
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>

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


