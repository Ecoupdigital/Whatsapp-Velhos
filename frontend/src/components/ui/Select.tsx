"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      className,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-txt-secondary font-body"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full h-10 rounded-lg",
              "bg-surface-tertiary",
              "border border-border",
              "text-txt-primary text-sm font-body",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red",
              "hover:border-border-strong",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "appearance-none",
              "pl-3 pr-9",
              error && "border-red-500 focus:ring-red-500/50 focus:border-red-500",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error && selectId ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-txt-tertiary pointer-events-none"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p
            id={selectId ? `${selectId}-error` : undefined}
            className="text-xs text-red-400 font-body"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps, type SelectOption };
