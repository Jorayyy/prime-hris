"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole, ForbiddenError } from "@/lib/auth";

type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
};

/** Fire-and-forget audit trail entry tied to the current session user. */
export async function recordAudit(input: AuditInput) {
  try {
    const user = await requireUser();
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.email,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details: (input.details ?? undefined) as never,
      },
    });
  } catch {
    // Never let audit failures break the main flow; system actions may have no user.
  }
}

export async function listAuditLogs(page = 1, pageSize = 50) {
  await requireRole("ADMIN", "HR");
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count(),
  ]);
  return { items, total };
}

const _schemaGuard = z.string(); // keep zod import for future validation here
void _schemaGuard;
void ForbiddenError;
