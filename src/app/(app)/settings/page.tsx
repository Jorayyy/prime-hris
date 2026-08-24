import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES } from "@/lib/auth";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { SettingsForm, OrgUnitForm } from "./forms";
import { AddForm, Row as IpRow } from "./ip-forms";
import { addAllowedIpAction, removeAllowedIpAction, toggleAllowedIpAction } from "@/lib/actions/ips";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  if (!HR_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Settings are restricted to HR and Admin." />;
  }

  const [settings, sites, departments, campaigns, positions, templates, allowedIps] = await Promise.all([
    db.companySettings.findFirst(),
    db.site.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.campaign.findMany({ orderBy: { name: "asc" } }),
    db.position.findMany({ orderBy: { title: "asc" } }),
    db.shiftTemplate.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { assignments: true } } } }),
    db.bundyAllowedIp.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Company identity (used across the bundy page and payslips), payroll configuration, and org structure.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader title="Company Profile" subtitle="The company name here customizes the whole system" />
        <SettingsForm
          settings={
            settings && {
              name: settings.name,
              legalName: settings.legalName,
              tagline: settings.tagline,
              address: settings.address,
              city: settings.city,
              email: settings.email,
              phone: settings.phone,
              website: settings.website,
              tin: settings.tin,
              rdoCode: settings.rdoCode,
              timezone: settings.timezone,
              payFrequency: settings.payFrequency,
              graceMinutes: settings.graceMinutes,
            }
          }
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Organization Structure" subtitle="Sites, departments, campaigns/accounts, positions" />
          <div className="space-y-4 p-5">
            <OrgUnitForm kind="SITE" label="Site" placeholder="e.g., Tacloban Main Site" extraLabel="Address" />
            <OrgUnitForm kind="DEPARTMENT" label="Department" placeholder="e.g., Operations" />
            <OrgUnitForm kind="CAMPAIGN" label="Campaign / Account" placeholder="e.g., Acme Voice Support" extraLabel="Client Name" />
            <OrgUnitForm kind="POSITION" label="Position" placeholder="e.g., Customer Service Representative" />
          </div>
          <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
            {sites.length} sites · {departments.length} departments · {campaigns.length} campaigns · {positions.length} positions
          </div>
        </Card>

        <Card>
          <CardHeader title="Shift Templates & Holidays" />
          <div className="space-y-4 p-5">
            <OrgUnitForm
              kind="SHIFT_TEMPLATE"
              label="New Shift Template"
              placeholder="e.g., Graveyard (10PM-7AM)"
              showTimes
            />
            <OrgUnitForm kind="HOLIDAY" label="Declare Holiday" placeholder="e.g., Araw ng Tacloban" showHolidayDate />
          </div>
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] text-sm">
            {templates.map((t) => (
              <li key={t.id} className="flex justify-between px-5 py-2.5">
                <span className="font-semibold">{t.name}</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {t.startTime} → {t.endTime} · used {t._count.assignments}×
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Bundy Clock - Allowed IPs"
            subtitle={
              allowedIps.some((i) => i.active)
                ? "Punching is RESTRICTED to the active IPs below"
                : "No active IPs registered - punching is open to all addresses"
            }
          />
          <AddForm action={addAllowedIpAction} />
          {allowedIps.length > 0 ? (
            <ul className="pb-3">
              {allowedIps.map((ip) => (
                <IpRow key={ip.id} ip={{ id: ip.id, ip: ip.ip, label: ip.label, active: ip.active }} removeAction={removeAllowedIpAction} toggleAction={toggleAllowedIpAction} />
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-4 text-xs text-[var(--muted)]">
              Register your office/kiosk public IP addresses so only workplace devices can punch. Leave the list empty during testing.
            </p>
          )}
        </Card>

        <Card>
        <CardHeader title="Government Deduction Tables" subtitle="Seeded with current SSS / PhilHealth / Pag-IBIG / BIR tables - update via database when new circulars take effect" />
          <GovTablesSummary />
        </Card>
      </div>
    </>
  );
}

async function GovTablesSummary() {
  const tables = await db.govContributionTable.findMany({ orderBy: [{ type: "asc" }] });
  if (tables.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-[var(--muted)]">
        No tables loaded yet - run the seed script.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
      {tables.map((t) => (
        <li key={t.id} className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wide">{t.type.replace(/_/g, " ")}</p>
          <p className="text-[11px] text-slate-500">{t.effectiveYear} · {t.frequency}</p>
        </li>
      ))}
    </ul>
  );
}

