import { redirect } from "next/navigation";

/**
 * Root page — redirects to the customer ordering experience.
 * Middleware also handles this but this is a belt-and-suspenders fallback.
 */
export default function RootPage() {
  redirect("/order");
}
