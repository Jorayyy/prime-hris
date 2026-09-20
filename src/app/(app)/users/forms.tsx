"use client";

import { updateUserAction, linkUserToEmployeeAction } from "@/lib/actions/users";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Badge, statusTone, Button } from "@/components/ui";

type ActionState = { error?: string; ok?: boolean };

type UserRowData = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  employee: string | null;
  hideRole?: boolean;
  unlinkedEmployees?: Array<{ id: string; label: string }>;
};

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-xs font-semibold text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs font-semibold text-emerald-600">Saved.</p>;
  return null;
}

export function UserRow({ u }: { u: UserRowData }) {
  const [roleState, roleAction, rolePending] = useActionState(updateUserAction, {} as ActionState);
  const [pwState, pwAction, pwPending] = useActionState(updateUserAction, {} as ActionState);
  const [tglState, tglAction, tglPending] = useActionState(updateUserAction, {} as ActionState);
  const [linkState, linkAction, linkPending] = useActionState(linkUserToEmployeeAction, {} as ActionState);
  const isOwner = u.role === "SUPER_ADMIN";

  return (
    <tr className={u.isActive ? "" : "opacity-50"}>
      <td className="px-5 py-2.5">
        <p className="font-semibold">{u.email}</p>
        {isOwner ? <Badge tone="violet">SYSTEM OWNER</Badge> : null}
      </td>
      {!u.hideRole && (
        <td className="px-5 py-2.5">
          {isOwner ? (
            <span className="text-xs font-bold">{u.role}</span>
          ) : (
            <form action={roleAction} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="action" value="SET_ROLE" />
              <select name="role" defaultValue={u.role} className="field !w-auto !py-1 text-xs">
                <option value="ADMIN">ADMIN</option>
                <option value="HR">HR</option>
                <option value="PAYROLL">PAYROLL</option>
                <option value="MANAGER">MANAGER</option>
                <option value="EMPLOYEE">EMPLOYEE</option>
              </select>
              <button disabled={rolePending} className="text-xs font-semibold text-[var(--brand)] hover:underline">
                {rolePending ? "..." : "Set"}
              </button>
            </form>
          )}
          <Feedback state={roleState} />
        </td>
      )}
      <td className="px-5 py-2.5 text-xs">
        {u.employee ? (
          u.employee
        ) : u.unlinkedEmployees && u.unlinkedEmployees.length > 0 ? (
          <form action={linkAction} className="flex items-center gap-1.5">
            <input type="hidden" name="userId" value={u.id} />
            <select name="employeeId" className="field !w-auto !py-1 text-[11px]" required>
              <option value="">Link employee...</option>
              {u.unlinkedEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <button disabled={linkPending} className="text-[11px] font-semibold text-[var(--brand)] hover:underline">
              {linkPending ? "..." : "Link"}
            </button>
          </form>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        )}
        <Feedback state={linkState} />
      </td>
      <td className="px-5 py-2.5">
        <div className="flex flex-col gap-1">
          <Badge tone={statusTone(u.isActive ? "ACTIVE" : "INACTIVE")}>{u.isActive ? "Active" : "Disabled"}</Badge>
          {u.lastLoginAt ? (
            <span className="text-[10px] text-[var(--muted)]">{new Date(u.lastLoginAt).toLocaleDateString()}</span>
          ) : null}
        </div>
        <Feedback state={tglState} />
      </td>
      <td className="px-5 py-2.5">
        {isOwner ? (
          <span className="text-xs text-[var(--muted)]">Locked</span>
        ) : (
          <div className="flex flex-col gap-2">
            <form action={pwAction} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="action" value="RESET_PASSWORD" />
              <input
                name="password"
                type="password"
                placeholder="New password"
                minLength={8}
                maxLength={72}
                className="field !w-32 !py-1 text-xs"
                required
              />
              <button disabled={pwPending} className="text-xs font-semibold text-[var(--brand)] hover:underline">
                {pwPending ? "..." : "Reset PW"}
              </button>
            </form>
            <Feedback state={pwState} />
            {!isOwner && (
              <form action={tglAction}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="action" value="TOGGLE_ACTIVE" />
                <button disabled={tglPending} className="text-xs font-semibold text-red-600 hover:underline">
                  {u.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

type CreateUserFn = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const STAFF_ROLES = ["ADMIN", "HR", "PAYROLL", "MANAGER"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CreateForm({ action, employees }: { action: any; employees: Array<{ id: string; label: string }> }) {
  const [state, formAction, pending] = useActionState(action as CreateUserFn, {} as ActionState);
  const [role, setRole] = useState("EMPLOYEE");
  const isStaff = STAFF_ROLES.includes(role);

  return (
    <form action={formAction} className="space-y-3 p-5">
      {isStaff && (
        <p className="rounded-md bg-[var(--primary)]/5 px-3 py-2 text-xs text-[var(--primary)]">
          A paired EMPLOYEE account will be auto-created for payslip access.
        </p>
      )}
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required maxLength={200} className="field" />
      </div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required minLength={8} maxLength={72} className="field" />
      </div>
      <div>
        <label className="label">Role</label>
        <select name="role" className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="PAYROLL">Payroll</option>
          <option value="HR">HR</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>
      {isStaff && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input name="firstName" type="text" required maxLength={100} className="field" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input name="lastName" type="text" required maxLength={100} className="field" />
            </div>
          </div>
          <div>
            <label className="label">Link to Existing Employee (optional)</label>
            <select name="employeeId" className="field">
              <option value="">-- Auto-create new --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Create Account"}
      </Button>
      <Feedback state={state} />
    </form>
  );
};

