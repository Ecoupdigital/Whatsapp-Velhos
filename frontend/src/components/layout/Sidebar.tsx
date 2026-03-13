"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  Calendar,
  Trophy,
  Ticket,
  Megaphone,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const COLLAPSE_KEY = "sidebar-collapsed";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Jogadores", href: "/jogadores", icon: Users },
      { label: "Mensalidades", href: "/mensalidades", icon: CreditCard },
      { label: "Financeiro", href: "/financeiro", icon: Wallet },
    ],
  },
  {
    title: "EVENTOS",
    items: [
      { label: "Eventos", href: "/eventos", icon: Calendar },
      { label: "Jogos", href: "/jogos", icon: Trophy },
      { label: "Cartoes de Baile", href: "/cartoes-baile", icon: Ticket },
    ],
  },
  {
    title: "COMUNICACAO",
    items: [
      { label: "Promocoes", href: "/promocoes", icon: Megaphone },
      { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      { label: "Configuracoes", href: "/configuracoes", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-surface-sidebar border-r border-border-subtle flex flex-col transition-all duration-300 z-40",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-brand-red flex items-center justify-center shrink-0">
            <span className="font-display text-white text-lg font-bold">
              VP
            </span>
          </div>
          {!collapsed && (
            <span className="font-display text-sm font-bold tracking-wider text-txt-primary logo-glow whitespace-nowrap">
              VELHOS PARCEIROS F.C.
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && "mt-6")}>
            {section.title && !collapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-txt-tertiary uppercase">
                  {section.title}
                </span>
              </div>
            )}
            {section.title && collapsed && (
              <div className="mx-auto w-8 border-t border-border-subtle mb-2" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                        active
                          ? "bg-brand-red-muted text-white border-l-[3px] border-brand-red"
                          : "text-txt-secondary hover:bg-surface-tertiary hover:text-txt-primary border-l-[3px] border-transparent"
                      )}
                    >
                      <Icon
                        size={20}
                        className={cn(
                          "shrink-0",
                          active ? "text-brand-red" : "text-txt-tertiary group-hover:text-txt-secondary"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border-subtle p-2 shrink-0 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-txt-secondary hover:bg-surface-tertiary hover:text-txt-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={20} className="shrink-0 text-txt-tertiary" />
          ) : (
            <ChevronLeft size={20} className="shrink-0 text-txt-tertiary" />
          )}
          {!collapsed && <span>Recolher</span>}
        </button>

        {/* User info + logout */}
        <div
          className={cn(
            "flex items-center rounded-lg px-3 py-2.5",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-txt-secondary">
              {user?.nome?.charAt(0)?.toUpperCase() || "J"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-txt-primary truncate">
                {user?.nome || "Jonathan"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-md text-txt-tertiary hover:text-brand-red hover:bg-surface-tertiary transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
