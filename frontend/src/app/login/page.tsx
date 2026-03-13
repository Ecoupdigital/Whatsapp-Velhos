"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao fazer login.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Don't render if still checking auth or already authenticated
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "#0A0A0B",
        backgroundImage:
          "repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(227, 30, 36, 0.03) 40px, rgba(227, 30, 36, 0.03) 41px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-surface-elevated rounded-xl shadow-card border border-border-subtle p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 12px rgba(227, 30, 36, 0.4))",
                  "drop-shadow(0 0 28px rgba(227, 30, 36, 0.7))",
                  "drop-shadow(0 0 12px rgba(227, 30, 36, 0.4))",
                ],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mb-5"
            >
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-brand-red to-red-800",
                  "border-2 border-brand-red/30"
                )}
              >
                <span className="font-display text-3xl font-bold text-white tracking-wider select-none">
                  VP
                </span>
              </div>
            </motion.div>

            <h1 className="font-display font-bold text-2xl text-txt-primary tracking-wider uppercase">
              Velhos Parceiros F.C.
            </h1>
            <p className="mt-1.5 text-xs text-txt-secondary tracking-[0.25em] uppercase font-body">
              Area Administrativa
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-txt-tertiary pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Usuario"
                autoComplete="username"
                autoFocus
                className={cn(
                  "w-full pl-11 pr-4 py-3 rounded-lg",
                  "bg-surface-tertiary border border-border-subtle",
                  "text-txt-primary placeholder:text-txt-tertiary",
                  "font-body text-sm",
                  "outline-none transition-all duration-200",
                  "focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/25",
                  "hover:border-border"
                )}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-txt-tertiary pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Senha"
                autoComplete="current-password"
                className={cn(
                  "w-full pl-11 pr-12 py-3 rounded-lg",
                  "bg-surface-tertiary border border-border-subtle",
                  "text-txt-primary placeholder:text-txt-tertiary",
                  "font-body text-sm",
                  "outline-none transition-all duration-200",
                  "focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/25",
                  "hover:border-border"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-tertiary hover:text-txt-secondary transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-brand-red/10 border border-brand-red/20 px-4 py-2.5 text-sm text-brand-red font-body"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3 rounded-lg font-display font-bold text-base uppercase tracking-wider",
                "text-white transition-all duration-200",
                "bg-gradient-to-r from-brand-red to-red-800",
                "hover:from-brand-red-hover hover:to-red-700",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated",
                "shadow-brand hover:shadow-[0_4px_32px_rgba(227,30,36,0.35)]",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-brand"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-txt-tertiary font-body">
          Velhos Parceiros F.C. &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
