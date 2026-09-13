"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  CircleDot,
} from "lucide-react";
import { Avatar, Badge, EmptyState } from "@/components/ui";
import { fullName, formatDistanceToNow } from "@/lib/format";
import {
  getConversations,
  getMessages,
  createConversation,
  searchUsers,
  sendMessage,
  markAsRead,
  deleteMessage,
  type ConversationWithDetails,
  type ChatUser,
} from "@/lib/actions/chat";

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

export default function ChatClient({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {}
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await getMessages(convId);
      setMessages(data as Message[]);
      await markAsRead(convId);
    } catch {}
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadMessages]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!activeId) return;
    pollRef.current = setInterval(() => {
      loadMessages(activeId);
      loadConversations();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadMessages, loadConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll conversations for unread counts even when no chat is open
  useEffect(() => {
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(q);
      setSearchResults(results);
    } catch {}
    setSearching(false);
  };

  const handleStartChat = async (userId: string) => {
    try {
      const conv = await createConversation([userId]);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadConversations();
      setActiveId(conv.id);
      setShowSidebar(false);
    } catch {}
  };

  const handleSend = async () => {
    if (!activeId || !input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic: add message locally
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUserId,
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        email: "",
        employee: { firstName: null, lastName: null, photoUrl: null },
      },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const real = await sendMessage(activeId, content);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (real as Message) : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeId) return;
    try {
      await deleteMessage(messageId, activeId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConvName = (conv: ConversationWithDetails) => {
    if (conv.name) return conv.name;
    const other = conv.participants.find((p) => p.userId !== currentUserId);
    if (!other) return "You";
    return fullName({
      firstName: other.user.firstName ?? "",
      lastName: other.user.lastName ?? "",
    });
  };

  const getConvUser = (conv: ConversationWithDetails): ChatUser | undefined => {
    return conv.participants.find((p) => p.userId !== currentUserId)?.user;
  };

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-white">
      {/* Sidebar: conversation list */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } w-full flex-col border-r border-border md:flex md:w-80 lg:w-96`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Messages</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showNewChat ? (
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartChat(u.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                  >
                    <Avatar
                      name={fullName({ firstName: u.firstName ?? "", lastName: u.lastName ?? "" })}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {fullName({ firstName: u.firstName ?? "", lastName: u.lastName ?? "" })}
                      </p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <p className="mt-2 text-center text-xs text-muted">Searching...</p>
            )}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted">Loading...</div>
          ) : conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              hint="Start a new chat by clicking the + button"
              icon={<MessageSquare className="h-8 w-8" />}
            />
          ) : (
            conversations.map((conv) => {
              const other = getConvUser(conv);
              const name = getConvName(conv);
              const isActive = conv.id === activeId;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveId(conv.id);
                    setShowSidebar(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-primary/5 border-r-2 border-primary"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <Avatar
                    name={name}
                    size="md"
                    status={other ? "online" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      {conv.lastMessage && (
                        <span className="ml-2 flex-shrink-0 text-[10px] text-muted">
                          {formatDistanceToNow(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {conv.lastMessage?.content ?? "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="blue" size="sm">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main: messages area */}
      <div
        className={`${
          showSidebar ? "hidden" : "flex"
        } flex-1 flex-col md:flex`}
      >
        {activeId && activeConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <button
                onClick={() => setShowSidebar(true)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Avatar
                name={getConvName(activeConv)}
                size="sm"
                status="online"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{getConvName(activeConv)}</p>
                <p className="text-xs text-muted">
                  {activeConv.participants.length} participant{activeConv.participants.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted">No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const senderName = fullName({
                  firstName: msg.sender.employee?.firstName ?? "",
                  lastName: msg.sender.employee?.lastName ?? "",
                });
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group flex max-w-[75%] items-end gap-2 ${
                        isMe ? "flex-row-reverse" : ""
                      }`}
                    >
                      {!isMe && (
                        <Avatar name={senderName} size="sm" />
                      )}
                      <div>
                        {!isMe && (
                          <p className="mb-1 text-[10px] font-semibold text-muted">
                            {senderName}
                          </p>
                        )}
                        <div
                          className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? "bg-primary text-white rounded-br-md"
                              : "bg-background border border-border rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="absolute -top-2 -right-2 hidden rounded-full bg-danger p-1 text-white group-hover:block"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-[10px] text-muted ${
                            isMe ? "text-right" : ""
                          }`}
                        >
                          {formatDistanceToNow(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none max-h-32"
                  style={{ minHeight: "42px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="rounded-xl bg-primary p-2.5 text-white hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              title="Select a conversation"
              hint="Choose from the sidebar or start a new chat"
              icon={<MessageSquare className="h-8 w-8" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
