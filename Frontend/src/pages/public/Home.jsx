
import React from "react";
import { Link } from "react-router-dom";

const announcements = [
  {
    date: "12 November 2026",
    title: "Monthly Members Meeting",
    description:
      "Join us for our monthly meeting as we review contributions, savings and upcoming activities.",
  },
  {
    date: "08 November 2026",
    title: "Monthly Contributions",
    description:
      "Members are reminded to make their monthly contributions before the due date.",
  },
  {
    date: "02 November 2026",
    title: "New Investment Opportunity",
    description:
      "Discover our latest investment plans and opportunities for growing our collective savings.",
  },
];

const Home = () => {
  return (
    <div>

      <section className="bg-[#F3F5F3]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">

          <div>
            <span className="mb-5 inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-[#1F6B49]">
              Welcome to Summit Chama
            </span>

            <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-[#123D2B] md:text-6xl">
              Growing Together Through Savings and Investment
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
              We believe in saving together, investing wisely and building
              a financially secure future through trust, commitment and unity.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-lg bg-[#123D2B] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#1F6B49]"
              >
                Create account
              </Link>

              <Link
                to="/chamas"
                className="rounded-lg border border-[#123D2B] px-7 py-3.5 font-semibold text-[#123D2B] transition hover:bg-green-50"
              >
                Browse chamas
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-lg">
            <img
              src="/Public/Images/hero-image.jpg"
              alt="Community members coming together"
              className="h-[350px] w-full object-cover md:h-[470px]"
            />
          </div>

        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-14 sm:grid-cols-3">

        {[
          { number: "100+", label: "Members" },
          { number: "2020", label: "Year Founded" },
          { number: "KES 2M+", label: "Pooled to date" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"
          >
            <h2 className="text-3xl font-extrabold text-[#123D2B]">
              {stat.number}
            </h2>
            <p className="mt-2 text-gray-500">{stat.label}</p>
          </div>
        ))}

      </section>

      <section className="bg-[#F3F5F3] py-16">
        <div className="mx-auto max-w-7xl px-6">

          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
                Stay informed
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#123D2B]">
                Announcements
              </h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {announcements.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <p className="text-sm font-medium text-[#1F6B49]">
                  {item.date}
                </p>

                <h3 className="mt-4 text-xl font-bold text-[#123D2B]">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

        </div>
      </section>

      <section id="how-to-join" className="mx-auto max-w-7xl px-6 py-20">

        <div className="mb-12 text-center">
          <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
            Getting started
          </p>

          <h2 className="mt-2 text-3xl font-bold text-[#123D2B] md:text-4xl">
            How to Join
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Become part of our community and start building your financial future.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">

          {[
            {
              number: "01",
              title: "Create an account",
              description:
                "Register with your personal details and verify your email address.",
            },
            {
              number: "02",
              title: "Admin reviews your details",
              description:
                "Our administration team reviews your membership request.",
            },
            {
              number: "03",
              title: "Get approved and log in",
              description:
                "Once approved, access your member account and participate.",
            },
          ].map((step) => (
            <div key={step.number} className="relative rounded-xl bg-[#F3F5F3] p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#123D2B] text-lg font-bold text-white">
                {step.number}
              </span>

              <h3 className="mt-6 text-xl font-bold text-[#123D2B]">
                {step.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}

        </div>

        <div className="mt-16 rounded-2xl bg-[#123D2B] px-6 py-12 text-center text-white md:px-16">

          <h2 className="text-3xl font-bold">
            Ready to join Summit?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-200">
            Create your account, verify your email, then wait for the
            administrator to approve your membership.
          </p>

          <Link
            to="/register"
            className="mt-7 inline-block rounded-lg bg-white px-8 py-3 font-bold text-[#123D2B] transition hover:bg-gray-100"
          >
            Create account
          </Link>

        </div>

      </section>
    </div>
  );
};

export default Home;


