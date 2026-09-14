import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatLayout from "@/components/chat/chat-layout";

export const metadata = { title: "Messages" };

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ChatLayout currentUserId={user.id} />
    </div>
  );
}
