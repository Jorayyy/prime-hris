"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Search, Plus, Trash2 } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import type { ConversationWithDetails } from "@/lib/actions/chat";
import { deleteConversation } from "@/lib/actions/chat";
import { formatDistanceToNow } from "@/lib/format";
import { getSocket } from "@/lib/socket";

type Props = {
  conversations: ConversationWithDetails[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onlineUsers: string[];
  currentUserId: string;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
};

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onlineUsers,
  currentUserId,
  onNewChat,
  onDeleteConversation,
}: Props) {
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{ convId: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const other = c.participants.find((p) => p.userId !== currentUserId);
    if (!other) return false;
    const name = `${other.user.firstName ?? ""} ${other.user.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || other.user.email.toLowerCase().includes(q);
  });

  const handleContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    setContextMenu({ convId, x: e.clientX, y: e.clientY });
  };

  const handleDelete = async (convId: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(convId);
      getSocket().emit("delete_conversation", convId);
      onDeleteConversation(convId);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
    setContextMenu(null);
  };

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Messages</h2>
        <button
          onClick={onNewChat}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-muted-light" />
            <p className="text-xs font-medium text-muted">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-light">
              Start a new chat to begin messaging
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const other = conv.participants.find((p) => p.userId !== currentUserId);
            const isOnline = other ? onlineUsers.includes(other.userId) : false;
            const isActive = conv.id === activeId;
            const displayName = conv.isGroup
              ? conv.name ?? "Group Chat"
              : other
              ? `${other.user.firstName ?? ""} ${other.user.lastName ?? ""}`.trim() || other.user.email
              : "Unknown";

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv.id)}
                className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
                  isActive ? "bg-primary/5 border-r-2 border-primary" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar name={displayName} size="md" />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {displayName}
                    </span>
                    <div className="flex items-center gap-1">
                      {conv.lastMessage && (
                        <span className="shrink-0 text-[10px] text-muted-light">
                          {formatDistanceToNow(conv.lastMessage.createdAt)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conv.id);
                        }}
                        className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-muted-light hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="truncate text-xs text-muted">
                      {conv.lastMessage
                        ? conv.lastMessage.senderId === currentUserId
                          ? `You: ${conv.lastMessage.content}`
                          : conv.lastMessage.content
                        : "No messages yet"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge variant="blue" size="sm">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded-lg border border-border bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleDelete(contextMenu.convId)}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete conversation
          </button>
        </div>
      )}
    </div>
  );
}
