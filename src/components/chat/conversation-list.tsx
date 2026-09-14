"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Search, Plus, Trash2, X } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import type { ConversationWithDetails, SearchResult } from "@/lib/actions/chat";
import { deleteConversation, searchMessages } from "@/lib/actions/chat";
import { formatDistanceToNow, fullName } from "@/lib/format";
import { getSocket } from "@/lib/socket";

const CATEGORIES = ["ALL", "GENERAL", "LEAVE", "PAYROLL", "SCHEDULE", "ONBOARDING", "SEPARATION"] as const;

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
  const [searchMode, setSearchMode] = useState<"conversations" | "messages">("conversations");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [messageResults, setMessageResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ convId: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (searchMode === "conversations" || q.length < 2) {
      setMessageResults([]);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchMessages(q);
        setMessageResults(results);
      } catch {}
      setSearching(false);
    }, 300);
  }, [searchMode]);

  const switchMode = (mode: "conversations" | "messages") => {
    setSearchMode(mode);
    setMessageResults([]);
    setSearch("");
    setCategoryFilter("ALL");
  };

  const filtered = conversations.filter((c) => {
    if (searchMode === "messages") return true;
    if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
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
    <div className="flex h-full w-full flex-col border-r border-border bg-white md:w-80">
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

      {/* Search Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => switchMode("conversations")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            searchMode === "conversations"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-foreground"
          }`}
        >
          Conversations
        </button>
        <button
          onClick={() => switchMode("messages")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            searchMode === "messages"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-foreground"
          }`}
        >
          Search Messages
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
          <input
            type="text"
            placeholder={searchMode === "conversations" ? "Search conversations..." : "Search message content..."}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg bg-background pl-9 pr-8 py-2 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setMessageResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      {searchMode === "conversations" && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary/10 text-primary"
                  : "bg-background text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchMode === "messages" ? (
          /* Message Search Results */
          searching ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-light">Searching...</p>
            </div>
          ) : messageResults.length > 0 ? (
            <div>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-light">
                {messageResults.length} result{messageResults.length !== 1 ? "s" : ""}
              </p>
              {messageResults.map((result) => {
                const senderName = fullName({
                  firstName: result.sender.firstName ?? "",
                  lastName: result.sender.lastName ?? "",
                });
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelect(result.conversationId);
                      setSearch("");
                      setMessageResults([]);
                      setSearchMode("conversations");
                    }}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted">
                        {result.conversation.name || senderName}
                      </span>
                      <span className="text-[10px] text-muted-light">
                        {formatDistanceToNow(result.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-foreground">{result.content}</p>
                    <p className="text-[10px] text-muted-light">by {senderName}</p>
                  </button>
                );
              })}
            </div>
          ) : search.length >= 2 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted">No messages found</p>
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-light">Type to search across all messages</p>
            </div>
          )
        ) : (
          /* Conversation List */
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-light" />
              <p className="text-xs font-medium text-muted">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-light">
                Start a new chat by clicking the + button
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {displayName}
                        </span>
                        {conv.category !== "GENERAL" && (
                          <span className="flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary">
                            {conv.category}
                          </span>
                        )}
                      </div>
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
          )
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
