"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, UtensilsCrossed } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);

  return (
    <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-7 h-7 text-slate-900" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-white">Staff Sign In</CardTitle>
          <CardDescription className="text-slate-400 mt-1">
            Theatre Food Ordering — Management Portal
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200 font-medium">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@theatre.com"
              disabled={isPending}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200 font-medium">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              disabled={isPending}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
            />
          </div>

          {state?.error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{state.error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-base transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Access is restricted to authorised staff only.
        </p>
      </CardContent>
    </Card>
  );
}
