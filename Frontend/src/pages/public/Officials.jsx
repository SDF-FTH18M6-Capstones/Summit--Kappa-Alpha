
import React from "react";

const officials = [
  {
    name: "",
    position: "Chairperson",
    image:
      "",
  },
  {
    name: "",
    position: "Treasurer",
    image:
      "",
  },
  {
    name: "",
    position: "Secretary",
    image:
      "",
  },
];

const Officials = () => {
  return (
    <div className="min-h-screen">

      <section className="bg-[#F3F5F3] px-6 py-16 text-center">
        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Leadership and governance
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#123D2B]">
          Our Officials
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
          Meet the dedicated leaders responsible for guiding our chama,
          managing resources and ensuring transparency.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">

        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">

          {officials.map((official) => (
            <article
              key={official.position}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="h-80 overflow-hidden bg-gray-100">
                <img
                  src={official.image}
                  alt={official.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-7 text-center">
                <h2 className="text-xl font-bold text-[#123D2B]">
                  {official.name}
                </h2>

                <p className="mt-2 font-medium text-[#1F6B49]">
                  {official.position}
                </p>
              </div>
            </article>
          ))}

        </div>

        /* Constitution */
        <div className="mt-16 rounded-xl bg-[#F3F5F3] p-8 text-center">

          <h2 className="text-2xl font-bold text-[#123D2B]">
            Our Constitution
          </h2>

          <p className="mt-3 text-gray-600">
            Learn about our rules, responsibilities and governance structure.
          </p>

          <a
            href="/constitution.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center rounded-lg bg-[#123D2B] px-7 py-3 font-semibold text-white hover:bg-[#1F6B49]"
          >
            Read our constitution (PDF)
          </a>

        </div>
      </section>

    </div>
  );
};

export default Officials;


