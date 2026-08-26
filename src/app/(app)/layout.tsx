import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const settings = await db.companySettings.findFirst();
  const company = settings?.name ?? "HRIS";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={user.role} company={company} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          }}
          company={company}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
