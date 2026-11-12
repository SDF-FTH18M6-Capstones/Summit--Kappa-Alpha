
export default function About() {
  const values = [
    {
      title: "Transparency",
      description:
        "We encourage openness and accountability in all group activities.",
    },
    {
      title: "Unity",
      description:
        "We believe members achieve more when they work together.",
    },
    {
      title: "Financial Growth",
      description:
        "We promote responsible saving, borrowing, and financial planning.",
    },
  ];

  return (
    <div>
      <section className="bg-green-950 px-6 py-20 text-center text-white">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-300">
          Get to Know Us
        </p>
        <h1 className="text-4xl font-bold md:text-5xl">About Our Chama</h1>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-300">
          Learn about our community, our purpose, and our commitment to
          supporting members through collective financial growth.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="font-semibold text-green-800">OUR STORY</p>
          <h2 className="mt-3 text-3xl font-bold text-green-950">
            Growing Stronger Together
          </h2>
          <p className="mt-5 leading-8 text-gray-600">
            Our Chama was established to bring community members together
            through collective savings and financial support. It was formed
            to encourage financial discipline, strengthen relationships,
            and create opportunities for members to achieve their shared
            financial goals.
          </p>
          <p className="mt-4 leading-8 text-gray-600">
            Our members work together by making regular savings and
            contributions, attending meetings, and supporting one another
            financially. Through teamwork, accountability, and shared
            decision-making, we aim to improve the financial well-being
            of every member.
          </p>
        </div>

        <div className="flex min-h-72 items-center justify-center rounded-2xl bg-green-100 p-10">
          <div className="text-center">
            <span className="text-6xl"></span>
            <h3 className="mt-4 text-2xl font-bold text-green-950">
              Together We Grow
            </h3>
            <p className="mt-2 text-gray-600">
              A community built on trust and shared goals.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="font-semibold text-green-800">WHAT GUIDES US</p>
            <h2 className="mt-2 text-3xl font-bold text-green-950">
              Our Core Values
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-bold text-green-900">
                  {value.title}
                </h3>
                <p className="mt-3 leading-7 text-gray-600">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}



