"use client"

import type React from "react"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { ScheduledDay } from "@/types/schedule"
import { STAFF_MEMBERS } from "@/lib/staff-data"
import { SAMPLE_ANNUAL_LEAVE } from "@/lib/public-holidays"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { AlertTriangle, Calendar, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AddHolidayModal } from "./modals/add-holiday-modal"
import { AddLeaveModal } from "./modals/add-leave-modal"
import { useScheduleStore } from "@/hooks/use-schedule-store"

interface ScheduleCellProps {
  scheduledDay: ScheduledDay
  isCurrentMonth: boolean
}

const STAFF_COLORS = {
  fatimah: "bg-gradient-to-r from-blue-400 to-blue-500",
  mathilda: "bg-gradient-to-r from-green-400 to-green-500",
  pah: "bg-gradient-to-r from-purple-400 to-purple-500",
  amal: "bg-gradient-to-r from-orange-400 to-orange-500",
}

const STAFF_DOT_COLORS = {
  fatimah: "bg-blue-400",
  mathilda: "bg-green-400", 
  pah: "bg-purple-400",
  amal: "bg-orange-400",
}

const EVENT_COLORS = {
  AL: "bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-800",
  PH: "bg-gradient-to-r from-red-300 to-red-400 text-red-800",
  OFF: "bg-gray-200 text-gray-500",
}

function getShiftPosition(startTime: string): number {
  const [hour, min] = startTime.split(":").map(Number)
  const minutes = hour * 60 + min

  // Position relative to 9:15 start (9:15 = 0%, 21:45 = 100%)
  const startOfDay = 9 * 60 + 15 // 9:15 in minutes
  const endOfDay = 21 * 60 + 45 // 21:45 in minutes

  return Math.max(0, Math.min(100, ((minutes - startOfDay) / (endOfDay - startOfDay)) * 100))
}

function getShiftWidth(startTime: string, endTime: string): number {
  // Calculate width as the difference between start and end positions
  // This ensures bars that end at the same time have the same right edge
  const startPosition = getShiftPosition(startTime)
  const endPosition = getShiftPosition(endTime)
  
  return Math.max(endPosition - startPosition, 5) // Minimum 5% width for visibility
}

/**
 * Calculate adjusted start and end times based on reallocated hours and shift timing preference
 */
/**
 * Calculate break time based on total work hours according to business rules
 */
function calculateBreakTime(totalWorkHours: number): number {
  if (totalWorkHours >= 11) {
    return 1.5 // 11+ hour shifts get 1.5h break
  } else {
    return 1.0 // All other shifts get 1h break
  }
}

/**
 * Calculate original work hours from shift times
 */
function calculateOriginalWorkHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  return (endMinutes - startMinutes) / 60
}

function calculateAdjustedShiftTimes(
  originalStartTime: string, 
  originalEndTime: string, 
  timing: "early" | "late" | null,
  reallocatedHours: number = 0
): { adjustedStartTime: string; adjustedEndTime: string } {
  if (reallocatedHours <= 0) {
    return { 
      adjustedStartTime: originalStartTime, 
      adjustedEndTime: originalEndTime 
    }
  }
  
  // Calculate original work hours
  const originalWorkHours = calculateOriginalWorkHours(originalStartTime, originalEndTime)
  const newTotalWorkHours = originalWorkHours + reallocatedHours
  
  // Calculate break times
  const originalBreakTime = calculateBreakTime(originalWorkHours)
  const newBreakTime = calculateBreakTime(newTotalWorkHours)
  const additionalBreakTime = newBreakTime - originalBreakTime
  
  // Total additional time = reallocated work hours + additional break time
  const totalAdditionalMinutes = (reallocatedHours + additionalBreakTime) * 60
  
  // Parse original times
  const [startHour, startMin] = originalStartTime.split(":").map(Number)
  const [endHour, endMin] = originalEndTime.split(":").map(Number)
  
  let adjustedStartTime = originalStartTime
  let adjustedEndTime = originalEndTime
  
  // Determine extension direction based on shift timing preference
  if (timing === "late" || (timing === null && startHour >= 12)) {
    // Late shift or afternoon start: extend start time EARLIER (come in earlier)
    const startMinutes = startHour * 60 + startMin
    const newStartMinutes = Math.max(
      9 * 60 + 15, // Can't start before pharmacy opens (9:15)
      startMinutes - totalAdditionalMinutes
    )
    const newStartHour = Math.floor(newStartMinutes / 60)
    const newStartMin = newStartMinutes % 60
    adjustedStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMin.toString().padStart(2, '0')}`
  } else {
    // Early shift: extend end time LATER (stay later)
    const endMinutes = endHour * 60 + endMin
    const newEndMinutes = Math.min(
      21 * 60 + 45, // Can't end after pharmacy closes (21:45)
      endMinutes + totalAdditionalMinutes
    )
    const newEndHour = Math.floor(newEndMinutes / 60)
    const newEndMin = newEndMinutes % 60
    adjustedEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`
  }
  
  return { adjustedStartTime, adjustedEndTime }
}

