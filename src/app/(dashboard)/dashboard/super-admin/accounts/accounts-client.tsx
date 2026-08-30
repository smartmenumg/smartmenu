"use client";

import { useState, useTransition } from "react";
import {
  ProfileWithEmail,
  toggleProfileActive,
  updateProfileRole,
  createStaffAccount,
} from "@/lib/admin/account-actions";
import { UserRole } from "@/types/database";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  AlertCircle,
  UserPlus,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Shield,
  Wrench,
} from "lucide-react";

interface AccountsClientProps {
  initialProfiles: ProfileWithEmail[];
  currentUserId: string;
}

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ReactNode; color: string }
> = {
  super_admin: {
    label: "Super Admin",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    color: "text-amber-400",
  },
  admin: {
    label: "Admin",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "text-blue-400",
  },
  menu: {
    label: "Menu Manager",
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: "text-slate-400",
  },
};

// ─── Create Staff Modal ───────────────────────────────────────────────────────

function CreateStaffModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "menu",
  });

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const res = await createStaffAccount(form);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 1400);
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Create Staff Account
                </h2>
                <p className="text-xs text-slate-500">
                  New user can sign in immediately
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-emerald-300 font-semibold text-sm">
                  Account created successfully!
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    required
                    value={form.full_name}
                    onChange={set("full_name")}
                    placeholder="e.g. Priya Sharma"
                    className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="staff@example.com"
                    className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      required
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Min 12 chars, mixed case + symbol"
                      className="bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Must be at least 12 characters with uppercase, lowercase,
                    number &amp; symbol.
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Role
                  </Label>
                  <select
                    value={form.role}
                    onChange={set("role")}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-white text-sm outline-none focus:border-amber-500/50 transition-colors"
                  >
                    <option value="admin">Admin — full order &amp; menu management</option>
                    <option value="menu">Menu Manager — menu editing only</option>
                  </select>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AccountsClient({
  initialProfiles,
  currentUserId,
}: AccountsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
      {/* Create modal */}
      {showCreate && (
        <CreateStaffModal onClose={() => setShowCreate(false)} />
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {initialProfiles.length} account
          {initialProfiles.length !== 1 ? "s" : ""} in your theatre
        </p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-9 text-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-md">
        <Table>
          <TableHeader className="bg-slate-900/80">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">
                User
              </TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">
                Role
              </TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-center">
                Status
              </TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">
                Joined
              </TableHead>
              <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProfiles.length === 0 ? (
              <TableRow className="border-slate-800/60 hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-slate-500"
                >
                  No accounts yet.{" "}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-amber-400 hover:underline"
                  >
                    Create the first one →
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              initialProfiles.map((profile) => {
                const isMe = profile.id === currentUserId;
                const roleMeta = ROLE_META[profile.role];

                return (
                  <TableRow
                    key={profile.id}
                    className="border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                            {profile.full_name || "Unknown User"}
                            {isMe && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {profile.id.substring(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role selector */}
                    <TableCell>
                      {profile.role === "super_admin" ? (
                        <div className={`flex items-center gap-1.5 px-3 h-8 ${roleMeta.color}`}>
                          {roleMeta.icon}
                          <span className="text-xs">{roleMeta.label}</span>
                        </div>
                      ) : (
                        <Select
                          value={profile.role}
                          onValueChange={(val) =>
                            handleRoleChange(profile.id, val as UserRole)
                          }
                          disabled={isPending || isMe}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-200">
                            <SelectValue>
                              <span
                                className={`flex items-center gap-1.5 ${ROLE_META[profile.role as UserRole].color}`}
                              >
                                {ROLE_META[profile.role as UserRole].icon}
                                {ROLE_META[profile.role as UserRole].label}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {(
                              Object.entries(ROLE_META) as [
                                UserRole,
                                (typeof ROLE_META)[UserRole]
                              ][]
                            )
                              .filter(([role]) => role !== "super_admin")
                              .map(([role, meta]) => (
                              <SelectItem
                                key={role}
                                value={role}
                                className="text-white hover:bg-slate-700"
                              >
                                <span
                                  className={`flex items-center gap-1.5 ${meta.color}`}
                                >
                                  {meta.icon}
                                  {meta.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          profile.active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {profile.active ? "Active" : "Suspended"}
                      </span>
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="text-sm text-slate-400">
                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending || isMe}
                        onClick={() =>
                          handleToggleActive(profile.id, profile.active)
                        }
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
