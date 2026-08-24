"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createEmployeeAction, type EmployeeFormState } from "@/lib/actions/employees";
import { Card, CardHeader } from "@/components/ui";

const initialState: EmployeeFormState = {};

type Option = { id: string; name: string; title?: string };

export default function NewEmployeeForm({
  sites,
  departments,
  campaigns,
  positions,
  employees,
}: {
  sites: Option[];
  departments: Option[];
  campaigns: Option[];
  positions: Option[];
  employees: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader title="Personal Information" subtitle="Basic identity and contact details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="First Name" name="firstName" required />
          <Field label="Middle Name" name="middleName" />
          <Field label="Last Name" name="lastName" required />
          <Field label="Suffix" name="suffix" placeholder="Jr., III…" />
          <Field label="Date of Birth" name="dateOfBirth" type="date" />
          <SelectField label="Gender" name="gender">
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="NON_BINARY">Non-binary</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </SelectField>
          <SelectField label="Civil Status" name="civilStatus">
            <option value="">—</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="WIDOWED">Widowed</option>
            <option value="SEPARATED">Separated</option>
            <option value="ANNULLED">Annulled</option>
          </SelectField>
          <Field label="Mobile Number" name="mobileNumber" placeholder="+63 9xx xxx xxxx" />
          <Field label="Personal Email" name="personalEmail" type="email" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Present Address" name="presentAddress" />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Government IDs" subtitle="Required for payroll contributions and BIR reporting" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="SSS Number" name="sssNumber" placeholder="00-0000000-0" />
          <Field label="PhilHealth Number" name="philhealthNumber" placeholder="00-000000000-0" />
          <Field label="Pag-IBIG MID No." name="pagibigNumber" placeholder="0000-0000-0000" />
          <Field label="TIN" name="tinNumber" placeholder="000-000-000-000" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Employment Details" subtitle="Assignment, compensation, and emergency contact" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Hire Date" name="hireDate" type="date" required />
          <SelectField label="Employment Type" name="employmentType" defaultValue="PROBITIONARY" required>
            <option value="PROBITIONARY">Probitionary</option>
            <option value="REGULAR">Regular</option>
            <option value="CONTRACTUAL">Contractual</option>
            <option value="SEASONAL">Seasonal</option>
            <option value="PART_TIME">Part-time</option>
            <option value="INTERN">Intern</option>
          </SelectField>
          <Field label="Monthly Basic Salary (PHP)" name="basicSalary" type="number" min="0" step="0.01" required />

          <SelectField label="Site" name="siteId">
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </SelectField>
          <SelectField label="Department" name="departmentId">
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>
          <SelectField label="Campaign / Account" name="campaignId">
            <option value="">—</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>
          <SelectField label="Position" name="positionId">
            <option value="">—</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </SelectField>
          <SelectField label="Reports To" name="reportsToId">
            <option value="">—</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </SelectField>

          <div className="border-t border-dashed border-slate-200 pt-4 sm:col-span-2 lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Emergency Contact Name" name="emergencyName" />
              <Field label="Relationship" name="emergencyRelation" placeholder="Spouse, Parent…" />
              <Field label="Emergency Contact No." name="emergencyPhone" />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="System Account" subtitle="Login credentials, access level, and bundy PIN" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Work Email" name="workEmail" type="email" required />
          <Field label="Initial Password" name="password" type="password" minLength={8} required hint="Min. 8 characters" />
          <SelectField label="System Role" name="role" defaultValue="EMPLOYEE">
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Team Lead / Manager</option>
            <option value="PAYROLL">Payroll Officer</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Administrator</option>
          </SelectField>
          <Field label="Bundy PIN" name="bundyPin" inputMode="numeric" pattern="\d*" maxLength={8} required hint="4–8 digits for the web clock" />
        </div>
      </Card>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Create Employee Record
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {props.required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input id={name} name={name} {...props} className="field" />
      {hint ? <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  name,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select id={name} name={name} {...props} className="field">
        {children}
      </select>
    </div>
  );
}
