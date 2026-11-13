
import { useId } from "react";

// Summit brand colours: dark green, white and grey.
const BRAND = "bg-green-900 text-white hover:bg-green-800";

// Summary cards used at the top of dashboards.
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>

        {Icon && (
          <div className="rounded-lg bg-green-50 p-2 text-green-800">
            <Icon size={20} />
          </div>
        )}
      </div>

      <h2 className="mt-3 text-2xl font-bold text-green-950">
        {value}
      </h2>

      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

// Reusable white content panels.
export function Panel({
  title,
  children,
  className = "",
  action,
}) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}

// Reusable dashboard buttons.
export function ActionButton({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}) {
  const styles =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : BRAND;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

// Status labels for members, loans and requests.
export function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  let styles = "bg-gray-100 text-gray-700";

  if (["active", "approved", "paid"].includes(normalized)) {
    styles = "bg-green-100 text-green-800";
  } else if (["pending", "processing"].includes(normalized)) {
    styles = "bg-yellow-50 text-yellow-800";
  } else if (["rejected", "overdue", "inactive", "defaulted"].includes(normalized)) {
    styles = "bg-red-100 text-red-700";
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status || "Unknown"}
    </span>
  );
}

// Reusable table wrapper.
export function DataTable({ columns, data, emptyMessage = "No records available." }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={item.id ?? index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-gray-700">
                    {column.render
                      ? column.render(item)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
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

// Reusable form field.
export function FormField({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

// Reusable section heading for each dashboard.
export function DashboardHeading({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-green-950 md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}

