import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient, { getErrorMessage } from "../../api/axiosClient";

const Join = () => {
  const [chamas, setChamas] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchChamas = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axiosClient.get("/chamas", {
          params: { search: search.trim(), per_page: 50 },
        });
        const list = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (active) setChamas(list);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchChamas();
    return () => {
      active = false;
    };
  }, [search]);

  return (
    <div className="min-h-screen">
      <section className="bg-[#F3F5F3] px-6 py-16 text-center">
        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Find your community
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#123D2B]">
          Explore Our Chamas
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
          Browse the registered Chamas on our platform and create an account
          to join a community that shares your financial goals.
        </p>

        <div className="mx-auto mt-6 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Chamas by name..."
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#123D2B] focus:ring-2 focus:ring-green-100"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[#123D2B]">
            Available Chamas
          </h2>

          <span className="text-sm text-gray-500">
            {loading ? "Loading..." : `${chamas.length} communities`}
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Loading registered Chamas...
          </div>
        ) : chamas.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            No Chamas found matching your search.
          </div>
        ) : (
          <div className="space-y-5">
            {chamas.map((chama) => (
              <article
                key={chama.id}
                className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#1F6B49] hover:shadow-md md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-1 items-center gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#123D2B] text-2xl font-bold text-white">
                    {chama.logo_url ? (
                      <img
                        src={chama.logo_url}
                        alt={`${chama.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      chama.name?.charAt(0)?.toUpperCase() || "C"
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#123D2B]">
                      {chama.name}
                    </h3>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                      {chama.description ||
                        "Saving together and investing in shared community goals."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 md:gap-8">
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="mt-1 font-semibold text-[#123D2B]">
                      {chama.location || "Kenya"}
                    </p>
                  </div>

                  <Link
                    to={`/chamas/${chama.slug || chama.id}`}
                    className="rounded-lg bg-[#123D2B] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1F6B49]"
                  >
                    View chama
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-14 rounded-2xl bg-[#F3F5F3] px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-[#123D2B]">
            Want to become a member?
          </h2>

          <p className="mt-3 text-gray-600">
            Create your account and start your membership journey.
          </p>

          <Link
            to="/signup-choice"
            className="mt-6 inline-block rounded-lg bg-[#123D2B] px-8 py-3 font-semibold text-white hover:bg-[#1F6B49]"
          >
            Create account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Join;



