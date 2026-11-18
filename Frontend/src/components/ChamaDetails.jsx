
import React from "react";
import { useParams, Link } from "react-router-dom";

import Officials from "../pages/public/Officials";
import Projects from "../pages/public/Projects";

// Chama information
const chamas = [
  {
    id: 1,
    name: "Summit",
    description:
      "A community committed to saving together and investing in opportunities that create financial growth.",
    members: 120,
    location: "Nairobi",
  },
  {
    id: 2,
    name: "Unity Savings Group",
    description:
      "Building financial stability through regular contributions and responsible investments.",
    members: 85,
    location: "Kiambu",
  },
  {
    id: 3,
    name: "Future Builders",
    description:
      "Empowering members through collective savings, investment and financial education.",
    members: 64,
    location: "Thika",
  },
  {
    id: 4,
    name: "Together We Grow",
    description:
      "Creating opportunities for members through shared financial goals and teamwork.",
    members: 92,
    location: "Nakuru",
  },
];

const officialsByChama = {};

// Projects belonging to each chama
const projectsByChama = {
  1: [
    {
      id: 1,
      name: "Land Investment",
      description:
        "Collective land acquisition project aimed at creating long-term financial value for members.",
        Image: "Public/Icons/Land_Investment.jpg",
        status: "planned",
    },
    {
      id: 2,
      name: "Housing Project",
      description:
        "A long-term housing investment focused on creating affordable housing opportunities.",
    },
  ],

  2: [
    {
      id: 3,
      name: "Agricultural Project",
      description:
        "Supporting members through farming investments and agricultural business opportunities.",
        image: "Public/Icons/Agricultural_Investment.jpg",
        status: "ongoing",
    },
    {
      id: 4,
      name: "Group Savings Project",
      description:
        "Encouraging consistent savings to support members' financial goals.",
    },
  ],

  3: [
    {
      id: 5,
      name: "Youth Empowerment",
      description:
        "Helping young members develop financial skills and build sustainable businesses.",
    },
    {
      id: 6,
      name: "Business Investment",
      description:
        "Pooling resources to invest in small businesses and generate shared income.",
    },
  ],

  4: [
    {
      id: 7,
      name: "Community Farming",
      description:
        "A collective farming initiative designed to improve food production and generate income.",
    },
    {
      id: 8,
      name: "Real Estate Investment",
      description:
        "Building long-term wealth through shared property investment opportunities.",
    },
  ],
};

const ChamaDetails = () => {
  const { chamaId } = useParams();

  // Find the selected chama
  const chama = chamas.find(
    (item) => item.id === Number(chamaId)
  );

  // Handle invalid chama ID
  if (!chama) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="text-2xl font-bold text-[#123D2B]">
          Chama not found
        </h2>

        <p className="mt-3 text-gray-600">
          The chama you are looking for does not exist.
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

  // Get only the selected chama's officials and projects
  const officials = officialsByChama[chama.id] || [];
  const projects = projectsByChama[chama.id] || [];

  return (
    <div className="min-h-screen bg-white">

      {/* Chama Overview */}
      <section className="bg-[#F3F5F3] px-6 py-16 text-center">

        <p className="font-semibold uppercase tracking-wider text-[#1F6B49]">
          Chama information
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#123D2B]">
          {chama.name}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
          {chama.description}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-12">

          <div>
            <p className="text-sm text-gray-500">
              Members
            </p>

            <p className="mt-1 text-xl font-bold text-[#123D2B]">
              {chama.members}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Location
            </p>

            <p className="mt-1 text-xl font-bold text-[#123D2B]">
              {chama.location}
            </p>
          </div>

        </div>
      </section>

      {/* Officials Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <Officials officials={officials} />
      </section>

      {/* Projects Section */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <Projects projects={projects} />
      </section>

      {/* Back Button */}
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

