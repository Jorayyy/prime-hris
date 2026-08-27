"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui";
import { Trash2 } from "lucide-react";

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
  onDelete?: () => void;
};

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({ message, isOwn, showSender, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);

  const senderName = message.sender.employee
    ? `${message.sender.employee.firstName ?? ""} ${message.sender.employee.lastName ?? ""}`.trim()
    : message.sender.email;

  return (
    <div
      className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
        <div className="relative">
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isOwn
                ? "bg-primary text-white rounded-br-md"
                : "bg-surface-hover text-foreground rounded-bl-md border border-border-light"
            }`}
          >
            {message.content}
          </div>
          {onDelete && hovered && (
            <button
              onClick={onDelete}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-dark"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className={`mt-1 text-[10px] text-muted-light ${isOwn ? "text-right" : ""}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
