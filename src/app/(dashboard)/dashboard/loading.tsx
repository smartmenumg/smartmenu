import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] lg:h-full flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-medium animate-pulse">Loading dashboard...</p>
      </div>
      
      {/* Skeleton placeholders representing dashboard structure */}
      <div className="mt-12 w-full max-w-4xl mx-auto space-y-6 opacity-20 pointer-events-none" aria-hidden="true">
        <div className="h-8 bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}
