"use client";

import { useState, useTransition, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AuditoriumWithLayout, SeatLayout, SeatRow, saveSeatLayout, getSignedQrUrls } from "@/lib/admin/qr-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  QrCode,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
} from "lucide-react";

interface QRManagerClientProps {
  auditoriums: AuditoriumWithLayout[];
  baseUrl: string;
  initialSignedUrls: Record<string, Record<string, string>>;
}

export function QRManagerClient({ auditoriums, baseUrl: serverBaseUrl, initialSignedUrls }: QRManagerClientProps) {
  const [selectedAudiId, setSelectedAudiId] = useState<string>(auditoriums[0]?.id ?? "");
  const [layouts, setLayouts] = useState<Record<string, SeatLayout>>(() => {
    const init: Record<string, SeatLayout> = {};
    for (const a of auditoriums) {
      init[a.id] = a.seat_layout?.rows?.length > 0 ? a.seat_layout : { rows: [] };
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Signed URLs — pre-generated server-side per audi
  const [signedUrls, setSignedUrls] = useState<Record<string, Record<string, string>>>(initialSignedUrls);
  const [isPrinting, setIsPrinting] = useState(false);

  // Editable base URL — defaults to server-detected, but admin can override
  // On first client render, use window.location.origin for accuracy
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(serverBaseUrl);
  useEffect(() => {
    const origin = window.location.origin;
    // Only override if server sent localhost (local dev)
    if (serverBaseUrl.includes("localhost") || serverBaseUrl.includes("127.0.0.1")) {
      // eslint-disable-next-line
      setCustomBaseUrl(origin);
    }
  }, [serverBaseUrl]);

  const isLocalhost = customBaseUrl.includes("localhost") || customBaseUrl.includes("127.0.0.1");

  const selectedAudi = auditoriums.find((a) => a.id === selectedAudiId);
  const currentLayout = layouts[selectedAudiId] ?? { rows: [] };

  const updateLayout = (newLayout: SeatLayout) => {
    setLayouts((prev) => ({ ...prev, [selectedAudiId]: newLayout }));
    setSaveStatus("idle");
  };

  const addRow = () => {
    updateLayout({ rows: [...currentLayout.rows, { name: "", from: 1, to: 10 }] });
  };

  const removeRow = (index: number) => {
    updateLayout({ rows: currentLayout.rows.filter((_, i) => i !== index) });
  };

  const updateRow = (index: number, field: keyof SeatRow, value: string | number) => {
    const rows = currentLayout.rows.map((row, i) =>
      i === index ? { ...row, [field]: field === "name" ? value : Number(value) } : row
    );
    updateLayout({ rows });
  };

  const handleSave = () => {
    if (currentLayout.rows.length === 0) return;
    startTransition(async () => {
      setSaveStatus("idle");
      setSaveError(null);
      try {
        const result = await saveSeatLayout(selectedAudiId, currentLayout);
        if (result.error) {
          setSaveStatus("error");
          setSaveError(result.error);
        } else {
          setSaveStatus("saved");
          // Auto-clear after 3s
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      } catch (err: unknown) {
        setSaveStatus("error");
        setSaveError(err instanceof Error ? err.message : "Unexpected error — check console.");
      }
    });
  };

  // Generate all seat codes for the current audi
  const allSeats = currentLayout.rows.flatMap((row) => {
    const seats = [];
    for (let s = row.from; s <= row.to; s++) {
      seats.push(`${row.name}${s}`);
    }
    return seats;
  });

  const totalSeats = allSeats.length;

  // Unsigned preview URL (fast, only for on-screen preview)
  const makePreviewUrl = (seat: string) =>
    `${customBaseUrl}/order?audi=${selectedAudiId}&seat=${encodeURIComponent(seat)}&sig=preview`;

  // The URL to use for each seat — prefer server-pre-signed, fall back to preview
  const currentSignedUrls = signedUrls[selectedAudiId] ?? {};
  const getPrintUrl = (seat: string) =>
    currentSignedUrls[seat] ?? makePreviewUrl(seat);

  const handlePrint = async () => {
    // If not signed yet for this audi, fetch via server action before printing
    if (!signedUrls[selectedAudiId] || Object.keys(signedUrls[selectedAudiId] ?? {}).length === 0) {
      setIsPrinting(true);
      try {
        const signed = await getSignedQrUrls(selectedAudiId, allSeats, customBaseUrl);
        setSignedUrls(prev => ({ ...prev, [selectedAudiId]: signed }));
        await new Promise((r) => setTimeout(r, 150));
      } finally {
        setIsPrinting(false);
      }
    }
    window.print();
  };

  // No useEffect needed — signed URLs come pre-generated from the server.

  return (
    <>
      {/* ─── Screen-only UI ─────────────────────────────────────────── */}
      <div className="print:hidden max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">
            QR Code Manager
          </h1>
          <p className="text-slate-400">
            Configure seat layouts and generate print-ready QR codes for every seat.
          </p>
        </div>

        {/* Auditoriums Overview / Quick Select */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {auditoriums.map((a) => {
            // Read from our local state so it updates instantly when they save
            const layout = layouts[a.id];
            const numRows = layout?.rows?.length || 0;
            const isConfigured = numRows > 0;
            const totalSeatsInAudi = layout?.rows?.reduce((acc, row) => acc + (row.to - row.from + 1), 0) || 0;

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAudiId(a.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAudiId === a.id
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40"
                    : "bg-slate-900/50 border-slate-800 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${selectedAudiId === a.id ? "text-amber-400" : "text-white"}`}>
                    {a.name}
                  </span>
                  {isConfigured ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Empty
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {isConfigured ? `${numRows} rows · ${totalSeatsInAudi} seats` : "No layout set"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Base URL field */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" />
            <Label className="text-sm text-slate-300 font-medium">Menu URL</Label>
            <span className="text-xs text-slate-600">(used in QR codes — must be reachable by customers&apos; phones)</span>
          </div>
          <Input
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value.replace(/\/$/, ""))}
            placeholder="https://your-app.vercel.app"
            className="bg-slate-800/80 border-slate-700 text-white font-mono text-sm"
          />
          {isLocalhost && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>
                <strong>Localhost detected.</strong> QR codes pointing to localhost only work on the same device.
                To test on mobile, replace this with your machine&apos;s local IP (e.g. <code>http://192.168.x.x:3000</code>) or deploy first and paste your production URL here.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Left: Seat Layout Editor ── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-slate-400 text-sm shrink-0">Auditorium</Label>
                <Select value={selectedAudiId} onValueChange={(v) => v && setSelectedAudiId(v)}>
                  <SelectTrigger className="w-[180px] bg-slate-900/60 border-slate-700 text-white h-8 text-sm">
                    <SelectValue placeholder="Select auditorium">
                      {selectedAudi?.name ?? "Select auditorium"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {auditoriums.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-white hover:bg-slate-700">
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Row
              </Button>
            </div>

            {currentLayout.rows.length === 0 ? (
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-10 text-center">
                <QrCode className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No rows yet. Click &quot;Add Row&quot; to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[72px_1fr_1fr_36px] gap-2 px-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Row</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">From</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">To</span>
                  <span />
                </div>
                {currentLayout.rows.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[72px_1fr_1fr_36px] gap-2 items-center bg-slate-900/50 border border-slate-800 rounded-lg p-2.5"
                  >
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value.toUpperCase())}
                      placeholder="A"
                      maxLength={6}
                      className="bg-slate-800/80 border-slate-700 text-white font-mono text-center h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={row.from}
                      onChange={(e) => updateRow(index, "from", e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={row.from}
                      value={row.to}
                      onChange={(e) => updateRow(index, "to", e.target.value)}
                      className="bg-slate-800/80 border-slate-700 text-white h-8 text-sm"
                    />
                    <button
                      onClick={() => removeRow(index)}
                      className="h-8 w-8 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={isPending || currentLayout.rows.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Layout
              </Button>
              {saveStatus === "saved" && (
                <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {saveError}
                </span>
              )}
            </div>

            {/* Summary */}
            {currentLayout.rows.length > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 space-y-1.5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Layout Summary</p>
                {currentLayout.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold text-amber-400 w-10">{row.name}</span>
                    <span className="text-slate-500">Seats {row.from}–{row.to}</span>
                    <span className="ml-auto text-slate-600 text-xs">{row.to - row.from + 1} seats</span>
                  </div>
                ))}
                <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="text-white font-semibold">{totalSeats} seats</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: QR Preview ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-500" />
                Preview — {totalSeats} codes
              </h2>
              <Button
                onClick={handlePrint}
                disabled={totalSeats === 0 || isPrinting}
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
              >
                {isPrinting
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <Printer className="w-3.5 h-3.5 mr-1.5" />}
                {isPrinting ? "Signing..." : "Print All"}
              </Button>
            </div>

            {totalSeats === 0 ? (
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-500 text-sm">Configure rows on the left to see QR codes.</p>
              </div>
            ) : (
              <div
                className="grid gap-2 max-h-[560px] overflow-y-auto pr-1"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
              >
                {allSeats.map((seat) => (
                  <div
                    key={seat}
                    className="flex flex-col items-center gap-1.5 bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm"
                  >
                    <QRCodeSVG value={makePreviewUrl(seat)} size={90} level="H" includeMargin={false} />
                    <div className="text-center leading-tight">
                      <p className="text-[10px] font-medium text-slate-500">{selectedAudi?.name}</p>
                      <p className="text-slate-900 text-lg font-black">{seat}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Print-only layout ────────────────────────────────────────── */}
      {/* This div is hidden on screen and only visible when printing */}
      <div className="hidden print:block">
        <div style={{ padding: "8mm" }}>
          <h2 style={{ fontFamily: "sans-serif", fontSize: "14pt", marginBottom: "6mm", fontWeight: "bold" }}>
            {selectedAudi?.name} — QR Codes
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "4mm",
            }}
          >
            {allSeats.map((seat) => (
              <div
                key={seat}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2mm",
                  padding: "3mm",
                  border: "1px solid #ccc",
                  borderRadius: "3mm",
                  pageBreakInside: "avoid",
                  backgroundColor: "white",
                }}
              >
                <QRCodeSVG value={getPrintUrl(seat)} size={100} level="H" includeMargin={false} />
                <div style={{ textAlign: "center", fontFamily: "sans-serif", lineHeight: 1.2 }}>
                  <div style={{ fontSize: "7pt", color: "#666" }}>{selectedAudi?.name}</div>
                  <div style={{ fontSize: "14pt", fontWeight: "900", color: "#111" }}>{seat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
