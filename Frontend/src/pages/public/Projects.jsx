 
import React from "react";

const Projects = ({ projects = [] }) => {
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "ongoing":
        return "bg-blue-100 text-blue-700";

      case "planned":
        return "bg-orange-100 text-orange-700";

      case "completed":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <section className="py-10">
      <div className="mb-8">
        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Growth and development
        </p>

        <h2 className="mt-3 text-3xl font-extrabold text-[#123D2B]">
          Our Projects
        </h2>

        <p className="mt-3 text-gray-600">
          Explore the projects and investments belonging to this chama.
        </p>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              {project.image && (
                <img
                  src={project.image}
                  alt={project.name}
                  className="h-52 w-full object-cover"
                />
              )}

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                      project.status
                    )}`}
                  >
                    {project.status || "Status unavailable"}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#123D2B]">
                  {project.name}
                </h3>

                <p className="mt-3 leading-6 text-gray-600">
                  {project.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#F3F5F3] p-8 text-center">
          <p className="text-gray-600">
            No projects have been added to this chama yet.
          </p>
        </div>
      )}
    </section>
  );
};

export default Projects;



