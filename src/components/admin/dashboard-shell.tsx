"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed,
  ClipboardList,
  Package,
  Tag,
  BarChart3,
  Users,
  ScrollText,
  Menu,
  X,
  Zap,
  QrCode,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
  perm: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Live Orders",
    href: "/dashboard/admin",
    icon: <ClipboardList className="w-4 h-4" />,
    roles: ["admin", "super_admin"],
    perm: "live_orders",
  },
  {
    label: "Products",
    href: "/dashboard/menu/products",
    icon: <Package className="w-4 h-4" />,
    roles: ["menu", "admin", "super_admin"],
    perm: "menu",
  },
  {
    label: "Categories",
    href: "/dashboard/menu/categories",
    icon: <Tag className="w-4 h-4" />,
    roles: ["menu", "admin", "super_admin"],
    perm: "menu",
  },
  {
    label: "Order History",
    href: "/dashboard/super-admin/revenue",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["admin", "super_admin"],
    perm: "revenue",
  },
  {
    label: "Accounts",
    href: "/dashboard/super-admin/accounts",
    icon: <Users className="w-4 h-4" />,
    roles: ["admin", "super_admin"],
    perm: "accounts",
  },
  {
    label: "Audit Logs",
    href: "/dashboard/super-admin/audit",
    icon: <ScrollText className="w-4 h-4" />,
    roles: ["admin", "super_admin"],
    perm: "audit_logs",
  },
  {
    label: "QR Codes",
    href: "/dashboard/super-admin/qr-codes",
    icon: <QrCode className="w-4 h-4" />,
    roles: ["admin", "super_admin"],
    perm: "qr_codes",
  },
];


interface DashboardShellProps {
  profile: { role: UserRole; full_name: string | null; theatre_id: string; permissions: string[] };
  
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (profile.role === "super_admin") return true;
    if (profile.role === "menu") return item.perm === "menu";
    if (profile.role === "admin") return profile.permissions.includes(item.perm);
    return false;
  });
  
  const sidebar = (
    <aside
      className="flex flex-col h-full"
      style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}
        >
          <UtensilsCrossed className="w-4 h-4 text-black" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-white text-sm tracking-tight truncate">CineBites</p>
          <p className="text-[10px] text-white/35 tracking-widest uppercase truncate">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[9px] font-bold tracking-widest uppercase text-white/25">Navigation</p>
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-amber-400 bg-amber-500/10 border border-amber-500/15"
                  : "text-white/45 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <span className={isActive ? "text-amber-400" : "text-white/30"}>{item.icon}</span>
              {item.label}
              {isActive && <Zap className="w-2.5 h-2.5 ml-auto text-amber-500/60" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-56 lg:flex-col lg:flex-shrink-0 z-10" style={{ background: "#0a0a0a" }}>
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/70 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 flex flex-col lg:hidden transition-transform duration-300 ease-out shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0a0a0a" }}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 z-20"
          style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              <UtensilsCrossed className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-display font-semibold text-sm text-white tracking-tight">CineBites</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
