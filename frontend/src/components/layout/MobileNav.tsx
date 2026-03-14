"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Trophy,
  Menu,
  X,
  Wallet,
  Calendar,
  BarChart3,
  Ticket,
  Megaphone,
  MessageCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainTabs: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Jogadores", href: "/jogadores", icon: Users },
  { label: "Mensalidades", href: "/mensalidades", icon: CreditCard },
  { label: "Jogos", href: "/jogos", icon: Trophy },
];

interface NavSection {
  title: string;
  items: NavItem[];
}

const allSections: NavSection[] = [
  {
    title: "PRINCIPAL",
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
      { label: "Estatisticas", href: "/estatisticas", icon: BarChart3 },
      { label: "Cartoes de Baile", href: "/cartoes", icon: Ticket },
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

export default function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Check if the current path matches any of the main tabs
  const isMainTabActive = mainTabs.some((tab) => isActive(tab.href));
  // If none of the main tabs are active, the "Menu" button should appear active
  const menuIsActive = !isMainTabActive;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 md:hidden",
          "bg-surface-sidebar border-t border-border-subtle",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="flex items-center justify-around h-16">
          {mainTabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                  "transition-colors duration-150",
                  active ? "text-brand-red" : "text-txt-tertiary"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full",
              "transition-colors duration-150",
              menuIsActive ? "text-brand-red" : "text-txt-tertiary"
            )}
          >
            <Menu size={20} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Fullscreen Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-surface-primary overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          {/* Overlay Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-red flex items-center justify-center">
                <span className="font-display text-white text-lg font-bold">
                  VP
                </span>
              </div>
              <span className="font-display text-sm font-bold tracking-wider text-txt-primary logo-glow">
                VELHOS PARCEIROS F.C.
              </span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                "text-txt-tertiary hover:text-txt-primary hover:bg-surface-tertiary",
                "transition-colors duration-150"
              )}
              aria-label="Fechar menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Menu Sections */}
          <div className="px-4 py-4 pb-[env(safe-area-inset-bottom)]">
            {allSections.map((section, sIdx) => (
              <div key={sIdx} className={cn(sIdx > 0 && "mt-6")}>
                <div className="px-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-txt-tertiary uppercase">
                    {section.title}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-brand-red-muted text-white border-l-[3px] border-brand-red"
                              : "text-txt-secondary hover:bg-surface-tertiary hover:text-txt-primary border-l-[3px] border-transparent"
                          )}
                        >
                          <Icon
                            size={20}
                            className={cn(
                              "shrink-0",
                              active
                                ? "text-brand-red"
                                : "text-txt-tertiary"
                            )}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* User section */}
            <div className="mt-8 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-txt-secondary">
                    {user?.nome?.charAt(0)?.toUpperCase() || "J"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">
                    {user?.nome || "Jonathan"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg",
                    "text-sm font-medium text-txt-tertiary",
                    "hover:text-brand-red hover:bg-surface-tertiary",
                    "transition-colors duration-150"
                  )}
                >
                  <LogOut size={18} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
