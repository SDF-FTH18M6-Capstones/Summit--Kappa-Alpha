import { useId } from "react";

// Reusable building blocks for every page. Colours use the "brand" shade below,
// so when the group picks a palette only these class names need to change.
const BRAND = "bg-blue-700 hover:bg-blue-800 focus-visible:outline-blue-700";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

export function Button({ variant = "primary", loading = false, disabled, className, children, ...props }) {
  const styles = {
    primary: `${BRAND} text-white`,
    secondary: "border border-blue-700 text-blue-700 hover:bg-blue-50 bg-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Input({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(
          "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900",
          "focus:outline focus:outline-2 focus:outline-blue-700",
          error ? "border-red-600" : "border-gray-400",
          className
        )}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cx("text-xs", error ? "text-red-700" : "text-gray-600")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Select({ label, error, options = [], placeholder, ...props }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={cx(
          "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900",
          "focus:outline focus:outline-2 focus:outline-blue-700",
          error ? "border-red-600" : "border-gray-400"
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function Card({ title, className, children }) {
  return (
    <section className={cx("rounded-xl border border-gray-300 bg-white p-4", className)}>
      {title && <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>}
      {children}
    </section>
  );
}

export function Badge({ tone = "gray", children }) {
  const tones = {
    gray: "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
  };
  return <span className={cx("rounded-full px-3 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Alert({ type = "info", children }) {
  const types = {
    info: "border-blue-300 bg-blue-50 text-blue-900",
    success: "border-green-300 bg-green-50 text-green-900",
    error: "border-red-300 bg-red-50 text-red-900",
  };
  return (
    <div role={type === "error" ? "alert" : "status"} className={cx("rounded-lg border p-3 text-sm", types[type])}>
      {children}
    </div>
  );
}