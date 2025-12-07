"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  FileText,
  CheckCircle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { logout } from "@/types/api-client";
import { apiClient } from "@/types/api-client";
import { UserProfile, Role } from "@/types/api";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  roles?: string[]; // Roles that can access this menu
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "Submissions", href: "/dashboard/submissions", roles: ["Super_Admin", "Group_Leader", "Staff", "Non_Staff"] },
  { icon: CheckCircle, label: "Approval", href: "/dashboard/approval", roles: ["Super_Admin", "Supervisor", "Dept_Head", "Project_Manager"] },
  { icon: ClipboardCheck, label: "Scoring", href: "/dashboard/scoring", roles: ["Super_Admin", "Dept_Head"] },
  { icon: Users, label: "Users", href: "/dashboard/users", roles: ["Super_Admin", "Group_Leader"] },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = typeof window !== "undefined"
        ? window.localStorage.getItem("token")
        : null;

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.get<UserProfile>("/users/profile");
        const profileData = (data as any)?.data || data;
        setUser(profileData);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Filter menu items based on user role
  const getFilteredMenuItems = () => {
    if (!user?.role) return allMenuItems.filter(item => !item.roles); // Show only public items if no role

    const userRole = user.role as string;
    
    // Staff and Non_Staff can only access Dashboard and Submissions
    if (userRole === Role.Staff || userRole === Role.Non_Staff) {
      return allMenuItems.filter(item => 
        item.href === "/dashboard" || item.href === "/dashboard/submissions"
      );
    }

    // Supervisor, Project_Manager, and Dept_Head can access Dashboard, Approval, Scoring, and Settings (not Submissions or Users)
    if (userRole === Role.Supervisor || userRole === Role.Project_Manager || userRole === Role.Dept_Head) {
      return allMenuItems.filter(item => {
        // Always show Dashboard and Settings
        if (item.href === "/dashboard" || item.href === "/dashboard/settings") return true;
        // Show items where the role is in the roles array
        if (item.roles) return item.roles.includes(userRole);
        // Hide items without roles (except Dashboard and Settings which are already handled)
        return false;
      });
    }

    // Other roles: filter based on roles array
    return allMenuItems.filter(item => {
      if (!item.roles) return true; // Public menu items
      return item.roles.includes(userRole);
    });
  };

  const menuItems = getFilteredMenuItems();

  return (
    <div className="flex flex-col h-full bg-blue-700 text-white p-6 gap-4">
      <div className="flex items-center gap-1">
        <Image src="/img/logo.png" alt="Batara Logo" width={70} height={70} />
        <div className="flex flex-col items-end text-end">
          <div className="text-sm font-bold">Batara Dharma Persada</div>
        </div>
      </div>
      <div className="text-slate-300 text-sm">Suggestion System</div>

      <nav className="flex-1 space-y-2">
        {loading ? (
          <div className="text-slate-300 text-sm">Loading...</div>
        ) : (
          menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white text-black hover:bg-slate-100"
                      : "text-slate-300 hover:bg-blue-600"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })
        )}
      </nav>

      <Button
        variant="ghost"
        onClick={handleLogout}
        className="w-full justify-start gap-3 text-slate-300 hover:bg-blue-600 transition-colors cursor-pointer"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </Button>
    </div>
  );
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 dark:border-slate-800">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40 h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 [&>button]:hidden">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
