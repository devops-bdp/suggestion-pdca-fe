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

