"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "py-12 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4",
            "h-14 w-14 rounded-xl",
            "bg-surface-tertiary border border-border-subtle",
            "flex items-center justify-center",
            "text-txt-tertiary",
            "[&>svg]:h-6 [&>svg]:w-6"
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-txt-primary font-display mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-txt-tertiary font-body max-w-xs mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
