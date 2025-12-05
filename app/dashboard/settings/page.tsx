'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { useData } from '@/types/hooks'
import { UserProfile, Role } from '@/types/api'

export default function SettingsPage() {
  const router = useRouter()
  const { data: currentUser } = useData<UserProfile>({
    endpoint: "/users/profile",
  })

  // Route protection: Staff and Non_Staff cannot access
  useEffect(() => {
    if (currentUser?.role) {
      const userRole = currentUser.role as string
      if (userRole === Role.Staff || userRole === Role.Non_Staff) {
        router.replace("/dashboard")
      }
    }
  }, [currentUser, router])

  if (currentUser?.role) {
    const userRole = currentUser.role as string
    if (userRole === Role.Staff || userRole === Role.Non_Staff) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <Card className="p-6">
            <p className="text-red-600 dark:text-red-400">
              You don't have permission to access this page.
            </p>
          </Card>
        </div>
      )
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Configure your dashboard settings
        </p>
      </div>

      {/* Content Area */}
      <Card className="p-12 flex items-center justify-center min-h-96">
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Settings content goes here
        </p>
      </Card>
    </div>
  )
}