/**
 * Calculate visual width and position for shift timeline including reallocated hours
 * This adjusts both position and width based on extended shift times
 */
function getShiftDisplayInfo(
  originalStartTime: string, 
  originalEndTime: string, 
  timing: "early" | "late" | null,
  reallocatedHours: number = 0
): { width: number; left: number; displayStartTime: string; displayEndTime: string } {
  const { adjustedStartTime, adjustedEndTime } = calculateAdjustedShiftTimes(
    originalStartTime, 
    originalEndTime, 
    timing, 
    reallocatedHours
  )
  
  // Special handling for shifts that span the full operational window (09:15-21:45)
  // This includes both original 11h shifts and shifts that become full-span after reallocation
  const isOriginal11h = originalStartTime === "09:15" && originalEndTime === "21:45"
  const isAdjustedFullSpan = adjustedStartTime === "09:15" && adjustedEndTime === "21:45"
  
  if ((isOriginal11h || isAdjustedFullSpan) && reallocatedHours > 0) {
    // For shifts that span the full operational window, show visual indicator of extra hours
    // but cap the width at 100% to prevent extending beyond container boundaries
    const baseWidth = getShiftWidth(adjustedStartTime, adjustedEndTime) // Should be 100% for full span
    
    // Cap the visual width at 100% for proper container containment
    // The reallocated hours indicator (blue ring) will show that this shift has extra hours
    const visualWidth = Math.min(baseWidth, 100)
    
    return {
      width: visualWidth,
      left: getShiftPosition(adjustedStartTime), // Use adjusted start position
      displayStartTime: adjustedStartTime,
      displayEndTime: adjustedEndTime
    }
  }
  
  return {
    width: getShiftWidth(adjustedStartTime, adjustedEndTime),
    left: getShiftPosition(adjustedStartTime),
    displayStartTime: adjustedStartTime,
    displayEndTime: adjustedEndTime
  }
}

/**
 * Calculate total hours for a staff member on a given day (base + reallocated)
 */
function getTotalHours(details: any): number {
  if (!details) return 0
  const baseHours = details.workHours || 0
  const reallocatedHours = details.reallocatedHours || 0
  return baseHours + reallocatedHours
}

/**
 * Format hour display with reallocated hour breakdown
 */
function formatHourDisplay(details: any): { 
  displayText: string
  tooltip: string 
  hasReallocated: boolean
} {
  if (!details) return { displayText: "0h", tooltip: "", hasReallocated: false }
  
  const baseHours = details.workHours || 0
  const reallocatedHours = details.reallocatedHours || 0
  const totalHours = baseHours + reallocatedHours
  const hasReallocated = reallocatedHours > 0

  if (hasReallocated) {
    return {
      displayText: `${totalHours}h`,
      tooltip: `Total: ${totalHours}h (Base: ${baseHours}h + Reallocated: ${reallocatedHours}h)`,
      hasReallocated: true
    }
  } else {
    return {
      displayText: `${totalHours}h`,
      tooltip: `${totalHours}h`,
      hasReallocated: false
    }
  }
}

