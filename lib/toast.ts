import { toast, ToastOptions } from 'react-toastify'

// Toast configuration sesuai dengan theme
const defaultToastOptions: ToastOptions = {
  position: 'bottom-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'colored',
}

export const showSuccess = (message: string, options?: ToastOptions) => {
  toast.success(message, {
    ...defaultToastOptions,
    ...options,
  })
}

export const showError = (message: string, options?: ToastOptions) => {
  toast.error(message, {
    ...defaultToastOptions,
    ...options,
  })
}

export const showInfo = (message: string, options?: ToastOptions) => {
  toast.info(message, {
    ...defaultToastOptions,
    ...options,
  })
}

export const showWarning = (message: string, options?: ToastOptions) => {
  toast.warning(message, {
    ...defaultToastOptions,
    ...options,
  })
}

// Confirm dialog utility - returns a promise that resolves to true if confirmed
export const showConfirm = (
  message: string,
  title: string = "Confirm Action",
  variant: "default" | "destructive" | "warning" | "info" | "success" = "default"
): Promise<boolean> => {
  return new Promise((resolve) => {
    // Map variant to button styles
    const variantStyles = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      warning: "bg-yellow-600 text-white hover:bg-yellow-700",
      info: "bg-blue-600 text-white hover:bg-blue-700",
      success: "bg-green-600 text-white hover:bg-green-700",
    }
    
    const confirmButtonClass = variantStyles[variant] || variantStyles.default
    
    // Create a temporary dialog element
    const dialog = document.createElement('div')
    dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50'
    dialog.innerHTML = `
      <div class="bg-card text-card-foreground rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-2">${title}</h3>
        <p class="text-muted-foreground mb-4">${message}</p>
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 rounded-md border border-border hover:bg-accent" data-action="cancel">Cancel</button>
          <button class="px-4 py-2 rounded-md ${confirmButtonClass}" data-action="confirm">Confirm</button>
        </div>
      </div>
    `
    
    const handleAction = (confirmed: boolean) => {
      document.body.removeChild(dialog)
      resolve(confirmed)
    }
    
    dialog.querySelector('[data-action="confirm"]')?.addEventListener('click', () => handleAction(true))
    dialog.querySelector('[data-action="cancel"]')?.addEventListener('click', () => handleAction(false))
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) handleAction(false)
    })
    
    document.body.appendChild(dialog)
  })
}

