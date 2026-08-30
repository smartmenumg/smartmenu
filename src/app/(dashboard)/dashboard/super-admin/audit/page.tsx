import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getAuditLogs } from "@/lib/admin/audit-actions";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, TerminalSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Audit Logs | CineBites",
  description: "View system audit logs",
};

export default async function AuditPage() {
  const session = await getCurrentProfile();
  
  if (!session) {
    redirect("/auth/unauthorized");
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
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">
          System Audit Logs
        </h1>
        <p className="text-slate-400">
          Immutable history of critical system events.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-slate-900/80">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium w-48">Timestamp</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium w-48">User</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Action</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Entity Type</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-right">Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow className="border-slate-800/60 hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <ScrollText className="w-8 h-8 text-slate-700 mb-2" />
                    <p>No audit logs found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-200">
                      {log.profiles?.full_name || "System / Guest"}
                    </div>
                    {log.user_id && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.user_id.substring(0, 8)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-sky-500/30 text-sky-400 bg-sky-500/10 rounded-sm font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-300 font-medium">
                      {log.entity_type}
                    </span>
                    {log.entity_id && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {log.entity_id.substring(0, 8)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right max-w-[200px]">
                    <div className="flex justify-end">
                      <div 
                        className="text-left bg-black/40 border border-slate-800 rounded p-2 text-[10px] font-mono text-slate-400 overflow-x-auto"
                        title={JSON.stringify(log.metadata, null, 2)}
                      >
                        <div className="flex items-center gap-1.5 mb-1 opacity-60">
                          <TerminalSquare className="w-3 h-3" />
                          <span>PAYLOAD</span>
                        </div>
                        {Object.keys(log.metadata || {}).length > 0 
                          ? JSON.stringify(log.metadata).substring(0, 40) + "..."
                          : "{}"
                        }
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
