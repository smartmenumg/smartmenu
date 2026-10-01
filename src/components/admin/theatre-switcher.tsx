"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import { switchTheatre } from "@/lib/admin/theatre-switch-action";
import type { TheatreOption } from "@/lib/theatre-context";
import { cn } from "@/lib/utils";

interface TheatreSwitcherProps {
  theatres: TheatreOption[];
  activeTheatreId: string | null; // null = "all"
  activeTheatreName: string;
}

export function TheatreSwitcher({
  theatres,
  activeTheatreId,
  activeTheatreName,
}: TheatreSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(theatreId: string) {
    setOpen(false);
    startTransition(async () => {
      await switchTheatre(theatreId);
      router.refresh();
    });
  }

  return (
    <div className="relative px-3 pb-2 pt-1">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 border",
          "bg-white/5 border-white/8 hover:bg-white/8 hover:border-white/15",
          open && "bg-white/8 border-amber-500/20"
        )}
      >
        <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          {isPending ? (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          ) : (
            <Building2 className="w-3 h-3 text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold tracking-widest uppercase text-white/30 mb-0.5">
            Theatre
          </p>
          <p className="text-xs font-semibold text-white/80 truncate">
            {isPending ? "Switching…" : activeTheatreName}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50"
            style={{ background: "#111" }}
          >
            {/* All Theatres option */}
            <button
              onClick={() => handleSelect("all")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                activeTheatreId === null
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3 h-3" />
              </div>
              <span className="flex-1 font-medium text-xs">All Theatres</span>
              {activeTheatreId === null && (
                <Check className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Divider */}
            <div className="h-px bg-white/6 mx-3" />

            {/* Individual theatres */}
            <div className="max-h-48 overflow-y-auto py-1">
              {theatres.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    activeTheatreId === t.id
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0 ml-1",
                      t.active ? "bg-emerald-400" : "bg-white/20"
                    )}
                  />
                  <span className="flex-1 font-medium text-xs truncate">
                    {t.name}
                  </span>
                  {activeTheatreId === t.id && (
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
