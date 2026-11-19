
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import PasswordInput from "../../components/PasswordInput";

const initialFormData = {
  chama_id: "",
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
};

const steps = [
  {
    title: "Choose your Chama",
    description: "Select the Chama you would like to join.",
  },
  {
    title: "Your personal details",
    description: "Tell us a little about yourself.",
  },
  {
    title: "Create your password",
    description: "Secure your account and review your details.",
  },
];

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-800 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100";

export default function JoinChama() {
  const [formData, setFormData] = useState(initialFormData);
  const [chamas, setChamas] = useState([]);
  const [step, setStep] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingChamas, setLoadingChamas] = useState(true);

  // Fetch available Chamas
  useEffect(() => {
    let mounted = true;

    const fetchChamas = async () => {
      try {
        setLoadingChamas(true);

        const response = await axiosClient.get("/chamas");

        console.log("Chamas API response:", response.data);

        // Your backend returns Chamas inside the items array.
        const chamaList = Array.isArray(response.data?.items)
          ? response.data.items
          : Array.isArray(response.data)
          ? response.data
          : [];

        if (mounted) {
          setChamas(chamaList);
        }
      } catch (err) {
        console.error("Failed to load Chamas:", err);

        if (mounted) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Unable to load Chamas. Please check that the backend is running."
          );
        }
      } finally {
        if (mounted) {
          setLoadingChamas(false);
        }
      }
    };

    fetchChamas();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle all form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Find selected Chama
  const selectedChama = chamas.find(
    (chama) => String(chama.id) === String(formData.chama_id)
  );

  // Validate current step
  const validateStep = () => {
    setError("");

    if (step === 0) {
      if (!formData.chama_id) {
        setError("Please select a Chama before continuing.");
        return false;
      }

      if (!selectedChama) {
        setError("The selected Chama is no longer available. Please select another.");
        return false;
      }
    }

    if (step === 1) {
      const { full_name, email, phone_number } = formData;

      if (!full_name.trim() || !email.trim() || !phone_number.trim()) {
        setError("Please fill in all your personal details.");
        return false;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email.trim())) {
        setError("Please enter a valid email address.");
        return false;
      }
    }

    if (step === 2) {
      const { password, confirm_password } = formData;

      if (!password || !confirm_password) {
        setError("Please enter and confirm your password.");
        return false;
      }

      if (password.length < 8) {
        setError("Your password must contain at least 8 characters.");
        return false;
      }

      if (password !== confirm_password) {
        setError("Your passwords do not match.");
        return false;
      }
    }

    return true;
  };

  // Move to next step
  const handleNext = () => {
    if (!validateStep()) return;

    setStep((previous) => Math.min(previous + 1, 2));
    setError("");
  };

  // Move to previous step
  const handleBack = () => {
    setStep((previous) => Math.max(previous - 1, 0));
    setError("");
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        chama_id: Number(formData.chama_id),
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
      };

      const response = await axiosClient.post(
        "/auth/register-member",
        payload
      );

      console.log("Registration response:", response.data);

      setSuccess(
        response.data?.message ||
          "Your account has been created! Please verify your email and wait for your Chama administrator to approve your membership."
      );

      setFormData(initialFormData);
      setStep(0);
    } catch (err) {
      console.error("Registration failed:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed. Please check your details and try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="grid md:grid-cols-2">

          {/* LEFT: REGISTRATION FORM */}
          <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12">

            {/* BRAND */}
            <Link to="/" className="mb-9 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-950 text-lg font-bold text-white">
                S
              </div>

              <span className="text-xl font-bold tracking-tight text-green-950">
                Summit <span className="text-gray-500">Chama</span>
              </span>
            </Link>

            {/* PAGE HEADING */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                Create your account
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Join your Chama and start your journey with Summit Chama.
              </p>
            </div>

            {/* PROGRESS */}
            {!success && (
              <div className="mb-8">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                  <span>
                    Step {step + 1} of {steps.length}
                  </span>

                  <span>{Math.round(progress)}% complete</span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-900 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* CURRENT STEP */}
            {!success && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {steps[step].title}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {steps[step].description}
                </p>
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {success && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-900">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    ✓
                  </span>

                  <h2 className="font-semibold">
                    Registration successful!
                  </h2>
                </div>

                <p>{success}</p>

                <p className="mt-3">
                  Check your inbox for the verification email. Once you verify
                  your email, your Chama administrator can review your
                  membership request.
                </p>

                <Link
                  to="/login"
                  className="mt-5 inline-flex font-semibold text-green-950 underline underline-offset-4"
                >
                  Go to login
                </Link>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit}>

                {/* STEP 1: CHOOSE CHAMA */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="chama_id"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Select a Chama
                      </label>

                      <select
                        id="chama_id"
                        name="chama_id"
                        value={formData.chama_id}
                        onChange={handleChange}
                        className={inputClass}
                        disabled={loadingChamas}
                        required
                      >
                        <option value="">
                          {loadingChamas
                            ? "Loading Chamas..."
                            : "Choose a Chama"}
                        </option>

                        {chamas.map((chama) => (
                          <option key={chama.id} value={chama.id}>
                            {chama.name}
                          </option>
                        ))}
                      </select>

                      {!loadingChamas && chamas.length === 0 && (
                        <p className="mt-2 text-xs text-red-600">
                          No Chamas are currently available.
                        </p>
                      )}
                    </div>

                    {selectedChama && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Selected Chama
                        </p>

                        <h3 className="mt-1 font-semibold text-green-950">
                          {selectedChama.name}
                        </h3>

                        {selectedChama.location && (
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedChama.location}
                          </p>
                        )}

                        {selectedChama.description && (
                          <p className="mt-2 text-sm leading-5 text-gray-600">
                            {selectedChama.description}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs leading-5 text-gray-500">
                      Select the Chama you want to join. Your membership
                      request will be reviewed by its administrator.
                    </p>
                  </div>
                )}

                {/* STEP 2: PERSONAL INFORMATION */}
                {step === 1 && (
                  <div className="space-y-5">

                    <div>
                      <label
                        htmlFor="full_name"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Full name
                      </label>

                      <input
                        id="full_name"
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className={inputClass}
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Email address
                      </label>

                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        className={inputClass}
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phone_number"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Phone number
                      </label>

                      <input
                        id="phone_number"
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="e.g. 0712345678"
                        className={inputClass}
                        autoComplete="tel"
                        required
                      />
                    </div>

                  </div>
                )}

                {/* STEP 3: PASSWORD AND REVIEW */}
                {step === 2 && (
                  <div className="space-y-5">

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Password
                      </label>

                      <PasswordInput
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                      />

                      <p className="mt-2 text-xs text-gray-500">
                        Your password must contain at least 8 characters.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Confirm password
                      </label>

                      <PasswordInput
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder="Re-enter your password"
                      />
                    </div>

                    {/* REVIEW DETAILS */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-800">
                        Review your details
                      </h3>

                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium text-gray-800">
                            Chama:
                          </span>{" "}
                          {selectedChama?.name || "Not selected"}
                        </p>

                        <p>
                          <span className="font-medium text-gray-800">
                            Full name:
                          </span>{" "}
                          {formData.full_name}
                        </p>

                        <p>
                          <span className="font-medium text-gray-800">
                            Email:
                          </span>{" "}
                          {formData.email}
                        </p>

                        <p>
                          <span className="font-medium text-gray-800">
                            Phone:
                          </span>{" "}
                          {formData.phone_number}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-5 text-gray-500">
                      By creating your account, you are requesting to join
                      this Chama. You must verify your email and wait for
                      administrator approval.
                    </p>

                  </div>
                )}

                {/* FORM NAVIGATION */}
                <div className="mt-9 flex items-center justify-between gap-4">

                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-md px-5 py-3 text-sm font-semibold text-green-950 transition hover:bg-green-50"
                    >
                      Back
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="rounded-md px-2 py-3 text-sm font-medium text-green-950 hover:underline"
                    >
                      Sign in instead
                    </Link>
                  )}

                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={loadingChamas || chamas.length === 0}
                      className="rounded-md bg-green-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-md bg-green-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Creating account..." : "Create account"}
                    </button>
                  )}

                </div>
              </form>
            )}

            {/* FOOTER */}
            <div className="mt-10 border-t border-gray-100 pt-5 text-center">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Summit Chama. All rights reserved.
              </p>
            </div>

          </div>

          {/* RIGHT: WELCOME PANEL */}
          <div className="hidden flex-col justify-between bg-green-950 px-10 py-12 text-white md:flex">

            <div>
              <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <span className="text-2xl font-bold">S</span>
              </div>

              <h2 className="max-w-sm text-3xl font-semibold leading-tight">
                Grow together. Save together. Achieve together.
              </h2>

              <p className="mt-5 max-w-sm text-sm leading-7 text-green-100/80">
                Join a community that believes in financial growth,
                accountability, and achieving goals through collective effort.
              </p>
            </div>

            <div className="my-12 space-y-7">

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-green-100">
                  1
                </div>

                <div>
                  <h3 className="font-semibold">
                    Choose your community
                  </h3>

                  <p className="mt-1 text-sm text-green-100/70">
                    Find the Chama you want to be part of.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-green-100">
                  2
                </div>

                <div>
                  <h3 className="font-semibold">
                    Set up your account
                  </h3>

                  <p className="mt-1 text-sm text-green-100/70">
                    Provide your details and create a secure password.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-green-100">
                  3
                </div>

                <div>
                  <h3 className="font-semibold">
                    Get approved
                  </h3>

                  <p className="mt-1 text-sm text-green-100/70">
                    Verify your email and wait for your Chama administrator.
                  </p>
                </div>
              </div>

            </div>

            <div className="border-t border-white/15 pt-6">
              <p className="text-sm text-green-100/70">
                Building stronger communities through collective financial
                growth.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}


