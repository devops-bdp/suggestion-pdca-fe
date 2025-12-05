"use client";

import React from "react";
import { Copyright } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Section - Company Info */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Copyright className="h-4 w-4" />
              <span>{currentYear} PT Batara Dharma Persada</span>
            </div>
            <span className="hidden md:inline">|</span>
            <span>All Rights Reserved</span>
          </div>

          {/* Right Section - System Info */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-2">
              version 1.0.0  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              Beta
            </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
