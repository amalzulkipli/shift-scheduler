"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined)

function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog")
  }
  return context
}

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  )
}

interface DialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function DialogTrigger({ asChild, children, onClick }: DialogTriggerProps) {
  const { onOpenChange } = useDialog()

  const handleClick = () => {
    onClick?.()
    onOpenChange(true)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    })
  }

  return (
    <button onClick={handleClick} className="inline-flex">
      {children}
    </button>
  )
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onInteractOutside?: (event: Event) => void
}

export function DialogContent({ className, children, onEscapeKeyDown, onInteractOutside }: DialogContentProps) {
  const { open, onOpenChange } = useDialog()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Check if a dropdown is open by looking for high z-index elements
        const dropdownOpen = document.querySelector('[role="listbox"]')
        if (dropdownOpen) {
          // Let the dropdown handle the escape key first
          return
        }

        // Stop propagation to prevent other ESC handlers from firing
        event.stopPropagation()
        onEscapeKeyDown?.(event)
        if (!event.defaultPrevented) {
          onOpenChange(false)
        }
      }
    }

    const handleClickOutside = (event: Event) => {
      // Don't close modal if clicking on dropdown items
      const target = event.target as HTMLElement
      if (target.closest('[role="listbox"]')) {
        return
      }

      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        onInteractOutside?.(event)
        if (!event.defaultPrevented) {
          onOpenChange(false)
        }
      }
    }

    if (open) {
      // Add event listeners with capture to handle before other handlers
      document.addEventListener("keydown", handleKeyDown, false) // Changed to false to allow dropdown to handle first
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, false)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [open, onOpenChange, onEscapeKeyDown, onInteractOutside])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 animate-in fade-in-0 z-40" />

      {/* Content with proper scrolling and z-index */}
      <div
        ref={contentRef}
        className={cn(
          "relative bg-white rounded-lg shadow-xl w-full max-h-[85vh] overflow-hidden z-50",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
          "flex flex-col", // Essential for proper layout
          className,
        )}
        onClick={(e) => {
          // Don't close modal when clicking inside content
          e.stopPropagation()
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-4 flex-shrink-0", className)}>{children}</div>
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
}

export function DialogDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-sm text-gray-600", className)}>{children}</p>
}

export function DialogBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-6 py-4 overflow-y-auto flex-1 min-h-0", className)}>{children}</div>
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0", className)}
    >
      {children}
    </div>
  )
}

export function DialogClose({ className, children }: { className?: string; children: React.ReactNode }) {
  const { onOpenChange } = useDialog()

  return (
    <button
      onClick={() => onOpenChange(false)}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 z-10",
        className,
      )}
    >
      {children || <X className="h-4 w-4" />}
    </button>
  )
}
