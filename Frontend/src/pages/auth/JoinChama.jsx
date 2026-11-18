
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

const fields = [
  {
    name: "full_name",
    label: "Full Name",
    type: "text",
    placeholder: "Enter your full name",
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    placeholder: "you@example.com",
  },
  {
    name: "phone_number",
    label: "Phone Number",
    type: "tel",
    placeholder: "e.g. 0712 345 678",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "At least 8 characters",
    minLength: 8,
  },
  {
    name: "confirm_password",
    label: "Confirm Password",
    type: "password",
    placeholder: "Enter your password again",
  },
];

export default function JoinChama() {
  const [formData, setFormData] = useState(initialFormData);
  const [chamas, setChamas] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChamas, setLoadingChamas] = useState(true);

  // Fetch available chamas
  useEffect(() => {
    const fetchChamas = async () => {
      try {
        setLoadingChamas(true);

        const response = await axiosClient.get("/chamas");

        console.log("Chamas API response:", response.data);

        const data = response.data;

        // Handle different possible Flask response structures
        let chamaList = [];

        if (Array.isArray(data)) {
          chamaList = data;
        } else if (Array.isArray(data.chamas)) {
          chamaList = data.chamas;
        } else if (Array.isArray(data.data)) {
          chamaList = data.data;
        } else if (Array.isArray(data.items)) {
          chamaList = data.items;
        }

        setChamas(chamaList);

        if (chamaList.length === 0) {
          setError("No available chamas found. Please try again later.");
        }
      } catch (err) {
        console.error("Failed to fetch chamas:", err);

        setChamas([]);
        setError(
          err.response?.data?.message ||
            "Could not load the list of chamas. Please try again."
        );
      } finally {
        setLoadingChamas(false);
      }
    };

    fetchChamas();
  }, []);

  // Handle form changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Submit registration request
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.chama_id) {
      setError("Please select a chama.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { confirm_password, ...payload } = formData;

      await axiosClient.post("/auth/register-member", payload);

      setSuccess(
        "Request submitted! You can log in once your chama admin approves you."
      );

      setFormData(initialFormData);
    } catch (err) {
      console.error("Registration error:", err.response?.data || err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          (err.request
            ? "Cannot reach the server. Check your connection."
            : "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-100";

  return (
    <section className="min-h-screen bg-gray-50 px-5 py-14">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-950">
            Join a Chama
          </h1>

          <p className="mt-2 text-gray-500">
            Submit your details to request membership.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Chama Selection */}
          <div>
            <label
              htmlFor="chama_id"
              className="mb-2 block text-sm font-medium"
            >
              Select Chama
            </label>

            <select
              id="chama_id"
              name="chama_id"
              value={formData.chama_id}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={loadingChamas || chamas.length === 0}
            >
              <option value="">
                {loadingChamas
                  ? "Loading chamas..."
                  : chamas.length === 0
                  ? "No chamas available"
                  : "Choose a chama..."}
              </option>

              {chamas.map((chama) => (
                <option key={chama.id} value={chama.id}>
                  {chama.name}
                </option>
              ))}
            </select>
          </div>

          {/* Registration Fields */}
          {fields.map(({ name, label, type, ...rest }) => (
            <div key={name}>
              <label
                htmlFor={name}
                className="mb-2 block text-sm font-medium"
              >
                {label}
              </label>

              {type === "password" ? (
                <PasswordInput
                  id={name}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="new-password"
                  required
                  {...rest}
                />
              ) : (
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  {...rest}
                />
              )}
            </div>
          ))}

          {/* Error Message */}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Success Message */}
          {success && (
            <p
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
            >
              {success}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || loadingChamas || chamas.length === 0}
            className="w-full rounded-lg bg-green-800 py-3 font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Submitting..."
              : loadingChamas
              ? "Loading Chamas..."
              : "Request to Join"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
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
