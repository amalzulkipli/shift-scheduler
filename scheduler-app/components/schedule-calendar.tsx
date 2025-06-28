"use client"

import { useScheduleStore } from "@/hooks/use-schedule-store"
import { generateSchedule, isCurrentMonth } from "@/lib/schedule-generator"
import { CalendarHeader } from "./calendar-header"
import { ScheduleCell } from "./schedule-cell"
import { ScheduleToolbar } from "./schedule-toolbar"
import { AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function ScheduleCalendar() {
  const { currentMonth, publicHolidays, annualLeave, swaps } = useScheduleStore()

  // Extract just the dates for the schedule generator
  const holidayDates = publicHolidays.map(holiday => holiday.date)
  const schedule = generateSchedule(currentMonth, holidayDates, annualLeave, swaps)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto p-4 sm:p-6"
    >
      <CalendarHeader />

      {/* Enhanced Toolbar with Keyboard Shortcuts */}
      <ScheduleToolbar />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentMonth.toString()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mt-4">
            {/* Weekday headers */}
            <div className="hidden md:grid grid-cols-7 border-b border-gray-200 bg-gray-50/75">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-sm font-semibold text-gray-600 text-center border-r border-gray-200 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid for desktop and mobile */}
            <div className="grid grid-cols-1 md:grid-cols-7 md:min-h-[calc(100vh-300px)]">
              {schedule.map((scheduledDay, index) => (
                <ScheduleCell
                  key={index}
                  scheduledDay={scheduledDay}
                  isCurrentMonth={isCurrentMonth(scheduledDay.date, currentMonth)}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Legend */}
      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule Legend</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Staff Colors */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Staff Members</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                <span>Fatimah (Pharmacist) - 45h/week</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                <span>Mathilda (Asst. Pharmacist) - 45h/week</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm bg-purple-500"></div>
                <span>Pah (Asst. Pharmacist) - 45h/week</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-sm bg-orange-500"></div>
                <span>Amal (Pharmacist) - 32h/week</span>
              </div>
            </div>
          </div>

          {/* Event Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Event Types & Indicators</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>PH - Public Holiday</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>AL - Annual Leave</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Coverage Warning</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Reallocated Hours</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Add Holiday</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs font-sans">P</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Add Leave</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs font-sans">L</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span>Close Panels</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs font-sans">Esc</kbd>
              </div>
              <div className="text-gray-600 mt-4 text-xs">
                Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-md font-sans">?</kbd> for all shortcuts
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
