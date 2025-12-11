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
import { showSuccess, showError } from '@/lib/toast'

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

  // Use dedicated password update endpoint
  const { mutate: changePassword, loading: updatingPassword } = useMutation<any, any>("post")

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
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!passwordData.newPassword.trim()) {
      showError('New password is required')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showError('New password must be at least 6 characters long')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New password and confirm password do not match')
      return
    }

    if (!currentUser?.id) {
      showError('User information not available')
      return
    }

    if (!passwordData.currentPassword.trim()) {
      showError('Current password is required to change password')
      return
    }

    try {
      // Call dedicated password change endpoint
      const payload: any = {
        userId: currentUser.id,
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim(),
      }

      console.log('Attempting password update:', {
        endpoint: `/auth/update-password`,
        userId: currentUser.id,
        payloadStructure: Object.keys(payload)
      })

      const result = await changePassword(`/auth/update-password`, payload)
      
      console.log('Password update response:', result)
      
      // Verify the update was successful
      if (result === null || result === undefined) {
        // Some APIs return null on success, which is fine
        console.log('Password update completed (null response indicates success)')
      }
      
      // Reset form on success
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      showSuccess('Password updated successfully!')
    } catch (err: any) {
      console.error('Password update error details:', {
        error: err,
        response: err?.response,
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message
      })
      
      // Extract error message from response
      let errorMessage = 'Failed to update password'
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      // Provide more helpful error messages based on status code
      if (err?.response?.status === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        showError('Current password is incorrect or authentication failed. Please verify and try again.')
      } else if (err?.response?.status === 400 || errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        showError('Invalid password format or missing required fields. Please check your input and try again.')
      } else if (err?.response?.status === 404 || errorMessage.includes('404')) {
        showError('User not found. Please refresh the page and try again.')
      } else if (err?.response?.status === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        showError('You do not have permission to change the password.')
      } else {
        showError(errorMessage || 'Failed to update password. Please check the console for details and try again.')
      }
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
