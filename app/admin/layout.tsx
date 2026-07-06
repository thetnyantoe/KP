import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/appsidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className=" w-screen">
        <SidebarTrigger className="cursor-pointer mt-[10px]" />
        {children}
      </main>
    </SidebarProvider>
  );
}
