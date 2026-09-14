"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui";
import { getUnreadCount } from "@/lib/actions/chat";

export default function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const c = await getUnreadCount();
        setCount(c);
      } catch {}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <Badge variant="red" size="sm">
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
