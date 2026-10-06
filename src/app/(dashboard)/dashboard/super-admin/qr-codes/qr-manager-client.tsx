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
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  Download,
} from "lucide-react";

interface QRManagerClientProps {
  theatreId?: string;
  theatreName?: string;
  auditoriums: AuditoriumWithLayout[];
  baseUrl: string;
  initialSignedUrls: Record<string, Record<string, string>>;
}

export function QRManagerClient({
  theatreName,
  auditoriums,
  baseUrl: serverBaseUrl,
  initialSignedUrls,
}: QRManagerClientProps) {
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Sync state if auditoriums or initialSignedUrls change (e.g. theatre switch)
  useEffect(() => {
    if (auditoriums && auditoriums.length > 0) {
      setSelectedAudiId((prev) =>
        auditoriums.some((a) => a.id === prev) ? prev : auditoriums[0].id
      );
      const init: Record<string, SeatLayout> = {};
      for (const a of auditoriums) {
        init[a.id] = a.seat_layout?.rows?.length > 0 ? a.seat_layout : { rows: [] };
      }
      setLayouts(init);
      setSignedUrls(initialSignedUrls);
      setSaveStatus("idle");
    }
  }, [auditoriums, initialSignedUrls]);

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
    // If we have added or removed seats, fetch the latest signatures before printing
    if (Object.keys(currentSignedUrls).length !== allSeats.length) {
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

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Ensure we have signed URLs
      let urlsToUse = currentSignedUrls;
      if (Object.keys(currentSignedUrls).length !== allSeats.length) {
        const signed = await getSignedQrUrls(selectedAudiId, allSeats, customBaseUrl);
        setSignedUrls(prev => ({ ...prev, [selectedAudiId]: signed }));
        urlsToUse = signed;
      }

      const jsPDF = (await import("jspdf")).default;
      const QRCode = (await import("qrcode")).default;

      // Physical page: 280mm x 140mm (2:1 landscape)
      const W_MM = 280;
      const H_MM = 140;

      // Offscreen canvas at high DPI for sharp rendering (4px per mm)
      const SCALE = 4;
      const W_PX = W_MM * SCALE;
      const H_PX = H_MM * SCALE;
      const M = 48; // margin px (=12mm)

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [W_MM, H_MM] });
      const audiName = selectedAudi?.name ?? "Screen";

      // Pre-load the premium highly-detailed food icons image
      const premiumIconsImg = new Image();
      await new Promise<void>((resolve, reject) => {
        premiumIconsImg.onload = () => resolve();
        premiumIconsImg.onerror = () => reject(new Error("Failed to load food icons image"));
        premiumIconsImg.src = "/food-icons.jpg";
      });

      for (let i = 0; i < allSeats.length; i++) {
        const seat = allSeats[i];
        const url = urlsToUse[seat] ?? makePreviewUrl(seat);

        if (i > 0) pdf.addPage([W_MM, H_MM], "landscape");

        // ── Offscreen Canvas ─────────────────────────────────────────────────
        const canvas = document.createElement("canvas");
        canvas.width = W_PX;
        canvas.height = H_PX;
        const ctx = canvas.getContext("2d")!;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W_PX, H_PX);

        // Divider line
        const divX = W_PX * 0.52;
        ctx.strokeStyle = "#dddddd";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(divX, M);
        ctx.lineTo(divX, H_PX - M - 40);
        ctx.stroke();

        // ── LEFT PANEL ───────────────────────────────────────────────────────
        const leftMaxX = divX - M; // hard boundary for left panel text

        // Main heading — restored to previous large size
        const headingFontSize = SCALE * 14;
        ctx.fillStyle = "#000000";
        ctx.font = `900 ${headingFontSize}px Arial Black, Arial, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText("ORDER YOUR", M, M + 4, leftMaxX - M);
        ctx.fillText("FOOD HERE", M, M + 4 + headingFontSize * 1.15, leftMaxX - M);

        // Premium illustrated food icons — correctly positioned below both heading lines
        // Line 2 ends at: M + 4 + headingFontSize * 1.15 + headingFontSize ≈ M + headingFontSize * 2.3
        const iconY = M + 4 + headingFontSize * 2.4;
        const iconWidth = leftMaxX - M; 
        // Crop the 1024x1024 square to the middle 35% band where the icons are drawn (prevents flattening)
        const sWidth = premiumIconsImg.width;
        const sHeight = premiumIconsImg.height * 0.35;
        const sx = 0;
        const sy = premiumIconsImg.height * 0.325;
        
        const iconHeight = iconWidth * (sHeight / sWidth); // maintain cropped aspect ratio
        ctx.drawImage(premiumIconsImg, sx, sy, sWidth, sHeight, M, iconY, iconWidth, iconHeight);

        // Tagline — sits just below the icons
        ctx.fillStyle = "#111111";
        ctx.font = `bold ${SCALE * 10}px Arial, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText("Scan  |  Order  |  Pay", M, iconY + iconHeight + SCALE * 4);

        // ── RIGHT PANEL: QR ───────────────────────────────────────────────────
        const qrAreaX = divX + M * 0.8;
        const qrAreaW = W_PX - qrAreaX - M;
        const qrAreaH = H_PX - M * 2 - SCALE * 14;
        const qrSize = Math.min(qrAreaW, qrAreaH) - M;
        const qrX = qrAreaX + (qrAreaW - qrSize) / 2;
        const qrY_px = M + (qrAreaH - qrSize) / 2;

        // QR border rounded rect
        const br = SCALE * 6;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = SCALE * 0.8;
        ctx.beginPath();
        ctx.roundRect(qrX - M * 0.4, qrY_px - M * 0.4, qrSize + M * 0.8, qrSize + M * 0.8, br);
        ctx.stroke();

        // Generate QR as PNG data URL
        const qrDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "H",
          width: qrSize,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
        const qrImg = new Image();
        await new Promise<void>(res => { qrImg.onload = () => res(); qrImg.src = qrDataUrl; });
        ctx.drawImage(qrImg, qrX, qrY_px, qrSize, qrSize);

        // ── FOOTER ────────────────────────────────────────────────────────────
        // Footer sits BELOW the main card area with its own background band
        const fBandY = H_PX - M * 2.2;
        ctx.fillStyle = "#f8f8f8";
        ctx.fillRect(0, fBandY, W_PX, H_PX - fBandY);

        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, fBandY);
        ctx.lineTo(W_PX, fBandY);
        ctx.stroke();

        const footerText = `${theatreName || "Veer Cinema, Satna/khandwa"}  ·  ${audiName}  ·  Seat ${seat}`;
        // Auto-scale font size so text never overflows
        let footerFontSize = SCALE * 10;
        ctx.font = `bold ${footerFontSize}px Arial, sans-serif`;
        while (ctx.measureText(footerText).width > W_PX - M * 2 && footerFontSize > SCALE * 6) {
          footerFontSize -= 2;
          ctx.font = `bold ${footerFontSize}px Arial, sans-serif`;
        }
        ctx.fillStyle = "#222222";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(footerText, W_PX / 2, fBandY + (H_PX - fBandY) / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        // Add full canvas as single image to PDF page
        const pageImg = canvas.toDataURL("image/png");
        pdf.addImage(pageImg, "PNG", 0, 0, W_MM, H_MM);
      }

      const safeT = (theatreName || "Theatre").replace(/\s+/g, "_");
      const safeA = audiName.replace(/\s+/g, "_");
      pdf.save(`QR_Cards_${safeT}_${safeA}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. See console for details.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // Automatically fetch signed URLs in the background when the layout is modified
  // so the on-screen QR codes are immediately valid without waiting for Print.
  const allSeatsKey = JSON.stringify(allSeats);
  useEffect(() => {
    if (allSeats.length === 0) return;
    // If we already have signatures for exactly all these seats, skip
    if (Object.keys(currentSignedUrls).length === allSeats.length) return;
    
    const timer = setTimeout(async () => {
      try {
        const signed = await getSignedQrUrls(selectedAudiId, allSeats, customBaseUrl);
        setSignedUrls(prev => ({ ...prev, [selectedAudiId]: signed }));
      } catch (e) {
        console.error("Background sign fetch failed:", e);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudiId, allSeatsKey, customBaseUrl]);

  return (
    <>
      {/* ─── Screen-only UI ─────────────────────────────────────────── */}
      <div className="print:hidden max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              QR Code Manager
            </h1>
            {theatreName && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                {theatreName}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Configure seat layouts and generate print-ready QR codes for screens in {theatreName || "your theatre"}.
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
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${selectedAudiId === a.id ? "text-amber-600" : "text-slate-800"}`}>
                    {a.name}
                  </span>
                  {isConfigured ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Ready
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                      Empty
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {isConfigured ? `${numRows} rows · ${totalSeatsInAudi} seats` : "No layout set"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Base URL field */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" />
            <Label className="text-sm text-slate-600 font-medium">Menu URL</Label>
            <span className="text-xs text-slate-600">(used in QR codes — must be reachable by customers&apos; phones)</span>
          </div>
          <Input
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value.replace(/\/$/, ""))}
            placeholder="https://your-app.vercel.app"
            className="bg-slate-50 border-slate-200 text-slate-800 font-mono text-sm"
          />
          {isLocalhost && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
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
                <Label className="text-slate-600 text-sm shrink-0">Auditorium</Label>
                <Select value={selectedAudiId} onValueChange={(v) => v && setSelectedAudiId(v)}>
                  <SelectTrigger className="w-[180px] bg-white border-slate-200 text-slate-800 h-8 text-sm">
                    <SelectValue placeholder="Select auditorium">
                      {selectedAudi?.name ?? "Select auditorium"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-50 border-slate-200">
                    {auditoriums.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-slate-800 hover:bg-slate-100">
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
                className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Row
              </Button>
            </div>

            {currentLayout.rows.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
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
                    className="grid grid-cols-[72px_1fr_1fr_36px] gap-2 items-center bg-white border border-slate-200 rounded-lg p-2.5"
                  >
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value.toUpperCase())}
                      placeholder="A"
                      maxLength={6}
                      className="bg-slate-50 border-slate-200 text-slate-800 font-mono text-center h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={row.from}
                      onChange={(e) => updateRow(index, "from", e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={row.from}
                      value={row.to}
                      onChange={(e) => updateRow(index, "to", e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-800 h-8 text-sm"
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
                disabled={isPending}
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
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1.5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Layout Summary</p>
                {currentLayout.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold text-amber-600 w-10">{row.name}</span>
                    <span className="text-slate-500">Seats {row.from}–{row.to}</span>
                    <span className="ml-auto text-slate-600 text-xs">{row.to - row.from + 1} seats</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="text-slate-800 font-semibold">{totalSeats} seats</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: QR Preview ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-500" />
                Preview — {totalSeats} codes
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleGeneratePDF}
                  disabled={totalSeats === 0 || isGeneratingPdf || isPrinting}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 h-8"
                >
                  {isGeneratingPdf
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  {isGeneratingPdf ? "Generating PDF..." : "Download PDF Cards"}
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={totalSeats === 0 || isPrinting || isGeneratingPdf}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 h-8"
                >
                  {isPrinting
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <Printer className="w-3.5 h-3.5 mr-1.5" />}
                  {isPrinting ? "Signing..." : "Print All"}
                </Button>
              </div>
            </div>

            {totalSeats === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
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
                    <QRCodeSVG value={getPrintUrl(seat)} size={90} level="H" includeMargin={false} />
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
            {theatreName ? `${theatreName} — ` : ""}{selectedAudi?.name} — QR Codes
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
                  <div style={{ fontSize: "7pt", color: "#666" }}>
                    {theatreName ? `${theatreName} • ` : ""}{selectedAudi?.name}
                  </div>
                  <div style={{ fontSize: "14pt", fontWeight: "900", color: "#111" }}>{seat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Hidden PDF Card Layout (all inline styles — no Tailwind — to avoid html2canvas crashing on modern CSS color functions) */}
      <div style={{ position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }}>
        {allSeats.map((seat, index) => (
          <div
            key={index}
            id={`qr-card-pdf-${index}`}
            style={{
              display: "none",
              width: "800px",
              height: "400px",
              backgroundColor: "#ffffff",
              fontFamily: "Arial, Helvetica, sans-serif",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Main content area */}
            <div style={{ display: "flex", flex: 1, padding: "40px 48px 24px 48px" }}>

              {/* Left Side */}
              <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: "32px" }}>
                {/* Heading */}
                <div>
                  <h2 style={{
                    fontSize: "52px",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    color: "#000000",
                    lineHeight: "1.05",
                    letterSpacing: "-1px",
                    margin: 0,
                    fontFamily: "Arial Black, Arial, sans-serif",
                  }}>
                    Order Your<br />Food Here
                  </h2>
                </div>

                {/* Food Icons — pure SVG inline, no currentColor */}
                <div style={{ display: "flex", alignItems: "center", gap: "28px", padding: "20px 0" }}>
                  {/* Burger */}
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10a8 8 0 0 1 16 0" />
                    <path d="M4 14a8 8 0 0 0 16 0" />
                    <path d="M3 12h18" />
                    <path d="M5 14v1a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1" />
                  </svg>
                  {/* Drink */}
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 8h14" />
                    <path d="M6 8l1.5 12h9L18 8" />
                    <path d="M10 12h4" />
                    <circle cx="12" cy="16" r="1" />
                  </svg>
                  {/* Popcorn */}
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3a2 2 0 0 0-2 2c0 .8.5 1.5 1.2 1.8L7 21h10l1.8-14.2A2 2 0 0 0 18 3a2 2 0 0 0-2 1.5 2 2 0 0 0-4 0A2 2 0 0 0 6 3z" />
                  </svg>
                </div>

                {/* Tagline */}
                <p style={{ fontSize: "26px", fontWeight: "800", color: "#000000", margin: 0, letterSpacing: "1px" }}>
                  Scan | Order | Pay
                </p>
              </div>

              {/* Right Side — QR Code */}
              <div style={{
                width: "45%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #000000",
                borderRadius: "24px",
                padding: "16px",
                backgroundColor: "#ffffff",
              }}>
                <QRCodeSVG
                  value={getPrintUrl(seat)}
                  size={230}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              height: "56px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 48px",
            }}>
              <p style={{ fontSize: "18px", fontWeight: "700", color: "#111111", margin: 0, textAlign: "center", letterSpacing: "0.5px" }}>
                Veer Cinema &nbsp;·&nbsp; {theatreName} &nbsp;·&nbsp; {selectedAudi?.name} &nbsp;·&nbsp; Seat {seat}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
