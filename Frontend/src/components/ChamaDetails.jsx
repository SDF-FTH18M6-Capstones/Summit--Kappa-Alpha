import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosClient, { getErrorMessage } from "../api/axiosClient";
import Officials from "../pages/public/Officials";
import Projects from "../pages/public/Projects";

const ChamaDetails = () => {
  const { chamaId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axiosClient.get(
          `/chamas/${encodeURIComponent(chamaId)}/public`
        );
        if (active) setData(res.data);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [chamaId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-gray-600">
        Loading Chama details...
      </div>
    );
  }

  if (error || !data?.chama) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="text-2xl font-bold text-[#123D2B]">Chama not found</h2>

        <p className="mt-3 text-gray-600">
          {error || "The chama you are looking for does not exist."}
        </p>

        <Link
          to="/chamas"
          className="mt-5 rounded-lg bg-[#123D2B] px-6 py-3 font-semibold text-white hover:bg-[#1F6B49]"
        >
          Back to chamas
        </Link>
      </div>
    );
  }

  const { chama, officials = [], projects = [] } = data;

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-[#F3F5F3] px-6 py-16 text-center">
        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Chama information
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#123D2B]">
          {chama.name}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
          {chama.description ||
            "A community committed to saving together and investing in shared opportunities."}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-12">
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="mt-1 text-xl font-bold text-[#123D2B]">
              {chama.location || "Kenya"}
            </p>
          </div>

          {chama.registration_number && (
            <div>
              <p className="text-sm text-gray-500">Registration No.</p>
              <p className="mt-1 text-xl font-bold text-[#123D2B]">
                {chama.registration_number}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Max Loan Limit</p>
            <p className="mt-1 text-xl font-bold text-[#123D2B]">
              KES {Number(chama.max_loan_amount || 100000).toLocaleString("en-KE")}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link
            to="/join-chama"
            className="inline-block rounded-lg bg-[#123D2B] px-7 py-3 font-semibold text-white transition hover:bg-[#1F6B49]"
          >
            Request to Join {chama.name}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <Officials officials={officials} />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <Projects projects={projects} />
      </section>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <Link
          to="/chamas"
          className="inline-block rounded-lg bg-[#123D2B] px-6 py-3 font-semibold text-white transition hover:bg-[#1F6B49]"
        >
          Back to all chamas
        </Link>
      </div>
    </div>
  );
};

export default ChamaDetails;



