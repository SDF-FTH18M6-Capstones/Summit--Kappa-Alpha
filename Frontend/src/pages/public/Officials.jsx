import React from "react";
import { UserCircle } from "lucide-react";

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
          {officials.map((official) => {
            const name = official.full_name || official.name || "Chama Official";
            const position = (official.role || official.position || "Official")
              .replace(/_/g, " ")
              .toUpperCase();
            const image = official.profile_image_url || official.image;

            return (
              <article
                key={official.membership_id || official.id || name}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-64 items-center justify-center overflow-hidden bg-green-50">
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle size={84} className="text-[#123D2B]/40" />
                  )}
                </div>

                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-[#123D2B]">{name}</h3>
                  <p className="mt-2 text-xs font-bold tracking-wider text-[#1F6B49]">
                    {position}
                  </p>
                </div>
              </article>
            );
          })}
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



