"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

export function FormField({ children, className }: FormFieldProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function FormLabel({ className, children, required, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}

export function FormControl({ className, ...props }: FormControlProps) {
  return <div className={cn("relative", className)} {...props} />
}

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FormDescription({ className, ...props }: FormDescriptionProps) {
  return <p className={cn("text-sm text-gray-600", className)} {...props} />
}

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  type?: "error" | "success" | "warning"
}

export function FormMessage({ className, type = "error", ...props }: FormMessageProps) {
  const typeStyles = {
    error: "text-red-600",
    success: "text-green-600",
    warning: "text-amber-600",
  }

  return <p className={cn("text-sm font-medium", typeStyles[type], className)} {...props} />
}
