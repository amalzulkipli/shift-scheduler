"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Keyboard, X } from "lucide-react"
import { formatShortcut, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const groupedShortcuts = shortcuts.reduce(
    (groups, shortcut) => {
      // Group shortcuts by category based on description
      if (shortcut.description.includes("Holiday") || shortcut.description.includes("Leave")) {
        groups.scheduling.push(shortcut)
      } else if (shortcut.description.includes("Navigate") || shortcut.description.includes("Month")) {
        groups.navigation.push(shortcut)
      } else if (shortcut.description.includes("Close") || shortcut.description.includes("Help")) {
        groups.general.push(shortcut)
      } else {
        groups.actions.push(shortcut)
      }
      return groups
    },
    {
      scheduling: [] as KeyboardShortcut[],
      navigation: [] as KeyboardShortcut[],
      actions: [] as KeyboardShortcut[],
      general: [] as KeyboardShortcut[],
    },
  )

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 text-gray-600 hover:text-gray-900"
        title="Keyboard Shortcuts (Press ? to toggle)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scheduling */}
            {groupedShortcuts.scheduling.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Scheduling</h3>
                <div className="space-y-2">
                  {groupedShortcuts.scheduling.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            {groupedShortcuts.navigation.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Navigation</h3>
                <div className="space-y-2">
                  {groupedShortcuts.navigation.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {groupedShortcuts.actions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Actions</h3>
                <div className="space-y-2">
                  {groupedShortcuts.actions.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General */}
            {groupedShortcuts.general.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">General</h3>
                <div className="space-y-2">
                  {groupedShortcuts.general.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> anytime to toggle this help panel
          </p>
        </div>
      </div>
    </div>
  )
}
