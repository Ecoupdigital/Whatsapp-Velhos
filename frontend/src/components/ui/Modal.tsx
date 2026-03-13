"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlay?: boolean;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay - fixed, covers everything */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Scroll wrapper - fixed, above overlay */}
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ pointerEvents: "none" }}
          >
            <div className="flex min-h-full items-start justify-center p-4 py-8 sm:py-12">
              {/* Modal container */}
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 350, damping: 30 },
                }}
                exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }}
                className={cn(
                  "relative w-full",
                  sizeMap[size],
                  "bg-surface-elevated",
                  "border border-border",
                  "rounded-xl shadow-2xl shadow-black/40",
                  className
                )}
                style={{ pointerEvents: "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className={cn(
                    "absolute top-3 right-3 z-10",
                    "h-8 w-8 rounded-lg",
                    "flex items-center justify-center",
                    "text-txt-tertiary",
                    "hover:text-txt-primary hover:bg-surface-tertiary",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                  )}
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>

                {children}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Modal sections ───────────────────────────────────────── */

interface ModalSectionProps {
  children: ReactNode;
  className?: string;
}

function ModalHeader({ children, className }: ModalSectionProps) {
  return (
    <div
      className={cn(
        "px-5 pt-5 pb-3",
        "border-b border-border-subtle",
        className
      )}
    >
      {typeof children === "string" ? (
        <h2 className="text-lg font-semibold text-txt-primary font-display">
          {children}
        </h2>
      ) : (
        children
      )}
    </div>
  );
}

function ModalBody({ children, className }: ModalSectionProps) {
  return (
    <div className={cn("px-5 py-4", className)}>
      {children}
    </div>
  );
}

function ModalFooter({ children, className }: ModalSectionProps) {
  return (
    <div
      className={cn(
        "px-5 py-3",
        "border-t border-border-subtle",
        "flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalProps,
};
