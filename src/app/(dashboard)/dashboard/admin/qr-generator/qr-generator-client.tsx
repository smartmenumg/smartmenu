"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { setEffectiveTheatreId } from "@/lib/theatre-context";
import { useRouter } from "next/navigation";
import { Loader2, Download, Printer } from "lucide-react";

interface Auditorium {
  id: string;
  name: string;
  total_seats: number | null;
}

interface Theatre {
  id: string;
  name: string;
  slug: string;
  address: string | null;
}

interface Props {
  theatreId: string;
  allTheatres: Theatre[];
  isSuperAdmin: boolean;
  auditoriums: Auditorium[];
}

export function QRGeneratorClient({ theatreId, allTheatres, isSuperAdmin, auditoriums }: Props) {
  const router = useRouter();
  const [selectedAudi, setSelectedAudi] = useState<string>("");
  const [seatPrefix, setSeatPrefix] = useState("A");
  const [startSeat, setStartSeat] = useState<number>(1);
  const [endSeat, setEndSeat] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeTheatre = allTheatres.find(t => t.id === theatreId);
  const activeAudi = auditoriums.find(a => a.id === selectedAudi);

  const handleTheatreChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value === "all" ? null : e.target.value;
    await setEffectiveTheatreId(newVal);
    router.refresh();
  };

  const generatePDF = async () => {
    if (!activeTheatre || !activeAudi) {
      alert("Please select a valid theatre and auditorium.");
      return;
    }

    if (endSeat < startSeat) {
      alert("End seat must be greater than or equal to start seat.");
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [800, 400], // 2:1 ratio exactly
      });

      const totalSeats = endSeat - startSeat + 1;

      for (let i = 0; i < totalSeats; i++) {
        const seatNum = `${seatPrefix}-${startSeat + i}`;
        const elementId = `qr-card-${i}`;
        const element = document.getElementById(elementId);
        
        if (element) {
          // Temporarily make it visible for html2canvas to capture correctly
          element.style.display = "flex";
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          element.style.display = "none";
          
          const imgData = canvas.toDataURL("image/png");
          
          if (i > 0) {
            pdf.addPage([800, 400], "landscape");
          }
          pdf.addImage(imgData, "PNG", 0, 0, 800, 400);
        }
      }

      pdf.save(`QR_Codes_${activeTheatre.name.replace(/\\s+/g, '_')}_${activeAudi.name.replace(/\\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const seatsToGenerate = Array.from({ length: Math.max(0, endSeat - startSeat + 1) }).map((_, i) => `${seatPrefix}-${startSeat + i}`);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">QR Code Generator</h1>
          <p className="text-zinc-400 mt-1">Generate dynamic QR codes for specific seats in PDF format.</p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-lg border border-white/10">
            <label className="text-sm font-medium text-zinc-400 pl-2">Cinema:</label>
            <select
              value={theatreId === "all" ? "all" : theatreId}
              onChange={handleTheatreChange}
              className="bg-zinc-800 border-zinc-700 text-sm rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 px-3 py-1.5"
            >
              <option value="all">Select a cinema...</option>
              {allTheatres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Auditorium / Screen</label>
            <select
              value={selectedAudi}
              onChange={(e) => setSelectedAudi(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:border-white/30 outline-none"
              disabled={theatreId === "all"}
            >
              <option value="">Select Screen</option>
              {auditoriums.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Row / Prefix (e.g., A)</label>
            <input
              type="text"
              value={seatPrefix}
              onChange={(e) => setSeatPrefix(e.target.value.toUpperCase())}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:border-white/30 outline-none"
              placeholder="A"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Start Seat Number</label>
            <input
              type="number"
              value={startSeat}
              onChange={(e) => setStartSeat(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:border-white/30 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">End Seat Number</label>
            <input
              type="number"
              value={endSeat}
              onChange={(e) => setEndSeat(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:border-white/30 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={generatePDF}
            disabled={!selectedAudi || isGenerating || theatreId === "all"}
            className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isGenerating ? "Generating PDF..." : "Generate & Download PDF"}
          </button>
        </div>
      </div>

      {/* Hidden container for rendering cards to capture via html2canvas */}
      <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
        {activeTheatre && activeAudi && seatsToGenerate.map((seat, index) => {
          // Dynamic URL specifically for this theatre, audi, and seat
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
          const qrUrl = \`\${appUrl}/menu/\${activeTheatre.slug}?audi=\${activeAudi.id}&seat=\${seat}\`;

          return (
            <div 
              key={index} 
              id={\`qr-card-\${index}\`}
              className="bg-white flex flex-col justify-between overflow-hidden" 
              style={{ width: "800px", height: "400px", display: "none" }} // Hidden by default, toggled during generation
            >
              {/* Generous safe boundary padding around everything */}
              <div className="flex-1 flex p-12 relative w-full h-full">
                
                {/* Left Side (60%) */}
                <div className="w-[60%] h-full flex flex-col justify-between pr-8">
                  <div className="space-y-2 pt-4">
                    <h2 className="text-[52px] font-black uppercase text-black leading-[1.1] tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>
                      Order Your<br/>Food Here
                    </h2>
                  </div>

                  {/* Food Icons Outline SVG (Burger, Drink, Popcorn approximation) */}
                  <div className="flex items-center gap-8 py-6 opacity-90">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                      {/* Burger */}
                      <path d="M4 10a8 8 0 0 1 16 0" />
                      <path d="M4 14a8 8 0 0 0 16 0" />
                      <path d="M3 12h18" />
                      <path d="M5 14v1a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-1" />
                    </svg>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                      {/* Drink Cup */}
                      <path d="M5 8h14" />
                      <path d="M6 8l1.5 13h9L18 8" />
                      <path d="M12 4v16" />
                      <path d="M12 4L16 2" />
                    </svg>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                      {/* Pizza slice / alternative */}
                      <path d="M12 2L2 20h20L12 2z" />
                      <path d="M12 2v20" />
                      <circle cx="9" cy="14" r="1" />
                      <circle cx="15" cy="14" r="1" />
                      <circle cx="12" cy="10" r="1" />
                    </svg>
                  </div>

                  <div className="pb-4">
                    <p className="text-3xl font-bold text-black tracking-wide">
                      Scan | Order | Pay
                    </p>
                  </div>
                </div>

                {/* Right Side (40%) - QR Code */}
                <div className="w-[40%] h-full flex items-center justify-center border-4 border-black p-4 rounded-3xl bg-white">
                  <QRCodeSVG 
                    value={qrUrl}
                    size={240}
                    level="H"
                    includeMargin={false}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Dynamic Footer with Theatre - Location - Screen - Seat */}
              <div className="w-full h-[60px] bg-white flex items-center justify-center border-t border-black/10 px-12">
                <p className="text-2xl font-bold text-black tracking-wider text-center">
                  Veer Cinema - {activeTheatre.name} - {activeAudi.name} - Seat {seat}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
