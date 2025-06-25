"use client"

import { useEffect, useCallback } from "react"

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.contentEditable === "true"
      ) {
        return
      }

      // Don't trigger shortcuts when a modal is open (check for modal backdrop)
      const hasModalOpen = document.querySelector('[role="dialog"], .fixed.inset-0.z-50')
      if (hasModalOpen && event.key !== "Escape") {
        return
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.metaKey === event.metaKey
        )
      })

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault()
        }
        matchingShortcut.action()
      }
    },
    [shortcuts, enabled],
  )

  useEffect(() => {
    if (enabled) {
      // Use capture phase to handle before other handlers
      document.addEventListener("keydown", handleKeyDown, false)
      return () => document.removeEventListener("keydown", handleKeyDown, false)
    }
  }, [handleKeyDown, enabled])

  return { shortcuts }
}

// Helper function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.metaKey) parts.push("⌘")
  if (shortcut.ctrlKey) parts.push("Ctrl")
  if (shortcut.altKey) parts.push("Alt")
  if (shortcut.shiftKey) parts.push("⇧")

  parts.push(shortcut.key.toUpperCase())

  return parts.join(" + ")
}
