"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required").max(5000),
  pinned: z.coerce.boolean().default(false),
});

export async function createAnnouncementAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = announcementSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    pinned: formData.get("pinned"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };

  await db.announcement.create({ data: parsed.data });
  await recordAudit({ action: "CREATE_ANNOUNCEMENT", entity: "Announcement", details: { title: parsed.data.title } });
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteAnnouncementAction(id: string) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  await db.announcement.delete({ where: { id } });
  await recordAudit({ action: "DELETE_ANNOUNCEMENT", entity: "Announcement", entityId: id });
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleAnnouncementPinAction(id: string, pinned: boolean) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  await db.announcement.update({ where: { id }, data: { pinned } });
  revalidatePath("/dashboard");
  return { ok: true };
}
