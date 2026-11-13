import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ className = "", ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${className} pr-12`}
      />

      <button
        type="button"
        onClick={() => setShow((previous) => !previous)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-green-800"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}


