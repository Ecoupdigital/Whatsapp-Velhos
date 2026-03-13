"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, padding = "md", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-card rounded-xl",
          "border border-border-subtle",
          "shadow-card",
          paddingMap[padding],
          hoverable && [
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
            "hover:border-border hover:bg-surface-card-hover",
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/* ─── DiagonalCard ─────────────────────────────────────────── */

interface DiagonalCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  cutSize?: number;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const DiagonalCard = forwardRef<HTMLDivElement, DiagonalCardProps>(
  (
    {
      children,
      cutSize = 32,
      hoverable = true,
      padding = "md",
      className,
      style,
      ...props
    },
    ref
  ) => {
    const clipPath = `polygon(0 0, calc(100% - ${cutSize}px) 0, 100% ${cutSize}px, 100% 100%, 0 100%)`;

    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-card",
          "border border-border-subtle",
          "shadow-card",
          paddingMap[padding],
          hoverable && [
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
            "hover:border-border hover:bg-surface-card-hover",
          ],
          className
        )}
        style={{ clipPath, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DiagonalCard.displayName = "DiagonalCard";

/* ─── CardHeader / CardBody / CardFooter ───────────────────── */

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function CardHeader({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        "pb-3 mb-3 border-b border-border-subtle",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardBody({ children, className, ...props }: CardSectionProps) {
  return (
    <div className={cn("flex-1", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2",
        "pt-3 mt-3 border-t border-border-subtle",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Card,
  DiagonalCard,
  CardHeader,
  CardBody,
  CardFooter,
  type CardProps,
  type DiagonalCardProps,
};
