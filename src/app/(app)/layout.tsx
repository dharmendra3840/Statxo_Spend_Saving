import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecordsProvider } from "@/components/RecordsProvider";
import { ToastProvider } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Second line of defence. Middleware already redirects unauthenticated
  // requests, but a layout that renders data should not assume that ran.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <RecordsProvider>
        <AppShell email={user.email ?? ""}>{children}</AppShell>
      </RecordsProvider>
    </ToastProvider>
  );
}
