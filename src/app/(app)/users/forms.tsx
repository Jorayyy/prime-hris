"use client";

import { updateUserAction } from "@/lib/actions/users";

import { useActionState } from "react";
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
  const isOwner = u.role === "SUPER_ADMIN";

  return (
    <tr className={u.isActive ? "" : "opacity-50"}>
      <td className="px-5 py-2.5">
        <p className="font-semibold">{u.email}</p>
        {isOwner ? <Badge tone="violet">SYSTEM OWNER</Badge> : null}
      </td>
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
      <td className="px-5 py-2.5 text-xs">{u.employee ?? "-"}</td>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CreateForm({ action, employees }: { action: any; employees: Array<{ id: string; label: string }> }) {
  const [state, formAction, pending] = useActionState(action as CreateUserFn, {} as ActionState);
  return (
    <form action={formAction} className="space-y-3 p-5">
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
        <select name="role" className="field" defaultValue="EMPLOYEE">
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="PAYROLL">Payroll</option>
          <option value="HR">HR</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>
      <div>
        <label className="label">Link to Employee (optional)</label>
        <select name="employeeId" className="field">
        <option value="">-- None --</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="w-full justify-center">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Create Account"}
      </Button>
      <Feedback state={state} />
    </form>
  );
};

