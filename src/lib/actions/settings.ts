"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";

const settingsSchema = z.object({
  name: z.string().min(1).max(150),
  legalName: z.string().max(200).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  website: z.string().max(150).optional(),
  tin: z.string().max(25).optional(),
  rdoCode: z.string().max(10).optional(),
  timezone: z.string().default("Asia/Manila"),
  payFrequency: z.enum(["WEEKLY", "BIWEEKLY", "SEMI_MONTHLY", "MONTHLY"]),
  graceMinutes: z.coerce.number().int().min(0).max(60),
});

export async function updateSettingsAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the settings fields." };
  }

  const data = { ...parsed.data };
  const existing = await db.companySettings.findFirst();

  if (existing) {
    await db.companySettings.update({ where: { id: existing.id }, data });
  } else {
    await db.companySettings.create({ data });
  }

  await recordAudit({ action: "UPDATE_SETTINGS", entity: "CompanySettings" });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createOrgUnitAction(_prev: { error?: string }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const kind = String(formData.get("kind") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  try {
    switch (kind) {
      case "SITE":
        await db.site.create({ data: { name, address: String(formData.get("extra") ?? "") || null } });
        break;
      case "DEPARTMENT":
        await db.department.create({ data: { name } });
        break;
      case "CAMPAIGN":
        await db.campaign.create({
          data: { name, clientName: String(formData.get("extra") ?? "") || null },
        });
        break;
      case "POSITION":
        await db.position.create({ data: { title: name } });
        break;
      case "SHIFT_TEMPLATE": {
        const startTime = String(formData.get("startTime") ?? "");
        const endTime = String(formData.get("endTime") ?? "");
        if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
          return { error: "Valid start and end times are required." };
        }
        const sh = parseInt(startTime.slice(0, 2), 10);
        const eh = parseInt(endTime.slice(0, 2), 10);
        await db.shiftTemplate.create({
          data: {
            name,
            startTime,
            endTime,
            isNightShift: eh <= sh,
            breakMinutes: Number(formData.get("breakMinutes") ?? 60),
            graceMinutes: Number(formData.get("graceMinutes") ?? 5),
          },
        });
        break;
      }
      case "HOLIDAY": {
        const date = String(formData.get("date") ?? "");
        if (!date) return { error: "Date is required." };
        await db.holiday.upsert({
          where: { date: new Date(`${date}T00:00:00`) },
          update: { name, type: String(formData.get("holidayType") ?? "REGULAR") as never },
          create: { date: new Date(`${date}T00:00:00`), name, type: String(formData.get("holidayType") ?? "REGULAR") as never },
        });
        break;
      }
      default:
        return { error: "Unknown type." };
    }
  } catch {
    return { error: `Could not save — "${name}" may already exist.` };
  }

  await recordAudit({ action: `CREATE_${kind}`, entity: kind, details: { name } });
  revalidatePath("/settings");
  revalidatePath("/schedules");
  return {};
}

const updateShiftTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.coerce.number().int().min(0).max(180),
  graceMinutes: z.coerce.number().int().min(0).max(60),
  color: z.string().optional(),
});

export async function updateShiftTemplateAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = updateShiftTemplateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    breakMinutes: Number(formData.get("breakMinutes") ?? 60),
    graceMinutes: Number(formData.get("graceMinutes") ?? 5),
    color: String(formData.get("color") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Check the template fields." };

  const sh = parseInt(parsed.data.startTime.slice(0, 2), 10);
  const eh = parseInt(parsed.data.endTime.slice(0, 2), 10);

  try {
    await db.shiftTemplate.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        breakMinutes: parsed.data.breakMinutes,
        graceMinutes: parsed.data.graceMinutes,
        isNightShift: eh <= sh,
        ...(parsed.data.color ? { color: parsed.data.color } : {}),
      },
    });
  } catch {
    return { error: "Template not found or name already exists." };
  }

  await recordAudit({ action: "UPDATE_SHIFT_TEMPLATE", entity: "ShiftTemplate", details: { id: parsed.data.id, name: parsed.data.name } });
  revalidatePath("/settings");
  revalidatePath("/schedules");
  return { ok: true };
}

export async function deleteShiftTemplateAction(id: string) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const template = await db.shiftTemplate.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!template) return { error: "Template not found." };

  if (template._count.assignments > 0) {
    return { error: `Cannot delete — ${template._count.assignments} assignment(s) use this template. Reassign them first.` };
  }

  await db.shiftTemplate.delete({ where: { id } });
  await recordAudit({ action: "DELETE_SHIFT_TEMPLATE", entity: "ShiftTemplate", details: { id, name: template.name } });
  revalidatePath("/settings");
  revalidatePath("/schedules");
  return { ok: true };
}
