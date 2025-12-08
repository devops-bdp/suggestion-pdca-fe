'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useData, useMutation } from '@/types/hooks'
import { UserProfile, Role } from '@/types/api'
import { Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { data: currentUser } = useData<UserProfile>({
    endpoint: "/users/profile",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const { mutate: updatePassword, loading: updatingPassword } = useMutation<any, any>("put")

  // Route protection: Staff and Non_Staff cannot access
  useEffect(() => {
    if (currentUser?.role) {
      const userRole = currentUser.role as string
      if (userRole === Role.Staff || userRole === Role.Non_Staff) {
        router.replace("/dashboard")
      }
    }
  }, [currentUser, router])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear errors when user starts typing
    if (formError) setFormError('')
    if (formSuccess) setFormSuccess('')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    // Validation
    if (!passwordData.newPassword.trim()) {
      setFormError('New password is required')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setFormError('New password and confirm password do not match')
      return
    }

    if (!currentUser?.id) {
      setFormError('User information not available')
      return
    }

    try {
      // Update password using the user update endpoint
      const payload: any = {
        password: passwordData.newPassword
      }

      // If current password is provided, include it (some APIs require it)
      if (passwordData.currentPassword.trim()) {
        payload.currentPassword = passwordData.currentPassword
      }

      await updatePassword(`/users/${currentUser.id}`, payload)
      
      // Reset form on success
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setFormSuccess('Password updated successfully!')
      
      // Clear success message after 5 seconds
      setTimeout(() => setFormSuccess(''), 5000)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to update password'
      )
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Configure your dashboard settings
        </p>
      </div>

      {/* Reset Password Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Reset Password
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Change your account password
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Current Password (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium">
                Current Password (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent cursor-pointer"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min. 6 characters)"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent cursor-pointer"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {formError}
                </p>
              </div>
            )}

            {/* Success Message */}
            {formSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-400 text-sm">
                  {formSuccess}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updatingPassword}
                className="cursor-pointer"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
