"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft, FileText } from "lucide-react";
import { Avatar } from "@/components/ui";
import MessageBubble from "./message-bubble";
import TypingIndicator from "./typing-indicator";
import { getMessages, deleteMessage, sendMessage } from "@/lib/actions/chat";
import { getSocket } from "@/lib/socket";
import type { Role } from "@prisma/client";

type Message = Awaited<ReturnType<typeof getMessages>>[number];

type ConversationParticipant = {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    employeeNumber: string | null;
  };
  lastReadAt: Date | null;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  userRole: Role;
  participants: ConversationParticipant[];
  isGroup: boolean;
  conversationName: string | null;
  onlineUsers: string[];
  onBack: () => void;
  onNewMessage: (convId: string) => void;
};

export default function MessageArea({
  conversationId,
  currentUserId,
  userRole,
  participants,
  isGroup,
  conversationName,
  onlineUsers,
  onBack,
  onNewMessage,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const other = participants.find((p) => p.userId !== currentUserId);
  const displayName = isGroup
    ? conversationName ?? "Group Chat"
    : other
    ? `${other.user.firstName ?? ""} ${other.user.lastName ?? ""}`.trim() || other.user.email
    : "Unknown";

  const isOnline = other ? onlineUsers.includes(other.userId) : false;
  const canUseTemplates = ["ADMIN", "SUPER_ADMIN", "HR"].includes(userRole);

  // Load messages
  useEffect(() => {
    setLoading(true);
    getMessages(conversationId).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [conversationId]);

  // Socket.io real-time
  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      socket.emit("join_conversation", conversationId);
      socket.emit("mark_read", conversationId);
    });

    if (socket.connected) {
      socket.emit("join_conversation", conversationId);
      socket.emit("mark_read", conversationId);
    }

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) {
        onNewMessage(msg.conversationId);
        return;
      }
      // Skip own messages — the send callback handles those
      if (msg.senderId === currentUserId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      socket.emit("mark_read", conversationId);
    };

    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      }
    };

    const handleUserStopTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.emit("leave_conversation", conversationId);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [conversationId, currentUserId, onNewMessage]);

  // Typing indicator logic
  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing_start", conversationId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      getSocket().emit("typing_stop", conversationId);
    }, 2000);
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      content,
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        email: "",
        employee: { firstName: "", lastName: "", photoUrl: null },
      },
    };

    // Optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    isTypingRef.current = false;
    getSocket().emit("typing_stop", conversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const socket = getSocket();
    if (socket.connected) {
      socket.emit("send_message", { conversationId, content }, (response: any) => {
        setSending(false);
        if (response?.error) {
          console.error("Failed to send:", response.error);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else if (response?.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...response, createdAt: new Date(response.createdAt) } : m))
          );
        }
      });
    } else {
      // Socket down — fall back to server action
      try {
        const real = await sendMessage(conversationId, content);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (real as any) : m))
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
      }
      setSending(false);
    }
  }, [input, conversationId, currentUserId, sending]);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteMessage(messageId, conversationId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      getSocket().emit("delete_message", { messageId, conversationId });
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }, [conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typingUserNames = Array.from(typingUsers)
    .map((uid) => {
      const p = participants.find((pp) => pp.userId === uid);
      if (!p) return null;
      return `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim() || p.user.email;
    })
    .filter(Boolean) as string[];

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover transition-colors md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative">
          <Avatar name={displayName} size="md" src={other?.user.photoUrl ?? undefined} />
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-foreground">{displayName}</h3>
          <p className="text-xs text-muted">
            {isOnline ? "Online" : isGroup ? `${participants.length} members` : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted">No messages yet</p>
            <p className="mt-1 text-xs text-muted-light">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-end">
            <div className="space-y-3">
              {messages.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId;
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    showSender={showSender}
                    onDelete={isOwn ? () => handleDelete(msg.id) : undefined}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator typingUserNames={typingUserNames} />

      {/* Input */}
      <div className="border-t border-border bg-white px-4 py-3">
        {/* Template Picker Dropdown */}
        {canUseTemplates && showTemplates && (
          <div className="mb-2 rounded-lg border border-border bg-white shadow-lg">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-light">
              HR Templates
            </p>
            {[
              { label: "Leave Approved", text: "✅ Your leave request has been approved. Please check your leave credits for details." },
              { label: "Leave Rejected", text: "❌ Your leave request has been rejected. Please contact HR for more information." },
              { label: "Payroll Notice", text: "💰 Your payslip for this period is now available. Please review it in the Payroll section." },
              { label: "Schedule Change", text: "📅 Your schedule has been updated. Please check the Schedules page for your new shift." },
              { label: "Document Reminder", text: "📋 Please submit the required documents to complete your file. Check your employee profile for details." },
              { label: "Onboarding Reminder", text: "👋 Welcome! Please complete the onboarding checklist in your employee profile." },
            ].map((tpl) => (
              <button
                key={tpl.label}
                onClick={() => {
                  setInput(tpl.text);
                  setShowTemplates(false);
                  inputRef.current?.focus();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-muted" />
                {tpl.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {canUseTemplates && (
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                showTemplates
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTypingStart();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
