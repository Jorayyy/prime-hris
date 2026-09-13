import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatClient from "@/components/chat-client";

export const metadata = { title: "Messages" };

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <ChatClient currentUserId={user.id} />;
}
