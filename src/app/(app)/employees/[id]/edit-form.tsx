"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { updateEmployeeAction, type EmployeeFormState } from "@/lib/actions/employees";

const initialState: EmployeeFormState = {};

export default function EditEmployeeForm({
  employee,
  sites,
  departments,
  campaigns,
  positions,
  employees,
}: {
  employee: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    suffix: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    civilStatus: string | null;
    mobileNumber: string | null;
    personalEmail: string | null;
    presentAddress: string | null;
    emergencyName: string | null;
    emergencyRelation: string | null;
    emergencyPhone: string | null;
    sssNumber: string | null;
    philhealthNumber: string | null;
    pagibigNumber: string | null;
    tinNumber: string | null;
    employmentType: string;
    status: string;
    basicSalary: number;
    regularizedDate: Date | null;
    separationDate: Date | null;
    separationReason: string | null;
    siteId: string | null;
    departmentId: string | null;
    campaignId: string | null;
    positionId: string | null;
    reportsToId: string | null;
  };
  sites: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; title: string }>;
  employees: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(updateEmployeeAction, initialState);
  const d = (v: Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={employee.id} />

      <Card>
        <CardHeader title="Personal Information" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="First Name" name="firstName" defaultValue={employee.firstName} required />
          <Field label="Middle Name" name="middleName" defaultValue={employee.middleName ?? ""} />
          <Field label="Last Name" name="lastName" defaultValue={employee.lastName} required />
          <Field label="Suffix" name="suffix" defaultValue={employee.suffix ?? ""} />
          <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={d(employee.dateOfBirth)} />
          <Select label="Gender" name="gender" defaultValue={employee.gender ?? ""}>
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="NON_BINARY">Non-binary</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </Select>
          <Select label="Civil Status" name="civilStatus" defaultValue={employee.civilStatus ?? ""}>
            <option value="">—</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="WIDOWED">Widowed</option>
            <option value="SEPARATED">Separated</option>
            <option value="ANNULLED">Annulled</option>
          </Select>
          <Field label="Mobile Number" name="mobileNumber" defaultValue={employee.mobileNumber ?? ""} />
          <Field label="Personal Email" name="personalEmail" type="email" defaultValue={employee.personalEmail ?? ""} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Present Address" name="presentAddress" defaultValue={employee.presentAddress ?? ""} />
          </div>
          <Field label="Emergency Contact" name="emergencyName" defaultValue={employee.emergencyName ?? ""} />
          <Field label="Relationship" name="emergencyRelation" defaultValue={employee.emergencyRelation ?? ""} />
          <Field label="Emergency No." name="emergencyPhone" defaultValue={employee.emergencyPhone ?? ""} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Government IDs" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="SSS Number" name="sssNumber" defaultValue={employee.sssNumber ?? ""} />
          <Field label="PhilHealth Number" name="philhealthNumber" defaultValue={employee.philhealthNumber ?? ""} />
          <Field label="Pag-IBIG MID No." name="pagibigNumber" defaultValue={employee.pagibigNumber ?? ""} />
          <Field label="TIN" name="tinNumber" defaultValue={employee.tinNumber ?? ""} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Employment" subtitle="Changes to salary are recorded in the salary history trail" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Employment Type" name="employmentType" defaultValue={employee.employmentType}>
            {["PROBITIONARY", "REGULAR", "CONTRACTUAL", "SEASONAL", "PART_TIME", "INTERN"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select label="Status" name="status" defaultValue={employee.status}>
            {["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED", "END_OF_CONTRACT", "AWOL"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </Select>
          <Field label="Monthly Basic Salary (PHP)" name="basicSalary" type="number" min="0" step="0.01" defaultValue={String(employee.basicSalary)} />
          <Field label="Regularized Date" name="regularizedDate" type="date" defaultValue={d(employee.regularizedDate)} />
          <Field label="Separation Date" name="separationDate" type="date" defaultValue={d(employee.separationDate)} />
          <Field label="Separation Reason" name="separationReason" defaultValue={employee.separationReason ?? ""} />
          <Field label="Salary Change Reason" name="salaryChangeReason" placeholder="Only if changing salary" />

          <Select label="Site" name="siteId" defaultValue={employee.siteId ?? ""}>
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Department" name="departmentId" defaultValue={employee.departmentId ?? ""}>
            <option value="">—</option>
            {departments.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </Select>
          <Select label="Campaign" name="campaignId" defaultValue={employee.campaignId ?? ""}>
            <option value="">—</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select label="Position" name="positionId" defaultValue={employee.positionId ?? ""}>
            <option value="">—</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </Select>
          <Select label="Reports To" name="reportsToId" defaultValue={employee.reportsToId ?? ""}>
            <option value="">—</option>
            {employees.filter((e) => e.id !== employee.id).map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </Select>
          <Field label="Reset Bundy PIN" name="bundyPin" inputMode="numeric" pattern="\d*" maxLength={8} placeholder="Leave blank to keep" />
        </div>
      </Card>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Employee record updated.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </button>
      </div>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const { label, hint, ...rest } = props;
  return (
    <div>
      <label className="label">{label}</label>
      <input {...rest} className="field" />
      {hint ? <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="label">{label}</label>
      <select {...rest} className="field" />
    </div>
  );
}
