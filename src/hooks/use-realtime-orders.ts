"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import type { OrderWithDetails, OrderStatus } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let realtimeClient: ReturnType<typeof createClient> | null = null;
function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return realtimeClient;
}

interface UseRealtimeOrdersOptions {
  theatreId: string;
  onNewOrder: (order: OrderWithDetails) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, updatedAt: string) => void;
  /** Polling interval ms as fallback when Realtime is not receiving events. Default: 15000 */
  pollIntervalMs?: number;
  /** Function to poll latest orders — used as fallback */
  pollFn?: () => Promise<OrderWithDetails[]>;
  onPollResult?: (orders: OrderWithDetails[]) => void;
}

export function useRealtimeOrders({
  theatreId,
  onNewOrder,
  onStatusUpdate,
  pollIntervalMs = 12000,
  pollFn,
  onPollResult,
}: UseRealtimeOrdersOptions) {
  const onNewOrderRef    = useRef(onNewOrder);
  const onStatusUpdateRef = useRef(onStatusUpdate);
  const onPollResultRef   = useRef(onPollResult);
  const pollFnRef         = useRef(pollFn);

  useEffect(() => { onNewOrderRef.current = onNewOrder; }, [onNewOrder]);
  useEffect(() => { onStatusUpdateRef.current = onStatusUpdate; }, [onStatusUpdate]);
  useEffect(() => { onPollResultRef.current = onPollResult; }, [onPollResult]);
  useEffect(() => { pollFnRef.current = pollFn; }, [pollFn]);

  // ── Realtime subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!theatreId) return;
    const client = getRealtimeClient();

    const channel = client
      .channel(`admin-orders-${theatreId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `theatre_id=eq.${theatreId}`,
      }, async (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.status === "confirmed") {
          const { data } = await client
            .from("orders")
            .select("*, auditoriums(id, name), order_items(*), payments(*)")
            .eq("id", row.id as string)
            .single();
          if (data) onNewOrderRef.current(data as unknown as OrderWithDetails);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `theatre_id=eq.${theatreId}`,
      }, (payload) => {
        const row = payload.new as { id: string; status: OrderStatus; updated_at: string };
        onStatusUpdateRef.current(row.id, row.status, row.updated_at);
      })
      .subscribe(() => {
        // channel subscription status — not logged in production
      });

    return () => { client.removeChannel(channel); };
  }, [theatreId]);

  // ── Polling fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (!pollFnRef.current || !pollIntervalMs) return;

    const id = setInterval(async () => {
      try {
        const orders = await pollFnRef.current!();
        onPollResultRef.current?.(orders);
      } catch (e) {
        console.warn("[Poll] failed:", e);
      }
    }, pollIntervalMs);

    return () => clearInterval(id);
  }, [pollIntervalMs]);
}

/** Realtime hook for a single order on the customer tracking page */
export function useRealtimeOrder(
  orderId: string | null,
  onUpdate: (status: OrderStatus) => void,
  pollIntervalMs = 8000,
) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  // Realtime
  useEffect(() => {
    if (!orderId) return;
    const client = getRealtimeClient();

    const channel = client
      .channel(`order-track-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const row = payload.new as { status: OrderStatus };
        onUpdateRef.current(row.status);
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [orderId]);

  // Polling fallback — fetch status directly
  useEffect(() => {
    if (!orderId || !pollIntervalMs) return;
    const client = getRealtimeClient();

    const id = setInterval(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (client as any)
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      if ((data as unknown as { status: OrderStatus })?.status) onUpdateRef.current((data as unknown as { status: OrderStatus }).status);
    }, pollIntervalMs);

    return () => clearInterval(id);
  }, [orderId, pollIntervalMs]);
}
