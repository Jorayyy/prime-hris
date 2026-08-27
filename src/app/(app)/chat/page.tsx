import { requireUser } from "@/lib/auth";
import ChatLayout from "@/components/chat/chat-layout";

export default async function ChatPage() {
  const user = await requireUser();

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ChatLayout currentUserId={user.id} />
    </div>
  );
}
