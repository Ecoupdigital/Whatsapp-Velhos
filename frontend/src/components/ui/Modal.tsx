"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
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
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
};

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      // Save scroll position and lock body
      scrollPosRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollPosRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (open) {
        // Restore scroll position
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollPosRef.current);
      }
    };
  }, [open, handleKeyDown]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlay && e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={backdropRef}
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          >
            {/* Mobile: near-fullscreen (inset-2), Desktop: centered with max-w */}
            <div className="flex min-h-full items-center justify-center p-2 md:p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 400, damping: 30 },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: 20,
                  transition: { duration: 0.15 },
                }}
                className={cn(
                  "relative w-full",
                  // Mobile: near-fullscreen with safe-area padding
                  "my-0 md:my-8",
                  "min-h-[calc(100vh-1rem)] md:min-h-0",
                  "max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-4rem)]",
                  "overflow-y-auto",
                  // Desktop: respect size map (mobile is full-width)
                  sizeMap[size],
                  "bg-surface-elevated",
                  "border border-border",
                  "rounded-lg md:rounded-xl shadow-2xl shadow-black/40",
                  // Safe area padding for iOS
                  "pb-[env(safe-area-inset-bottom)]",
                  className
                )}
                style={{
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className={cn(
                    "absolute top-3 right-3 z-10",
                    "h-10 w-10 md:h-8 md:w-8 rounded-lg",
                    "flex items-center justify-center",
                    "text-txt-tertiary",
                    "hover:text-txt-primary hover:bg-surface-tertiary",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                  )}
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5 md:h-4 md:w-4" />
                </button>

                {children}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}

/* ─── Modal sections ───────────────────────────────────────── */

interface ModalSectionProps {
  children: ReactNode;
  className?: string;
}

function ModalHeader({ children, className }: ModalSectionProps) {
  return (
    <div className={cn("px-5 pt-5 pb-3 border-b border-border-subtle", className)}>
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
  return <div className={cn("px-4 md:px-5 py-4 overflow-y-auto", className)}>{children}</div>;
}

function ModalFooter({ children, className }: ModalSectionProps) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-border-subtle flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalBody, ModalFooter, type ModalProps };
