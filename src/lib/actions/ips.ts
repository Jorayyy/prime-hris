"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const ipSchema = z.string().trim().min(3).max(45).regex(
  /^[0-9a-fA-F:.]+$/,
  "Enter a valid IPv4/IPv6 address.",
);

export async function addAllowedIpAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
    const data = z
      .object({ ip: ipSchema, label: z.string().trim().max(100).optional() })
      .parse(Object.fromEntries(formData.entries()));
    const existing = await db.bundyAllowedIp.findUnique({ where: { ip: data.ip } });
    if (existing) {
      await db.bundyAllowedIp.update({ where: { ip: data.ip }, data: { active: true, label: data.label ?? existing.label } });
    } else {
      await db.bundyAllowedIp.create({ data: { ip: data.ip, label: data.label } });
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message.split("\n")[0] : "Invalid IP." };
  }
}

export async function removeAllowedIpAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
    const id = z.string().min(1).parse(formData.get("id"));
    await db.bundyAllowedIp.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { error: "Failed to remove IP." };
  }
}

export async function toggleAllowedIpAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
    const id = z.string().min(1).parse(formData.get("id"));
    const row = await db.bundyAllowedIp.findUnique({ where: { id } });
    if (!row) return { error: "Not found." };
    await db.bundyAllowedIp.update({ where: { id }, data: { active: !row.active } });
    return { ok: true };
  } catch {
    return { error: "Failed to update IP." };
  }
}
