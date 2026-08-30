"use client";

import { useState, useTransition } from "react";
import { ProfileWithEmail, toggleProfileActive, updateProfileRole } from "@/lib/admin/account-actions";
import { UserRole } from "@/types/database";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, AlertCircle } from "lucide-react";

interface AccountsClientProps {
  initialProfiles: ProfileWithEmail[];
  currentUserId: string;
}



export function AccountsClient({ initialProfiles, currentUserId }: AccountsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggleActive = (profileId: string, currentStatus: boolean) => {
    startTransition(async () => {
      setError(null);
      const res = await toggleProfileActive(profileId, currentStatus);
      if (res.error) setError(res.error);
    });
  };

  const handleRoleChange = (profileId: string, newRole: UserRole) => {
    startTransition(async () => {
      setError(null);
      const res = await updateProfileRole(profileId, newRole);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-slate-900/80">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">User</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Role</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-center">Status</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Joined</TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProfiles.length === 0 ? (
              <TableRow className="border-slate-800/60 hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  No accounts found.
                </TableCell>
              </TableRow>
            ) : (
              initialProfiles.map((profile) => {
                const isMe = profile.id === currentUserId;

                return (
                  <TableRow key={profile.id} className="border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            {profile.full_name || "Unknown User"}
                            {isMe && <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">YOU</span>}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{profile.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={profile.role} 
                        onValueChange={(val) => handleRoleChange(profile.id, val as UserRole)}
                        disabled={isPending || isMe}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="menu">Menu Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        profile.active 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {profile.active ? "Active" : "Suspended"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending || isMe}
                        onClick={() => handleToggleActive(profile.id, profile.active)}
                        className={`h-8 text-xs ${
                          profile.active
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {profile.active ? "Suspend" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
