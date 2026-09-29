import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getAuditLogs } from "@/lib/admin/audit-actions";
import type { AuditLogWithUser } from "@/lib/admin/audit-actions";
import { format } from "date-fns";

/** Convert a UTC ISO string / Date to an IST-shifted Date for display (UTC+5:30). */
function toIST(utcValue: string | Date): Date {
  const ms = typeof utcValue === "string" ? new Date(utcValue).getTime() : utcValue.getTime();
  return new Date(ms + 5.5 * 60 * 60 * 1000);
}
import { ScrollText, CheckCircle2, XCircle, User, ShoppingBag, FileText, Image, Moon, Sun } from "lucide-react";

export const metadata: Metadata = {
  title: "Activity Log | CineBites",
  description: "View what your team has been doing in simple English.",
};

export const dynamic = "force-dynamic";

// ─── Translate technical audit entries to plain English ───────────────────────

function translateAction(log: AuditLogWithUser): {
  text: string;
  detail?: string;
  color: string;
  icon: React.ReactNode;
} {
  const who = log.profiles?.full_name ?? "Someone";
  const m = log.metadata ?? {};

  switch (log.action) {
    // ── Orders ────────────────────────────────────────────────────────────
    case "order.accepted":
      return {
        text: `${who} accepted an order`,
        color: "text-blue-600",
        icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
      };
    case "order.status_changed":
      return {
        text: `${who} changed an order status to "${humanStatus(m.new_status as string)}"`,
        color: "text-indigo-600",
        icon: <ShoppingBag className="w-4 h-4 text-indigo-500" />,
      };
    case "order.cancelled":
      return {
        text: `${who} cancelled an order`,
        color: "text-red-600",
        icon: <XCircle className="w-4 h-4 text-red-500" />,
      };

    // ── Products ──────────────────────────────────────────────────────────
    case "product.created":
      return {
        text: `${who} added a new menu item`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: "text-green-600",
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      };
    case "product.updated":
      return {
        text: `${who} updated a menu item`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: "text-slate-600",
        icon: <FileText className="w-4 h-4 text-slate-500" />,
      };
    case "product.availability_changed": {
      const avail = m.available ? "made available" : "marked unavailable";
      return {
        text: `${who} ${avail} a menu item`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: m.available ? "text-green-600" : "text-orange-600",
        icon: <CheckCircle2 className={`w-4 h-4 ${m.available ? "text-green-500" : "text-orange-500"}`} />,
      };
    }
    case "product.deleted":
      return {
        text: `${who} deleted a menu item`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: "text-red-600",
        icon: <XCircle className="w-4 h-4 text-red-500" />,
      };

    // ── Categories ────────────────────────────────────────────────────────
    case "category.created":
      return {
        text: `${who} created a new menu category`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: "text-green-600",
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      };
    case "category.updated":
      return {
        text: `${who} updated a menu category`,
        detail: m.name ? `"${m.name}"` : undefined,
        color: "text-slate-600",
        icon: <FileText className="w-4 h-4 text-slate-500" />,
      };

    // ── Bills ─────────────────────────────────────────────────────────────
    case "bill.printed":
      return {
        text: `${who} printed a customer bill`,
        color: "text-slate-600",
        icon: <FileText className="w-4 h-4 text-slate-500" />,
      };
    case "bill.reprinted":
      return {
        text: `${who} reprinted a customer bill`,
        color: "text-slate-500",
        icon: <FileText className="w-4 h-4 text-slate-500" />,
      };

    // ── Accounts ──────────────────────────────────────────────────────────
    case "account.created":
      return {
        text: `${who} created a new staff account`,
        detail: m.email ? `(${m.email} — ${m.role})` : undefined,
        color: "text-blue-600",
        icon: <User className="w-4 h-4 text-blue-500" />,
      };
    case "account.disabled":
      return {
        text: `${who} disabled a staff account`,
        color: "text-red-600",
        icon: <XCircle className="w-4 h-4 text-red-500" />,
      };
    case "account.enabled":
      return {
        text: `${who} re-enabled a staff account`,
        color: "text-green-600",
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      };
    case "account.updated":
      return {
        text: `${who} updated a staff account`,
        color: "text-slate-600",
        icon: <User className="w-4 h-4 text-slate-500" />,
      };

    // ── Payments ──────────────────────────────────────────────────────────
    case "payment.verified":
      return {
        text: "A customer payment was verified successfully",
        color: "text-green-600",
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      };
    case "payment.webhook_received":
      return {
        text: "A payment status update was received from the gateway",
        color: "text-slate-500",
        icon: <CheckCircle2 className="w-4 h-4 text-slate-500" />,
      };

    // ── Images ────────────────────────────────────────────────────────────
    case "image.uploaded":
      return {
        text: `${who} uploaded a new image`,
        color: "text-slate-600",
        icon: <Image className="w-4 h-4 text-slate-500" />,
      };

    // ── Day End ───────────────────────────────────────────────────────────
    case "day.ended":
      return {
        text: `${who} ended the business day — orders were blocked`,
        color: "text-orange-600",
        icon: <Moon className="w-4 h-4 text-orange-500" />,
      };
    case "day.started":
      return {
        text: `${who} started accepting orders again`,
        color: "text-green-600",
        icon: <Sun className="w-4 h-4 text-green-500" />,
      };

    // ── Fallback ──────────────────────────────────────────────────────────
    default:
      return {
        text: `${who} performed: ${log.action.replace(/\./g, " ")}`,
        color: "text-slate-500",
        icon: <ScrollText className="w-4 h-4 text-slate-500" />,
      };
  }
}

function humanStatus(status: string): string {
  const map: Record<string, string> = {
    confirmed: "Confirmed",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready to Pick Up",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export default async function AuditPage() {
  const session = await getCurrentProfile();

  if (!session) {
    redirect("/auth/login");
  }

  const { role, permissions } = session.profile;
  const hasAccess =
    role === "super_admin" ||
    (role === "admin" && permissions?.includes("audit_logs"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  const logs = await getAuditLogs();

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          A record of everything your team has done — in plain English.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-20 text-center">
            <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No activity recorded yet.</p>
            <p className="text-slate-500 text-sm mt-1">Actions taken by your team will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const { text, detail, color, icon } = translateAction(log);
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="mt-0.5 flex-shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${color}`}>
                      {text}
                      {detail && <span className="text-slate-500 font-normal ml-1">{detail}</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(toIST(log.created_at), "dd MMM yyyy, h:mm a")} IST
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
