"use client"

import { useState } from "react"
import { ScheduleCalendar } from "@/components/schedule-calendar"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { Navigation } from "@/components/navigation"

type ViewType = "schedule" | "analytics"

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("schedule")

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      
      {currentView === "schedule" ? (
        <ScheduleCalendar />
      ) : (
        <AnalyticsDashboard />
      )}
    </main>
  )
}
