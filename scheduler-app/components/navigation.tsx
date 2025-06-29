"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar, BarChart3, Users } from "lucide-react"

interface NavigationProps {
  currentView: "schedule" | "analytics"
  onViewChange: (view: "schedule" | "analytics") => void
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Timetable</h1>
              <p className="text-xs text-gray-500">Pharmacy Staff Scheduling</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1">
            <Button
              variant={currentView === "schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("schedule")}
              className={cn(
                "gap-2",
                currentView === "schedule" 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </Button>
            
            <Button
              variant={currentView === "analytics" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("analytics")}
              className={cn(
                "gap-2",
                currentView === "analytics" 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>

          {/* User Info (placeholder) */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>Manager View</span>
          </div>
        </div>
      </div>
    </div>
  )
} 