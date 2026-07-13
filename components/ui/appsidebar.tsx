import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  BadgePercent,
  Bot,
  Package2,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";

const menuGroups = [
  {
    label: "Main",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        url: "/admin",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Products",
        icon: Package,
        url: "/admin/products",
      },

      {
        title: "Add Product",
        icon: Plus,
        url: "/admin/addproduct",
      },
      {
        title: "Delivery",
        icon: Package2,
        url: "/admin/delivery",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Sales",
        icon: ShoppingCart,
        url: "/admin/sales",
      },
      {
        title: "Sale Details",
        icon: ShoppingCart,
        url: "/admin/saledetails",
      },
      {
        title: "Add sale",
        icon: Plus,
        url: "/admin/addsale",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        title: "AI Chat",
        icon: Bot,
        url: "/admin/aichat",
      },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className=" text-[#eb7d2d] flex mt-[10px]">
          <p className="text-4xl font-bold">KP</p>
          <p className="text-sm tracking-tighter ml-[4px]">
            Electronic Market <br />
            Retails and Wholesale
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton>
                      <a
                        href={item.url}
                        className="flex items-center gap-2 w-full"
                      >
                        <item.icon />

                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <a
                href="/settings"
                className="flex items-center gap-2 w-full text-xs text-black/40 font-thiner"
              >
                <span>2026 all rights reserved</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>{" "}
    </Sidebar>
  );
}
