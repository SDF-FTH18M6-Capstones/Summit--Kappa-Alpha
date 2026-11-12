
import { NavLink, Outlet, Link } from "react-router-dom";

const navigation = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Officials", path: "/officials" },
  { name: "Chamas", path: "/chamas" },
  { name: "Projects", path: "/projects" },
  { name: "How to Join", path: "/#how-to-join" },
];

export default function PublicLayout() {
  const linkStyle = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? "text-green-800 border-b-2 border-green-800 pb-1"
        : "text-gray-600 hover:text-green-800"
    }`;

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <img
              src="/Public/summit-logo.jpeg"
              alt="Summit"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {navigation.map((item) =>
              item.path === "/#how-to-join" ? (
                <a
                  key={item.name}
                  href="/#how-to-join"
                  className="text-sm font-medium text-gray-600 hover:text-green-800"
                >
                  {item.name}
                </a>
              ) : (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={linkStyle}
                  end={item.path === "/"}
                >
                  {item.name}
                </NavLink>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-green-800 sm:block"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
            >
              Create Account
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-green-950 px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <h2 className="text-xl font-bold">Summit</h2>
            <p className="mt-3 text-sm text-gray-300">
              Building stronger communities through collective savings and
              financial cooperation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Quick Links</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-gray-300">
              <Link to="/">Home</Link>
              <Link to="/about">About</Link>
              <Link to="/officials">Officials</Link>
              <Link to="/projects">Projects</Link>
              <Link to="/chamas">Chamas</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Contact</h3>
            <p className="mt-3 text-sm text-gray-300">
              Email: Summit2026@www.ke
              phone: +254 768987654  +254 765432689
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}



