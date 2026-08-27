import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { createHash } from "crypto";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Track online users: userId -> Set<socketId>
  const onlineUsers = new Map<string, Set<string>>();
  // Track typing: conversationId -> Set<userId>
  const typingUsers = new Map<string, Set<string>>();

  function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  // Socket.io auth middleware — extract userId from handshake auth token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Authentication required"));

      // Import Prisma dynamically to avoid circular deps
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date() || !session.user.isActive) {
        await prisma.$disconnect();
        return next(new Error("Invalid or expired session"));
      }

      (socket.data as any).userId = session.user.id;
      (socket.data as any).userEmail = session.user.email;
      await prisma.$disconnect();
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as any).userId as string;
    console.log(`[Chat] User connected: ${userId} (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast online status to all
    io.emit("online_users", Array.from(onlineUsers.keys()));

    // Join user's conversation rooms
    socket.on("join_conversations", (ids: string[]) => {
      for (const id of ids) {
        socket.join(`conv:${id}`);
      }
    });

    // Join a single conversation
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    // Leave a conversation
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Handle new message
    socket.on(
      "send_message",
      async (data: { conversationId: string; content: string }, ack?: (msg: any) => void) => {
        try {
          const { conversationId, content } = data;
          const { PrismaClient } = await import("@prisma/client");
          const prisma = new PrismaClient();

          // Verify user is a participant
          const participant = await prisma.chatParticipant.findUnique({
            where: {
              conversationId_userId: { conversationId, userId },
            },
          });

          if (!participant) {
            await prisma.$disconnect();
            ack?.({ error: "Not a participant" });
            return;
          }

          const message = await prisma.chatMessage.create({
            data: {
              conversationId,
              senderId: userId,
              content,
            },
            include: {
              sender: {
                select: { id: true, email: true, employee: { select: { firstName: true, lastName: true, photoUrl: true } } },
              },
            },
          });

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          await prisma.$disconnect();

          // Broadcast to conversation room
          io.to(`conv:${conversationId}`).emit("new_message", message);

          ack?.(message);
        } catch (err) {
          console.error("[Chat] send_message error:", err);
          ack?.({ error: "Failed to send message" });
        }
      }
    );

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

    // Mark messages as read
    socket.on("mark_read", async (conversationId: string) => {
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();

        await prisma.chatParticipant.update({
          where: {
            conversationId_userId: { conversationId, userId },
          },
          data: { lastReadAt: new Date() },
        });

        await prisma.$disconnect();

        socket.to(`conv:${conversationId}`).emit("messages_read", {
          userId,
          conversationId,
          readAt: new Date(),
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

      // Clean up typing indicators
      for (const [convId, typers] of typingUsers) {
        if (typers.delete(userId)) {
          io.to(`conv:${convId}`).emit("user_stop_typing", { userId, conversationId: convId });
        }
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
