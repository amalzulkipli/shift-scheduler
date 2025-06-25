"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, subMonths, addMonths } from "date-fns"
import { useScheduleStore } from "@/hooks/use-schedule-store"

export function CalendarHeader() {
  const { currentMonth, setCurrentMonth } = useScheduleStore()

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{format(currentMonth, "MMMM yyyy")}</h1>
        <p className="text-sm text-gray-500 mt-1">Pharmacy Staff Schedule</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
