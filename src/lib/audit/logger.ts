import { createAdminClient } from "@/lib/supabase/server";


type AuditAction =
  | "product.created"
  | "product.updated"
  | "product.availability_changed"
  | "product.deleted"
  | "category.created"
  | "category.updated"
  | "order.accepted"
  | "order.status_changed"
  | "order.cancelled"
  | "bill.printed"
  | "bill.reprinted"
  | "account.created"
  | "account.disabled"
  | "account.enabled"
  | "payment.verified"
  | "payment.webhook_received"
  | "image.uploaded"
  | "account.updated";

interface LogAuditParams {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an immutable audit log entry.
 * Failures are swallowed and logged to console — audit logging must never
 * break the main operation.
 *
 * IMPORTANT: Never include secrets, passwords, or full card data in metadata.
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  metadata = {},
}: LogAuditParams): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const entry = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata,
    };
    const { error } = await supabase
      .from("audit_logs")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(entry as any);
    if (error) {
      console.error("[audit] Failed to write audit log:", error.message);
    }
  } catch (err) {
    console.error("[audit] Unexpected error writing audit log:", err);
  }
}
