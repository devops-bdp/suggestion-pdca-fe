"use client"

import { useState, useCallback } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ConfirmOptions {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning" | "info" | "success"
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    options: ConfirmOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    open: false,
    options: null,
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true)
    }
    setConfirmState({
      open: false,
      options: null,
      resolve: null,
    })
  }, [confirmState])

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false)
    }
    setConfirmState({
      open: false,
      options: null,
      resolve: null,
    })
  }, [confirmState])

  const ConfirmDialogComponent = confirmState.options ? (
    <ConfirmDialog
      open={confirmState.open}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}
      title={confirmState.options.title}
      description={confirmState.options.description}
      confirmText={confirmState.options.confirmText}
      cancelText={confirmState.options.cancelText}
      variant={confirmState.options.variant}
      onConfirm={handleConfirm}
    />
  ) : null

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  }
}

