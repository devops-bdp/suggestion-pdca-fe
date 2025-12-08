"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="p-12 text-center">
          {/* Logo - Centered at top */}
          <div className="flex flex-col items-center justify-center mb-8">
            <Image 
              src="/img/logo.png" 
              alt="Batara Logo" 
              width={80} 
              height={80}
              className="object-contain mb-3"
            />
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Batara Dharma Persada
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Suggestion System
            </div>
          </div>

          {/* 404 Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-8xl font-bold text-black dark:text-white mb-4">
                404
              </h1>
              <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Page Not Found
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 pt-6">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                className="gap-2 bg-blue-700 hover:bg-blue-800"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

