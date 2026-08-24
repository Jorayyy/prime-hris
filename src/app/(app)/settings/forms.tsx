"use client";

import { useActionState, useState } from "react";
import { updateSettingsAction, createOrgUnitAction } from "@/lib/actions/settings";

type CompanySettings = {
  name: string;
  legalName: string | null;
  tagline: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tin: string | null;
  rdoCode: string | null;
  timezone: string;
  payFrequency: "WEEKLY" | "BIWEEKLY" | "SEMI_MONTHLY" | "MONTHLY";
  graceMinutes: number;
} | null;

export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    {} as { error?: string; ok?: boolean },
  );

  return (
    <form action={formAction} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label">Company Name *</label>
        <input name="name" defaultValue={settings?.name ?? ""} required maxLength={150} className="field" />
      </div>
      <div>
        <label className="label">Legal / Registered Name</label>
        <input name="legalName" defaultValue={settings?.legalName ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Tagline</label>
        <input name="tagline" defaultValue={settings?.tagline ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Address</label>
        <input name="address" defaultValue={settings?.address ?? ""} className="field" />
      </div>
      <div>
        <label className="label">City</label>
        <input name="city" defaultValue={settings?.city ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Official Email</label>
        <input name="email" type="email" defaultValue={settings?.email ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" defaultValue={settings?.phone ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Website</label>
        <input name="website" defaultValue={settings?.website ?? ""} className="field" />
      </div>
      <div>
        <label className="label">TIN</label>
        <input name="tin" defaultValue={settings?.tin ?? ""} className="field" placeholder="000-000-000-000" />
      </div>
      <div>
        <label className="label">RDO Code</label>
        <input name="rdoCode" defaultValue={settings?.rdoCode ?? ""} className="field" />
      </div>
      <div>
        <label className="label">Timezone</label>
        <select name="timezone" defaultValue={settings?.timezone ?? "Asia/Manila"} className="field">
          {["Asia/Manila", "UTC", "America/New_York"].map((tz) => (
            <option key={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Pay Frequency</label>
        <select name="payFrequency" defaultValue={settings?.payFrequency ?? "SEMI_MONTHLY"} className="field">
          <option value="SEMI_MONTHLY">Semi-monthly (1st &amp; 2nd half)</option>
          <option value="MONTHLY">Monthly</option>
          <option value="BIWEEKLY">Bi-weekly</option>
          <option value="WEEKLY">Weekly</option>
        </select>
      </div>
      <div>
        <label className="label">Grace Minutes (tardiness)</label>
        <input
          name="graceMinutes"
          type="number"
          min={0}
          max={60}
          defaultValue={String(settings?.graceMinutes ?? 5)}
          className="field"
        />
      </div>

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
        <button
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Settings"}
        </button>
        {state.ok ? <span className="text-sm font-medium text-emerald-600">Saved.</span> : null}
        {state.error ? <span className="text-sm font-medium text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function OrgUnitForm({
  kind,
  label,
  placeholder,
  extraLabel,
  showTimes,
  showHolidayDate,
}: {
  kind: string;
  label: string;
  placeholder?: string;
  extraLabel?: string;
  showTimes?: boolean;
  showHolidayDate?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createOrgUnitAction, {} as { error?: string });
  const formKey = `org-${kind}`;
  const [key, setKey] = useState(0);

  return (
    <form
      key={`${formKey}-${key}`}
      action={async (fd) => {
        formAction(fd);
        setKey((k) => k + 1);
      }}
      className="rounded-lg border border-dashed border-slate-300 p-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input name="name" placeholder={placeholder} required className="field min-w-40 flex-1" />

        {extraLabel ? <input name="extra" placeholder={extraLabel} className="field w-44" /> : null}

        {showTimes ? (
          <>
            <input name="startTime" type="time" required className="field w-auto" />
            <span className="text-xs text-slate-400">→</span>
            <input name="endTime" type="time" required className="field w-auto" />
            <input name="breakMinutes" type="number" min={0} max={180} placeholder="Break" className="field w-20" />
          </>
        ) : null}

        {showHolidayDate ? (
          <>
            <input name="date" type="date" required className="field w-auto" />
            <select name="holidayType" className="field w-auto">
              <option value="REGULAR">Regular</option>
              <option value="SPECIAL_NON_WORKING">Special Non-Working</option>
              <option value="DOUBLE_HOLIDAY">Double Holiday</option>
            </select>
          </>
        ) : null}

        <button
          disabled={pending}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {state.error ? <p className="mt-2 text-xs font-medium text-red-600">{state.error}</p> : null}
    </form>
  );
}
