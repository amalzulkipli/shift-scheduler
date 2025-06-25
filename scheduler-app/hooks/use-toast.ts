"use client"

import { useState, useCallback, useEffect } from "react"
import type { ToastProps } from "@/components/ui/toast"

type ToastInput = Omit<ToastProps, "id" | "onClose"> & {
  id?: string
}

interface ToastState {
  toasts: ToastProps[]
  addToast: (toast: ToastInput) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

let toastCount = 0

function generateToastId(): string {
  toastCount++
  return `toast-${toastCount}-${Date.now()}`
}

// Global toast state
const globalToastState: ToastState = {
  toasts: [],
  addToast: () => "",
  removeToast: () => {},
  clearToasts: () => {},
}

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function useToast(): ToastState {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listener = () => forceUpdate({})
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  const addToast = useCallback((toastInput: ToastInput) => {
    const id = toastInput.id || generateToastId()
    const duration = toastInput.duration ?? 5000

    const toast: ToastProps = {
      ...toastInput,
      id,
      onClose: () => removeToast(id),
    }

    globalToastState.toasts = [...globalToastState.toasts, toast]
    emitChange()

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    globalToastState.toasts = globalToastState.toasts.filter((toast) => toast.id !== id)
    emitChange()
  }, [])

  const clearToasts = useCallback(() => {
    globalToastState.toasts = []
    emitChange()
  }, [])

  globalToastState.addToast = addToast
  globalToastState.removeToast = removeToast
  globalToastState.clearToasts = clearToasts

  return {
    toasts: globalToastState.toasts,
    addToast,
    removeToast,
    clearToasts,
  }
}

// Convenience functions for different toast types
export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastInput>) =>
    globalToastState.addToast({ ...options, title, description, type: "success" }),

  error: (title: string, description?: string, options?: Partial<ToastInput>) =>
    globalToastState.addToast({ ...options, title, description, type: "error" }),

  warning: (title: string, description?: string, options?: Partial<ToastInput>) =>
    globalToastState.addToast({ ...options, title, description, type: "warning" }),

  info: (title: string, description?: string, options?: Partial<ToastInput>) =>
    globalToastState.addToast({ ...options, title, description, type: "info" }),

  custom: (toast: ToastInput) => globalToastState.addToast(toast),
}
