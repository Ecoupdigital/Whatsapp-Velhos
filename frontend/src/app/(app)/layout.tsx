"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

const COLLAPSE_KEY = "sidebar-collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "true");
    }

    const handleStorage = () => {
      const val = localStorage.getItem(COLLAPSE_KEY);
      setSidebarCollapsed(val === "true");
    };

    window.addEventListener("storage", handleStorage);
    // Also listen for clicks to detect same-tab changes
    const interval = setInterval(() => {
      const val = localStorage.getItem(COLLAPSE_KEY);
      setSidebarCollapsed(val === "true");
    }, 300);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-primary">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-surface-primary">
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 p-6 lg:p-8"
        style={{
          marginLeft: sidebarCollapsed ? 72 : 280,
        }}
      >
        {children}
      </main>
    </div>
  );
}
