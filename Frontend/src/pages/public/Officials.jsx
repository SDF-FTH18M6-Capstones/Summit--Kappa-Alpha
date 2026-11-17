
import React from "react";

const Officials = ({ officials = [] }) => {
  return (
    <section className="py-10">
      <div className="mb-8 text-center">
        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Leadership and governance
        </p>

        <h2 className="mt-3 text-3xl font-extrabold text-[#123D2B]">
          Our Officials
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-gray-600">
          Meet the leaders responsible for guiding this chama.
        </p>
      </div>

      {officials.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {officials.map((official) => (
            <article
              key={official.id || official.position}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="h-72 overflow-hidden bg-gray-100">
                <img
                  src={official.image || "/default-profile.png"}
                  alt={official.name || "Chama official"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-[#123D2B]">
                  {official.name || "Name not provided"}
                </h3>

                <p className="mt-2 font-medium text-[#1F6B49]">
                  {official.position}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-[#F3F5F3] p-8 text-center text-gray-600">
          No officials have been added to this chama yet.
        </p>
      )}
    </section>
  );
};

export default Officials;


