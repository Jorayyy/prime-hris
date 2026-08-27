"use client";

import { Avatar } from "@/components/ui";
import type { ChatUser } from "@/lib/actions/chat";

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date;
  sender: {
    id: string;
    email: string;
    employee: {
      firstName: string | null;
      lastName: string | null;
      photoUrl: string | null;
    } | null;
  };
};

type Props = {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
};

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({ message, isOwn, showSender }: Props) {
  const senderName = message.sender.employee
    ? `${message.sender.employee.firstName ?? ""} ${message.sender.employee.lastName ?? ""}`.trim()
    : message.sender.email;

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && showSender ? (
        <Avatar
          name={senderName}
          size="sm"
          src={message.sender.employee?.photoUrl ?? undefined}
        />
      ) : !isOwn ? (
        <div className="w-8 shrink-0" />
      ) : null}

      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {showSender && !isOwn && (
          <p className="mb-1 text-[10px] font-semibold text-muted">{senderName}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isOwn
              ? "bg-primary text-white rounded-br-md"
              : "bg-surface-hover text-foreground rounded-bl-md border border-border-light"
          }`}
        >
          {message.content}
        </div>
        <p className={`mt-1 text-[10px] text-muted-light ${isOwn ? "text-right" : ""}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
