"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/footer";

const AUTH_TOKEN_KEY = "token";

type AuthStatus = "checking" | "authorized" | "unauthorized";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      router.replace("/login");
      // Defer state update to next event loop tick to avoid cascading renders
      setTimeout(() => {
        setAuthStatus("unauthorized");
      }, 0);
      return;
    }

    // Defer state update to next event loop tick to avoid cascading renders
    setTimeout(() => {
      setAuthStatus("authorized");
    }, 0);
  }, [router]);

  if (authStatus === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Checking access...</p>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="p-6">
            {children}
          </div>
          <div className="mt-6">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
