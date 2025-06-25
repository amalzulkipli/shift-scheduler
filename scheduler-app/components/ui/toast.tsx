"use client"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: "success" | "error" | "warning" | "info"
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
}

const toastVariants = {
  success: {
    icon: CheckCircle,
    className: "border-green-200 bg-green-50 text-green-900",
    iconClassName: "text-green-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-900",
    iconClassName: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-900",
    iconClassName: "text-amber-600",
  },
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-900",
    iconClassName: "text-blue-600",
  },
}

export function Toast({ id, title, description, type = "info", action, onClose }: ToastProps) {
  const variant = toastVariants[type]
  const Icon = variant.icon

  return (
    <div
      className={cn(
        "relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-right-full",
        variant.className,
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", variant.iconClassName)} />

      <div className="flex-1 space-y-1">
        {title && <div className="text-sm font-medium leading-none">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
