"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

const COLLAPSE_KEY = "sidebar-collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const syncCollapsed = useCallback(() => {
    const val = localStorage.getItem(COLLAPSE_KEY);
    setSidebarCollapsed(val === "true");
  }, []);

  useEffect(() => {
    syncCollapsed();

    const handleStorage = () => syncCollapsed();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncCollapsed]);

  // Callback for Sidebar to notify layout of collapse changes (replaces localStorage polling)
  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
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

  // On mobile: no margin (sidebar hidden, bottom nav shown)
  // On desktop: margin matches sidebar width
  const desktopMargin = sidebarCollapsed ? 72 : 280;

  return (
    <div className="flex min-h-screen bg-surface-primary overflow-x-hidden">
      <Sidebar onCollapseChange={handleCollapseChange} />
      <main
        id="app-main"
        className="flex-1 min-w-0 transition-all duration-300 p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-6 lg:pb-8 overflow-x-hidden"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        {children}
      </main>
      <MobileNav />
      <style>{`
        @media (min-width: 768px) {
          #app-main {
            margin-left: ${desktopMargin}px;
          }
        }
      `}</style>
    </div>
  );
}
