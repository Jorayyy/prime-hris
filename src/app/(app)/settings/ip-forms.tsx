"use client";

import { useActionState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

type ActionState = { error?: string; ok?: boolean };

type IpRow = { id: string; ip: string; label: string | null; active: boolean };

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-xs font-semibold text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs font-semibold text-emerald-600">Saved.</p>;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AddForm({ action }: { action: any }) {
  const [state, formAction, pending] = useActionState(action as (p: ActionState, f: FormData) => Promise<ActionState>, {} as ActionState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 p-5">
      <div>
        <label className="label">IP Address</label>
        <input name="ip" required className="field !w-40 font-mono text-sm" placeholder="e.g. 192.168.1.20" />
      </div>
      <div>
        <label className="label">Label</label>
        <input name="label" maxLength={100} className="field !w-52" placeholder="e.g. Reception kiosk" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Register IP"}
      </Button>
      <Feedback state={state} />
    </form>
  );
};

export function Row({
  ip,
  removeAction,
  toggleAction,
}: {
  ip: IpRow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeAction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleAction: any;
}) {
  const [rmState, rmAction, rmPending] = useActionState(removeAction as (p: ActionState, f: FormData) => Promise<ActionState>, {} as ActionState);
  const [tgState, tgAction, tgPending] = useActionState(toggleAction as (p: ActionState, f: FormData) => Promise<ActionState>, {} as ActionState);
  return (
    <li className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-2.5 first:border-t-0">
      <div>
        <p className="font-mono text-sm font-semibold">{ip.ip}</p>
        <p className="text-xs text-[var(--muted)]">{ip.label ?? "Unlabeled"}</p>
        {rmState.error || tgState.error ? (
          <p className="text-[10px] text-red-600">{rmState.error ?? tgState.error}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <form action={tgAction}>
          <input type="hidden" name="id" value={ip.id} />
          <button disabled={tgPending} className="text-xs font-semibold text-[var(--brand)] hover:underline">
        {tgPending ? "..." : ip.active ? "Disable" : "Enable"}
          </button>
        </form>
        <form action={rmAction}>
          <input type="hidden" name="id" value={ip.id} />
          <button disabled={rmPending} title="Remove" className="text-red-500 hover:text-red-700">
          {rmPending ? "..." : <Trash2 className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </li>
  );
};
