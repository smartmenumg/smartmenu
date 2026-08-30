import Link from "next/link";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
          You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
      <Link
        href="/auth/login"
        className={cn(buttonVariants({ variant: "outline" }), "border-slate-600 text-slate-300 hover:bg-slate-700")}
      >
        Back to Sign In
      </Link>
    </div>
  );
}
