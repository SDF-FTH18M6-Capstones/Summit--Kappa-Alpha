
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
} from "lucide-react";

import axiosClient from "../../api/axiosClient";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading");

  const [message, setMessage] = useState(
    "Please wait while we verify your email address."
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const controller = new AbortController();

    const verifyEmail = async () => {
      try {
        setStatus("loading");

        const response = await axiosClient.get(
          `/auth/verify-email`,
          {
            params: { token },
            signal: controller.signal,
          }
        );

        setStatus("success");

        setMessage(
          response.data.message ||
          "Your email has been successfully verified."
        );
      } catch (error) {
        if (
          error.name === "CanceledError" ||
          error.code === "ERR_CANCELED"
        ) {
          return;
        }

        setStatus("error");

        setMessage(
          error.response?.data?.message ||
          error.response?.data?.error ||
          (error.request
            ? "Unable to connect to the server. Please try again."
            : "Email verification failed. Your link may be invalid or expired.")
        );
      }
    };

    verifyEmail();

    return () => {
      controller.abort();
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-5">
          {status === "loading" && (
            <Loader2 className="w-16 h-16 text-green-700 animate-spin" />
          )}

          {status === "success" && (
            <CheckCircle className="w-16 h-16 text-green-600" />
          )}

          {status === "error" && (
            <XCircle className="w-16 h-16 text-red-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {status === "loading" && (
          <p className="text-sm text-gray-400">
            Please do not close this page.
          </p>
        )}

        {status === "success" && (
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <Mail size={18} />
            Continue to Login
          </Link>
        )}

        {status === "error" && (
          <Link
            to="/login"
            className="inline-block bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
}


