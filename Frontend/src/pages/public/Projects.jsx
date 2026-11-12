
const projects = [
  {
    title: "Land Investment",
    description: "Collective investment in land and property development.",
    status: "Ongoing",
    icon: ""
  },
  {
    title: "Agricultural Investment",
    description: "Supporting agricultural activities and farming opportunities.",
    status: "Ongoing",
    icon: ""
  },
  {
    title: "Community Development",
    description: "Investing in initiatives that improve our community.",
    status: "Planned",
    icon: ""
  }
];

function Projects() {
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-[#123B32] text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Our Projects
        </h1>

        <p className="text-gray-200 max-w-2xl mx-auto">
          Discover the investment opportunities and development
          projects that bring our members together.
        </p>
      </section>

      <section className="py-16 px-8 md:px-20 bg-gray-50">

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="bg-green-100 h-44 flex items-center justify-center">
                <span className="text-7xl">
                  {project.icon}
                </span>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-green-800">
                    {project.status}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-[#123B32] mb-3">
                  {project.title}
                </h2>

                <p className="text-gray-600 leading-relaxed">
                  {project.description}
                </p>

              </div>
            </div>
          ))}

        </div>
      </section>

    </div>
  );
}

export default Projects;




