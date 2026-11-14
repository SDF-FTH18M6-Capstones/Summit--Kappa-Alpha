
import { useId } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const BRAND =
  "bg-green-900 text-white hover:bg-green-800 focus-visible:outline-green-900";

export function Spinner({ className = "h-5 w-5", label = "Loading" }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...props
}) {
  const styles = {
    primary: BRAND,
    secondary:
      "border border-green-900 bg-white text-green-900 hover:bg-green-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant] || styles.primary,
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  hint,
  className,
  id: suppliedId,
  ...props
}) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-800"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-600">*</span>
          )}
        </label>
      )}

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cx(
          "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition",
          "placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-900",
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

export function Select({
  label,
  error,
  hint,
  options = [],
  placeholder,
  className,
  id: suppliedId,
  ...props
}) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-800"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-600">*</span>
          )}
        </label>
      )}

      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cx(
          "min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 transition",
          "focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-900",
          "disabled:cursor-not-allowed disabled:bg-gray-100",
          error ? "border-red-600" : "border-gray-300",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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

export function Card({
  title,
  description,
  action,
  children,
  className,
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      {(title || description || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-base font-bold text-gray-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </section>
  );
}

export function Badge({ tone = "gray", children, className }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone] || tones.gray,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  type = "info",
  title,
  children,
  className,
}) {
  const styles = {
    info: "border-gray-300 bg-gray-50 text-gray-800",
    success: "border-green-300 bg-green-50 text-green-900",
    error: "border-red-300 bg-red-50 text-red-900",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
  };

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cx(
        "rounded-lg border p-4 text-sm",
        styles[type] || styles.info,
        className
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}


