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
import { UserProfile, PermissionLevel } from "@/types/api";
import { showSuccess } from "@/lib/toast";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  permissionLevels?: PermissionLevel[]; // Permission levels that can access this menu
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }, // Available to all
  { icon: FileText, label: "Suggestions", href: "/dashboard/suggestions", permissionLevels: [PermissionLevel.SUBMITTER, PermissionLevel.FULL_ACCESS] },
  { icon: CheckCircle, label: "Approval", href: "/dashboard/approval", permissionLevels: [PermissionLevel.APPROVAL_ONLY, PermissionLevel.APPROVAL_SCORING, PermissionLevel.FULL_ACCESS] },
  { icon: ClipboardCheck, label: "Scoring", href: "/dashboard/scoring", permissionLevels: [PermissionLevel.SCORING_ONLY, PermissionLevel.APPROVAL_SCORING, PermissionLevel.FULL_ACCESS] },
  { icon: Users, label: "Users", href: "/dashboard/users", permissionLevels: [PermissionLevel.FULL_ACCESS] },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" }, // Available to all
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
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    showSuccess("Logged out successfully!");
    setTimeout(() => {
      router.replace("/login");
    }, 500);
  };

  // Filter menu items based on user permissionLevel from database
  const getFilteredMenuItems = () => {
    // If no user or no permissionLevel, show only public items (Dashboard and Settings)
    if (!user?.permissionLevel) {
      return allMenuItems.filter(item => 
        !item.permissionLevels || item.href === "/dashboard" || item.href === "/dashboard/settings"
      );
    }

    const userPermissionLevel = user.permissionLevel as PermissionLevel;

    // Helper function to check if user has a specific capability
    const hasCapability = (capability: PermissionLevel): boolean => {
      // FULL_ACCESS has all capabilities
      if (userPermissionLevel === PermissionLevel.FULL_ACCESS) {
        return true;
      }
      
      // Check direct match
      if (userPermissionLevel === capability) {
        return true;
      }
      
      // Check combinations
      // APPROVAL_SCORING means user has both APPROVAL_ONLY and SCORING_ONLY capabilities
      if (userPermissionLevel === PermissionLevel.APPROVAL_SCORING) {
        return capability === PermissionLevel.APPROVAL_ONLY || 
               capability === PermissionLevel.SCORING_ONLY ||
               capability === PermissionLevel.SUBMITTER;
      }
      
      // APPROVAL_ONLY and SCORING_ONLY users can also submit (SUBMITTER is default for all)
      if ((userPermissionLevel === PermissionLevel.APPROVAL_ONLY || 
           userPermissionLevel === PermissionLevel.SCORING_ONLY) &&
          capability === PermissionLevel.SUBMITTER) {
        return true;
      }
      
      return false;
    };

    // Filter menu items based on permissionLevel
    return allMenuItems.filter(item => {
      // Always show Dashboard and Settings (public items)
      if (item.href === "/dashboard" || item.href === "/dashboard/settings") {
        return true;
      }

      // If menu item has permissionLevels requirement, check if user has any of the required capabilities
      if (item.permissionLevels) {
        return item.permissionLevels.some(level => hasCapability(level));
      }

      // If menu item has no permissionLevels requirement, it's public (already handled above)
      return false;
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
              className="fixed top-4 left-4 z-40 h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
