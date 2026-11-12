
import React from "react";
import { Link } from "react-router-dom";

const chamas = [
  {
    id: 1,
    name: "Summit",
    description:
      "A community committed to saving together and investing in opportunities that create financial growth.",
    members: 120,
    location: "Nairobi",
    initials: "S",
  },
  {
    id: 2,
    name: "Unity Savings Group",
    description:
      "Building financial stability through regular contributions and responsible investments.",
    members: 85,
    location: "Kiambu",
    initials: "U",
  },
  {
    id: 3,
    name: "Future Builders",
    description:
      "Empowering members through collective savings, investment and financial education.",
    members: 64,
    location: "Thika",
    initials: "F",
  },
  {
    id: 4,
    name: "Together We Grow",
    description:
      "Creating opportunities for members through shared financial goals and teamwork.",
    members: 92,
    location: "Nakuru",
    initials: "T",
  },
];

const Join = () => {
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
          Browse the chamas on our platform and create an account
          to join a community that shares your financial goals.
        </p>

      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[#123D2B]">
            Available Chamas
          </h2>

          <span className="text-sm text-gray-500">
            {chamas.length} communities
          </span>
        </div>

        <div className="space-y-5">

          {chamas.map((chama) => (
            <article
              key={chama.id}
              className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#1F6B49] hover:shadow-md md:flex-row md:items-center md:justify-between"
            >

              <div className="flex flex-1 items-center gap-5">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#123D2B] text-2xl font-bold text-white">
                  {chama.initials}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#123D2B]">
                    {chama.name}
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                    {chama.description}
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap items-center gap-6 md:gap-8">

                <div>
                  <p className="text-sm text-gray-500">Members</p>
                  <p className="mt-1 font-semibold text-[#123D2B]">
                    {chama.members}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="mt-1 font-semibold text-[#123D2B]">
                    {chama.location}
                  </p>
                </div>

                <Link
                  to={`/chamas/${chama.id}`}
                  className="rounded-lg bg-[#123D2B] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1F6B49]"
                >
                  View chama
                </Link>

              </div>

            </article>
          ))}

        </div>

        <div className="mt-14 rounded-2xl bg-[#F3F5F3] px-6 py-10 text-center">

          <h2 className="text-2xl font-bold text-[#123D2B]">
            Want to become a member?
          </h2>

          <p className="mt-3 text-gray-600">
            Create your account and start your membership journey.
          </p>

          <Link
            to="/register"
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

