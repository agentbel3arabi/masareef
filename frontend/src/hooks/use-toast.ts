"use client"

// Thin wrapper around sonner — keeps the old useToast / toast call-site API
// so existing consumers don't need to change.
import { toast as sonnerToast } from "sonner"

type ToastOptions = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

function toast({ title, description, variant, duration }: ToastOptions) {
  if (variant === "destructive") {
    return sonnerToast.error(title, { description, duration })
  }
  return sonnerToast(title, { description, duration })
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  }
}

export { useToast, toast }
