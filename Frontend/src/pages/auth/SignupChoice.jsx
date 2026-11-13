
import { Link } from "react-router-dom";
import { Users, Building2, ArrowRight, ShieldCheck } from "lucide-react";

export default function SignupChoice() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">

      <div className="w-full max-w-5xl">

        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-green-800">
            Summit Chama
          </p>

          <h1 className="text-3xl font-bold text-green-950 md:text-4xl">
            Get Started With Us
          </h1>

          <p className="mt-3 text-gray-600">
            Choose how you would like to get started with Summit Chama.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 text-green-900">
              <Users size={32} />
            </div>

            <h2 className="text-2xl font-bold text-green-950">
              Join an Existing Chama
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              Are you looking to become a member of an existing
              Chama? Submit your details and request to join a
              community that is already registered.
            </p>

            <ul className="my-6 space-y-3 text-sm text-gray-600">
              <li> Find an existing Chama</li>
              <li> Submit a membership request</li>
              <li> Get approved by the Chama admin</li>
            </ul>

            <Link
              to="/join-chama"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Join a Chama
              <ArrowRight size={18} />
            </Link>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 text-green-900">
              <Building2 size={32} />
            </div>

            <h2 className="text-2xl font-bold text-green-950">
              Register a New Chama
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              Are you starting a new savings group? Register your
              Chama, provide its details and create an administrator
              account to manage your community.
            </p>

            <ul className="my-6 space-y-3 text-sm text-gray-600">
              <li> Create your Chama profile</li>
              <li> Provide registration details</li>
              <li> Set up your administrator account</li>
            </ul>

            <Link
              to="/register-chama"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Register Chama
              <ArrowRight size={18} />
            </Link>

          </div>

        </div>
        <div className="mt-8 text-center">

          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-green-800 hover:underline"
            >
              Login here
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <ShieldCheck size={18} className="text-green-800" />
            Your community, your growth, your future.
          </div>

        </div>

      </div>

    </section>
  );
}