export function ScheduleCell({ scheduledDay, isCurrentMonth }: ScheduleCellProps) {
  const dayNumber = format(scheduledDay.date, "d")
  const dayName = format(scheduledDay.date, "EEE")

  // Get public holidays and annual leave from store
  const { publicHolidays, annualLeave } = useScheduleStore()
  
  // Check for public holiday
  const publicHoliday = publicHolidays.find((ph) => isSameDay(ph.date, scheduledDay.date))

  // Check for annual leave using store data instead of sample data
    const staffOnLeave = annualLeave.filter((al) =>
    isSameDay(al.date, scheduledDay.date)
  )

  // Check for warnings from the schedule data
  const dayWarnings = Object.values(scheduledDay.staff)
    .map((s) => s.warning)
    .filter(Boolean) as string[]

  const hasPublicHoliday = !!publicHoliday
  const hasAnnualLeave = staffOnLeave.length > 0
  const hasWarnings = dayWarnings.length > 0

  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const handleAddHoliday = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowHolidayModal(true)
  }

  const handleAddLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowLeaveModal(true)
  }

  const handleCellClick = () => {
    if (hasWarnings) {
      toast.warning("Schedule Warning", dayWarnings.join(", "))
    }
    // Removed unnecessary "Date Selected" toast - users can see visual feedback from the UI
  }

  return (
    <div
      className={cn(
        "min-h-[140px] border border-gray-200 p-2 bg-white relative overflow-hidden group cursor-pointer hover:bg-gray-50 transition-colors",
        !isCurrentMonth && "opacity-40 bg-gray-50",
        hasPublicHoliday && "border-red-300 bg-red-50",
        hasAnnualLeave && "border-yellow-300 bg-yellow-50",
        hasWarnings && "border-amber-300",
      )}
      onClick={handleCellClick}
    >
      {/* Date Header for desktop */}
      <div className="hidden md:flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm text-gray-900">{dayNumber}</div>
          {/* Event Badges */}
          <div className="flex gap-1">
            {hasPublicHoliday && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title={`Public Holiday: ${publicHoliday.name}`} />
            )}
            {hasAnnualLeave && (
              <div
                className="w-2 h-2 bg-yellow-500 rounded-full"
                title={`Annual Leave: ${staffOnLeave.map((al) => STAFF_MEMBERS.find((s) => s.id === al.staffId)?.name).join(", ")}`}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-500">{dayName}</div>
          {/* Warning Badge */}
          {hasWarnings && (
            <div className="relative">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </div>
          )}
        </div>
      </div>

      {/* Date Header for mobile */}
      <div className="md:hidden flex justify-between items-center mb-2">
        <div className="font-semibold text-lg text-gray-900">
          {dayName}, {dayNumber}
        </div>
        <div className="flex gap-2">
          {hasPublicHoliday && (
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full" title={`Public Holiday: ${publicHoliday.name}`} />
          )}
          {hasAnnualLeave && (
            <div
              className="w-2.5 h-2.5 bg-yellow-500 rounded-full"
              title={`Annual Leave: ${staffOnLeave.map((al) => STAFF_MEMBERS.find((s) => s.id === al.staffId)?.name).join(", ")}`}
            />
          )}
          {hasWarnings && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        </div>
      </div>

      {/* Quick Action Buttons (shown on hover on desktop) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex gap-1">
        <button
          onClick={handleAddHoliday}
          className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
          title="Add Public Holiday"
        >
          <Calendar className="h-3 w-3 text-gray-600" />
        </button>
        <button
          onClick={handleAddLeave}
          className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
          title="Add Annual Leave"
        >
          <User className="h-3 w-3 text-gray-600" />
        </button>
      </div>

      {/* Simplified list for mobile */}
      <div className="md:hidden space-y-2">
        {Object.entries(scheduledDay.staff).map(([staffKey, staffSchedule]) => {
          if (!staffSchedule) return null
          const { event, details, warning } = staffSchedule

          // Get staff info - either from STAFF_MEMBERS or use temp staff name
          const regularStaff = STAFF_MEMBERS.find(s => s.id === staffKey)
          const isRegularStaff = !!regularStaff

          const leaveRecord = staffOnLeave.find((al) => al.staffId === staffKey)

          // 1. Handle temp staff coverage (now in original staff position)
          if (staffSchedule.tempStaffName && details && isRegularStaff) {
            const reallocatedHours = details.reallocatedHours || 0
            const displayInfo = getShiftDisplayInfo(
              details.startTime, 
              details.endTime, 
              details.timing, 
              reallocatedHours
            )
            const hourInfo = formatHourDisplay(details)
            
            return (
              <div
                key={staffKey}
                className="text-sm p-2 rounded bg-gray-100 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{staffSchedule.tempStaffName}</span>
                  : {details?.startTime} - {details?.endTime} 
                  <span className="text-sm">({hourInfo.displayText})</span>
                </div>
              </div>
            )
          }

          // Skip processing if this is not a regular staff member
          if (!isRegularStaff) return null

          // 2. Render uncovered annual leave
          if (leaveRecord && leaveRecord.coverageMethod === 'decide-later') {
            return (
              <div key={staffKey} className="text-sm p-2 rounded bg-yellow-100 text-yellow-800">
                {regularStaff.name}: Annual Leave
              </div>
            )
          }
          
          // 3. Render regular shifts (only if not temp staff coverage)
          if (event === "Shift" && details && !staffSchedule.tempStaffName) {
            const reallocatedHours = details.reallocatedHours || 0
            // Calculate adjusted display info based on timing preference
            const displayInfo = getShiftDisplayInfo(
              details.startTime, 
              details.endTime, 
              details.timing, 
              reallocatedHours
            )
            const hourInfo = formatHourDisplay(details)
            
            // Check if this is an 11h shift to adjust styling
            // This includes both original 11h shifts and shifts that become 11h after reallocation
            const is11hShift = (details.startTime === "09:15" && details.endTime === "21:45") ||
              (displayInfo.displayStartTime === "09:15" && displayInfo.displayEndTime === "21:45")

            // Build tooltip with swap information
            let tooltipText = `${regularStaff.name}: ${displayInfo.displayStartTime}-${displayInfo.displayEndTime} (${hourInfo.tooltip})`
            if (staffSchedule.isSwapCoverage && staffSchedule.swapInfo) {
              tooltipText += ` - Covering for ${staffSchedule.swapInfo.originalStaffName}`
            }
            if (warning) {
              tooltipText += ` - WARNING: ${warning}`
            }

            return (
              <div
                key={staffKey}
                className={cn(
                  "text-sm p-2 rounded flex justify-between items-center",
                  staffSchedule.isSwapCoverage ? "bg-amber-50 border border-amber-200" : "bg-gray-100"
                )}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{regularStaff.name}</span>
                    {staffSchedule.isSwapCoverage && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Swap
                      </span>
                    )}
                  </div>
                  : {details.startTime} - {details.endTime} 
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "text-sm",
                          hourInfo.hasReallocated && "font-semibold text-blue-600"
                        )}>
                          ({hourInfo.displayText})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{hourInfo.tooltip}</p>
                        {staffSchedule.isSwapCoverage && staffSchedule.swapInfo && (
                          <p>Covering for {staffSchedule.swapInfo.originalStaffName}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {hourInfo.hasReallocated && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" title="Includes reallocated hours" />
                  )}
                </div>
                {warning && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{warning}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )
          }

          return null
        })}
      </div>

      {/* Staff Legend with positioning based on opening/closing - Mobile */}
      {!hasPublicHoliday && (
        <div className="md:hidden flex justify-between mt-2">
          {/* Opening shifts (left side) */}
          <div className="flex gap-1">
            {STAFF_MEMBERS.map((staff) => {
              const staffSchedule = scheduledDay.staff[staff.id]
              const hasShift = staffSchedule?.event === "Shift"
              const staffHasAL = staffOnLeave.some((al) => al.staffId === staff.id)

              if (!hasShift || !staffSchedule.details || staffHasAL) return null

              // Check if staff opens (starts at 9:15 or has early timing)
              const opensPharmacy =
                staffSchedule.details.startTime === "09:15" || staffSchedule.details.timing === "early"

              if (!opensPharmacy) return null

              return (
                <div
                  key={staff.id}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    STAFF_DOT_COLORS[staff.id as keyof typeof STAFF_DOT_COLORS],
                  )}
                  title={`${staff.name}: Opens pharmacy`}
                />
              )
            })}
          </div>

          {/* Closing shifts (right side) */}
          <div className="flex gap-1">
            {STAFF_MEMBERS.map((staff) => {
              const staffSchedule = scheduledDay.staff[staff.id]
              const hasShift = staffSchedule?.event === "Shift"
              const staffHasAL = staffOnLeave.some((al) => al.staffId === staff.id)

              if (!hasShift || !staffSchedule.details || staffHasAL) return null

              // Check if staff closes (ends at 21:45 or has late timing)
              const closesPharmacy =
                staffSchedule.details.endTime === "21:45" || staffSchedule.details.timing === "late"

              if (!closesPharmacy) return null

              return (
                <div
                  key={staff.id}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    STAFF_DOT_COLORS[staff.id as keyof typeof STAFF_DOT_COLORS],
                  )}
                  title={`${staff.name}: Closes pharmacy`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline view for desktop */}
      <div className="hidden md:block">
        {/* Time Scale (9:15 to 21:45) */}
        <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
          <span>9:15</span>
          <span>12</span>
          <span>16</span>
          <span>21:45</span>
        </div>

        {/* Timeline Container */}
        <div className="relative h-20 bg-gray-50 rounded border overflow-hidden">
          {/* Hour Grid Lines */}
          <div className="absolute inset-0 flex">
            {[25, 50, 75].map((position) => (
              <div key={position} className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: `${position}%` }} />
            ))}
          </div>

          {/* Public Holiday Overlay */}
          {hasPublicHoliday && (
            <div className="absolute inset-0 bg-red-100 bg-opacity-50 flex items-center justify-center rounded">
              <div className="text-xs font-medium text-red-800 bg-red-200 px-2 py-1 rounded">
                PH: {publicHoliday.name.split(" ").slice(0, 2).join(" ")}
              </div>
            </div>
          )}

          {/* Staff Shift Bars */}
          {!hasPublicHoliday &&
            Object.entries(scheduledDay.staff).map(([staffKey, staffSchedule], index) => {
              if (!staffSchedule) return null

              const { event, details, warning } = staffSchedule

              // Get staff info - either from STAFF_MEMBERS or use temp staff name
              const regularStaff = STAFF_MEMBERS.find(s => s.id === staffKey)
              const isRegularStaff = !!regularStaff
              const yPosition = index * 18 + 2 // Stack shifts vertically

              const leaveRecord = staffOnLeave.find((al) => al.staffId === staffKey)

              // 1. Handle temp staff coverage (now in original staff position)
              if (staffSchedule.tempStaffName && details && isRegularStaff) {
                const reallocatedHours = details.reallocatedHours || 0
                const displayInfo = getShiftDisplayInfo(
                  details.startTime, 
                  details.endTime, 
                  details.timing, 
                  reallocatedHours
                )
                const hourInfo = formatHourDisplay(details)
                
                return (
                  <div
                    key={staffKey}
                    className="absolute rounded text-xs font-medium flex items-center justify-center bg-gray-400 text-white"
                    style={{
                      left: `${displayInfo.left}%`,
                      width: `${Math.max(displayInfo.width, 15)}%`,
                      top: `${yPosition}px`,
                      height: "14px",
                      minWidth: "20px",
                    }}
                    title={`${staffSchedule.tempStaffName}: ${displayInfo.displayStartTime}-${displayInfo.displayEndTime} (${hourInfo.tooltip}) - Temp staff covering for ${regularStaff.name}`}
                  >
                    <span className="truncate px-1">{staffSchedule.tempStaffName.charAt(0)} {hourInfo.displayText}</span>
                  </div>
                )
              }

              // Skip processing if this is not a regular staff member
              if (!isRegularStaff) return null

              // 2. Render uncovered annual leave
              if (leaveRecord && leaveRecord.coverageMethod === 'decide-later') {
                return (
                  <div
                    key={staffKey}
                    className="absolute rounded text-xs font-medium flex items-center justify-center bg-yellow-300 text-yellow-800"
                    style={{
                      left: "2%",
                      width: "96%",
                      top: `${yPosition}px`,
                      height: "14px",
                    }}
                    title={`${regularStaff.name}: Annual Leave`}
                  >
                    <span className="truncate px-1">{regularStaff.name.charAt(0)} AL</span>
                  </div>
                )
              }
              
              // 3. Render regular shifts (only if not temp staff coverage)
              if (event === "Shift" && details && !staffSchedule.tempStaffName) {
                const reallocatedHours = details.reallocatedHours || 0
                // Calculate adjusted display info based on timing preference
                const displayInfo = getShiftDisplayInfo(
                  details.startTime, 
                  details.endTime, 
                  details.timing, 
                  reallocatedHours
                )
                const hourInfo = formatHourDisplay(details)
                
                // Check if this is an 11h shift to adjust styling
                // This includes both original 11h shifts and shifts that become 11h after reallocation
                const is11hShift = (details.startTime === "09:15" && details.endTime === "21:45") ||
                  (displayInfo.displayStartTime === "09:15" && displayInfo.displayEndTime === "21:45")

                // Build tooltip with swap information
                let tooltipText = `${regularStaff.name}: ${displayInfo.displayStartTime}-${displayInfo.displayEndTime} (${hourInfo.tooltip})`
                if (staffSchedule.isSwapCoverage && staffSchedule.swapInfo) {
                  tooltipText += ` - Covering for ${staffSchedule.swapInfo.originalStaffName}`
                }
                if (warning) {
                  tooltipText += ` - WARNING: ${warning}`
                }

                // Determine staff color - use amber for swap coverage, regular colors otherwise
                const staffColorClass = staffSchedule.isSwapCoverage ?
                  "bg-gradient-to-r from-amber-400 to-amber-500" :
                  (regularStaff ? STAFF_COLORS[staffKey as keyof typeof STAFF_COLORS] : "bg-gray-400")

                return (
                  <div
                    key={staffKey}
                    className={cn(
                      "absolute rounded text-white text-xs font-medium flex items-center justify-between shadow-sm",
                      is11hShift ? "px-0.5" : "px-1", // Less padding for 11h shifts to reach edges
                      staffColorClass,
                      hourInfo.hasReallocated && "ring-2 ring-blue-300 ring-opacity-60",
                      staffSchedule.isSwapCoverage && "ring-2 ring-amber-200 ring-opacity-80" // Subtle swap ring
                    )}
                    style={{
                      left: `${displayInfo.left}%`,
                      width: `${Math.max(displayInfo.width, 15)}%`, // Minimum width for visibility
                      top: `${yPosition}px`,
                      height: "14px",
                      minWidth: "20px",
                    }}
                    title={tooltipText}
                  >
                    <span className="truncate flex items-center gap-1">
                      {regularStaff.name.charAt(0)}
                      {hourInfo.displayText}
                      {hourInfo.hasReallocated && (
                        <div className="w-1 h-1 bg-blue-200 rounded-full" />
                      )}
                      {staffSchedule.isSwapCoverage && (
                        <span className="inline-flex items-center justify-center w-3 h-3 bg-amber-600 text-white rounded-full text-[8px] font-bold">
                          S
                        </span>
                      )}
                    </span>
                    {warning && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-3 w-3 text-white ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{warning}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )
              }

              return null
            })}

          {/* Current Time Indicator (only for today) */}
          {format(scheduledDay.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{
                left: `${getShiftPosition(format(new Date(), "HH:mm"))}%`,
              }}
            />
          )}
        </div>

        {/* Staff Legend with positioning based on opening/closing */}
        {!hasPublicHoliday && (
          <div className="flex justify-between mt-1">
            {/* Opening shifts (left side) */}
            <div className="flex gap-1">
              {STAFF_MEMBERS.map((staff) => {
                const staffSchedule = scheduledDay.staff[staff.id]
                const hasShift = staffSchedule?.event === "Shift"
                const staffHasAL = staffOnLeave.some((al) => al.staffId === staff.id)

                if (!hasShift || !staffSchedule.details || staffHasAL) return null

                // Check if staff opens (starts at 9:15 or has early timing)
                const opensPharmacy =
                  staffSchedule.details.startTime === "09:15" || staffSchedule.details.timing === "early"

                if (!opensPharmacy) return null

                return (
                  <div
                    key={staff.id}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      STAFF_DOT_COLORS[staff.id as keyof typeof STAFF_DOT_COLORS],
                    )}
                    title={`${staff.name}: Opens pharmacy`}
                  />
                )
              })}
            </div>

            {/* Closing shifts (right side) */}
            <div className="flex gap-1">
              {STAFF_MEMBERS.map((staff) => {
                const staffSchedule = scheduledDay.staff[staff.id]
                const hasShift = staffSchedule?.event === "Shift"
                const staffHasAL = staffOnLeave.some((al) => al.staffId === staff.id)

                if (!hasShift || !staffSchedule.details || staffHasAL) return null

                // Check if staff closes (ends at 21:45 or has late timing)
                const closesPharmacy =
                  staffSchedule.details.endTime === "21:45" || staffSchedule.details.timing === "late"

                if (!closesPharmacy) return null

                return (
                  <div
                    key={staff.id}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      STAFF_DOT_COLORS[staff.id as keyof typeof STAFF_DOT_COLORS],
                    )}
                    title={`${staff.name}: Closes pharmacy`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      <AddHolidayModal
        open={showHolidayModal}
        onOpenChange={setShowHolidayModal}
        defaultDate={format(scheduledDay.date, "yyyy-MM-dd")}
      />

      <AddLeaveModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        defaultDate={format(scheduledDay.date, "yyyy-MM-dd")}
      />
    </div>
  )
}
