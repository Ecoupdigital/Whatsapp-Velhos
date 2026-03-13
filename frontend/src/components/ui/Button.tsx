"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "icon";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-gradient-to-r from-brand-red to-brand-red-hover",
    "text-white font-semibold",
    "shadow-brand",
    "hover:shadow-brand/60 hover:brightness-110",
    "active:brightness-95",
    "disabled:from-brand-red-muted disabled:to-brand-red-muted disabled:shadow-none",
  ].join(" "),
  secondary: [
    "bg-transparent",
    "border border-border",
    "text-txt-primary",
    "hover:bg-surface-tertiary hover:border-border-strong",
    "active:bg-surface-secondary",
    "disabled:text-txt-tertiary disabled:border-border-subtle",
  ].join(" "),
  danger: [
    "bg-red-600/20",
    "border border-red-500/40",
    "text-red-400",
    "hover:bg-red-600/30 hover:border-red-500/60",
    "active:bg-red-600/40",
    "disabled:opacity-50",
  ].join(" "),
  icon: [
    "bg-surface-tertiary",
    "border border-border-subtle",
    "text-txt-secondary",
    "hover:bg-surface-card-hover hover:text-txt-primary hover:border-border",
    "active:bg-surface-secondary",
    "disabled:text-txt-tertiary disabled:border-border-subtle",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2.5 rounded-lg",
};

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: "h-8 w-8 rounded-md",
  md: "h-10 w-10 rounded-lg",
  lg: "h-12 w-12 rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isIconOnly = variant === "icon" || (!children && icon);
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "inline-flex items-center justify-center",
          "font-body font-medium",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary",
          "disabled:cursor-not-allowed disabled:pointer-events-none",
          "select-none",
          variantStyles[variant],
          isIconOnly ? iconOnlySizes[size] : sizeStyles[size],
          className
        )}
        disabled={isDisabled}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading ? (
          <Loader2
            className={cn(
              "animate-spin",
              size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
            )}
          />
        ) : icon ? (
          <span
            className={cn(
              "flex-shrink-0",
              size === "sm" ? "[&>svg]:h-3.5 [&>svg]:w-3.5" : size === "lg" ? "[&>svg]:h-5 [&>svg]:w-5" : "[&>svg]:h-4 [&>svg]:w-4"
            )}
          >
            {icon}
          </span>
        ) : null}
        {!isIconOnly && children && (
          <span className={loading ? "opacity-0" : undefined}>
            {loading ? null : children}
          </span>
        )}
        {loading && !isIconOnly && children && (
          <span className="sr-only">Carregando...</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
