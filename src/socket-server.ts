import { Server } from "socket.io";
import { createServer } from "http";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const PORT = parseInt(process.env.PORT || "3001", 10);
const prisma = new PrismaClient();

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://prime-hris.vercel.app",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST"],
  },
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();
// Track typing: conversationId -> Set<userId>
const typingUsers = new Map<string, Set<string>>();

// Auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return next(new Error("Invalid or expired session"));
    }

    socket.data.userId = session.user.id;
    socket.data.userEmail = session.user.email;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  console.log(`[Chat] User connected: ${userId} (${socket.id})`);

  // Track online status
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socket.id);
  io.emit("online_users", Array.from(onlineUsers.keys()));

  // Join user's conversation rooms
  socket.on("join_conversations", (ids: string[]) => {
    for (const id of ids) socket.join(`conv:${id}`);
  });

  socket.on("join_conversation", (conversationId: string) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Handle new message
  socket.on("send_message", async (data: { conversationId: string; content: string }, ack?: (msg: any) => void) => {
    try {
      const { conversationId, content } = data;

      const participant = await prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });

      if (!participant) {
        ack?.({ error: "Not a participant" });
        return;
      }

      const message = await prisma.chatMessage.create({
        data: { conversationId, senderId: userId, content },
        include: {
          sender: {
            select: { id: true, email: true, employee: { select: { firstName: true, lastName: true, photoUrl: true } } },
          },
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      io.to(`conv:${conversationId}`).emit("new_message", message);
      ack?.(message);
    } catch (err) {
      console.error("[Chat] send_message error:", err);
      ack?.({ error: "Failed to send message" });
    }
  });

  // Typing indicators
  socket.on("typing_start", (conversationId: string) => {
    if (!typingUsers.has(conversationId)) typingUsers.set(conversationId, new Set());
    typingUsers.get(conversationId)!.add(userId);
    socket.to(`conv:${conversationId}`).emit("user_typing", { userId, conversationId });
  });

  socket.on("typing_stop", (conversationId: string) => {
    typingUsers.get(conversationId)?.delete(userId);
    socket.to(`conv:${conversationId}`).emit("user_stop_typing", { userId, conversationId });
  });

  // Mark as read
  socket.on("mark_read", async (conversationId: string) => {
    try {
      await prisma.chatParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      });

      socket.to(`conv:${conversationId}`).emit("messages_read", {
        userId, conversationId, readAt: new Date(),
      });
    } catch (err) {
      console.error("[Chat] mark_read error:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`[Chat] User disconnected: ${userId} (${socket.id})`);
    onlineUsers.get(userId)?.delete(socket.id);
    if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    for (const [convId, typers] of typingUsers) {
      if (typers.delete(userId)) {
        io.to(`conv:${convId}`).emit("user_stop_typing", { userId, conversationId: convId });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Chat] Socket.io server running on port ${PORT}`);
});
