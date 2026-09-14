"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, ExternalLink } from "lucide-react";
import { createConversation } from "@/lib/actions/chat";
import type { HrInboxItem } from "@/lib/actions/hr-inbox";

type Props = {
  item: HrInboxItem;
  currentUserId?: string;
};

export default function HrInboxActions({ item, currentUserId }: Props) {
  const router = useRouter();

  const handleMessage = async () => {
    try {
      const conv = await createConversation(
        [item.employeeId],
        `${item.type === "leave" ? "Leave" : item.type === "overtime" ? "Overtime" : item.type === "payroll_exception" ? "Payroll" : "Attendance"} – ${item.employeeName}`
      );
      router.push(`/chat?conv=${conv.id}`);
    } catch {
      router.push("/chat");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleMessage}
        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <MessageSquare className="h-3 w-3" />
        Message
      </button>
      <a
        href={item.link}
        className="flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
