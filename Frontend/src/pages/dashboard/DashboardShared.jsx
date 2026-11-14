
import { useId } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const BRAND = "bg-green-900 text-white hover:bg-green-800";

// Dashboard statistics.
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">
          {title}
        </p>

        {Icon && (
          <div className="rounded-lg bg-green-50 p-2 text-green-900">
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-bold text-green-950">
        {value ?? "—"}
      </h2>

      {description && (
        <p className="mt-1 text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

// Dashboard content panels.
export function Panel({
  title,
  children,
  className = "",
  action,
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className="text-lg font-bold text-gray-900">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}

      {children}
    </section>
  );
}

export function ActionButton({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  className = "",
}) {
  const styles = {
    primary: BRAND,
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant] || styles.primary,
        className
      )}
    >
      {loading && (
        <span
          aria-label="Loading"
          role="status"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  const statusStyles = {
    active: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    paid: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",

    pending: "bg-amber-100 text-amber-900",
    processing: "bg-amber-100 text-amber-900",

    rejected: "bg-red-100 text-red-700",
    overdue: "bg-red-100 text-red-700",
    inactive: "bg-red-100 text-red-700",
    defaulted: "bg-red-100 text-red-700",

    inactive_member: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        statusStyles[normalized] || "bg-gray-100 text-gray-700"
      )}
    >
      {status || "Unknown"}
    </span>
  );
}

export function DataTable({
  columns = [],
  data = [],
  emptyMessage = "No records available.",
  loading = false,
  rowKey = "id",
}) {
  if (loading) {
    return (
      <div
        className="py-8 text-center text-sm text-gray-500"
        role="status"
      >
        Loading records...
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 font-semibold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr
                key={item[rowKey] ?? index}
                className="transition-colors hover:bg-gray-50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-gray-700"
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={Math.max(columns.length, 1)}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Dashboard form field.
export function FormField({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  className = "",
  ...props
}) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-600">*</span>
          )}
        </label>
      )}

      <input
        id={id}
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cx(
          "w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition",
          "placeholder:text-gray-400 focus:border-green-800 focus:ring-2 focus:ring-green-100",
          "disabled:cursor-not-allowed disabled:bg-gray-100",
          error ? "border-red-600" : "border-gray-300",
          className
        )}
        {...props}
      />

      {(error || hint) && (
        <p
          id={messageId}
          className={cx(
            "text-xs",
            error ? "text-red-700" : "text-gray-500"
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

// Dashboard page heading.
export function DashboardHeading({
  title,
  description,
  action,
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-green-950 md:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}



