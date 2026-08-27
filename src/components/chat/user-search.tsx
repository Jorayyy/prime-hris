"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import { searchUsers } from "@/lib/actions/chat";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  employeeNumber: string | null;
};

type Props = {
  onSelect: (userId: string) => void;
  onClose: () => void;
};

export default function UserSearch({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await searchUsers(value);
      setResults(users);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-bold text-foreground">New Message</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
          <input
            type="text"
            placeholder="Search by name, email, or employee #..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-light">Searching...</p>
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted">No users found</p>
          </div>
        )}

        {results.map((user) => {
          const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
          return (
            <button
              key={user.id}
              onClick={() => onSelect(user.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
            >
              <Avatar name={name} size="md" src={user.photoUrl ?? undefined} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted">
                  {user.employeeNumber ? `${user.employeeNumber} · ` : ""}{user.email}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
