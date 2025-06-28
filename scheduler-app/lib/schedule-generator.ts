import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getISOWeek,
  getDay,
  isSameMonth,
  isSameDay as isSameDate,
} from "date-fns"
import type { ScheduledDay, ShiftPattern, StaffMember, WeeklyHourLog, ShiftDefinition } from "@/types/schedule"
import { STAFF_MEMBERS, SHIFT_PATTERNS } from "./staff-data"

/**
 * Deep clone a ShiftDefinition to prevent mutation of global objects
 */
function cloneShiftDefinition(shift: ShiftDefinition | null): ShiftDefinition | null {
  if (!shift) return null
  return {
    type: shift.type,
    timing: shift.timing,
    startTime: shift.startTime,
    endTime: shift.endTime,
    workHours: shift.workHours,
    // Don't copy reallocatedHours - start fresh for each schedule generation
  }
}

/**
 * Configuration for safety limits and validation
 */
const SAFETY_LIMITS = {
  MAX_DAILY_HOURS: 11, // Maximum hours a staff member can work in a single day (STRICT LIMIT)
  MAX_EXTRA_HOURS_PER_SHIFT: 4, // Maximum extra hours that can be added to any single shift
  MIN_BREAK_HOURS: 12, // Minimum hours between shifts (for future use)
  OPERATIONAL_START: "09:15", // Pharmacy opening time
  OPERATIONAL_END: "21:45", // Pharmacy closing time
} as const

/**
 * Validate that adding reallocated hours won't exceed safety limits and operational constraints
 */
function validateDailySafetyLimits(
  shiftDetails: ShiftDefinition,
  reallocatedHoursToAdd: number
): { isValid: boolean; reason?: string; maxAllowed?: number } {
  const currentBaseHours = shiftDetails.workHours
  const currentReallocatedHours = shiftDetails.reallocatedHours || 0
  const newTotalHours = currentBaseHours + currentReallocatedHours + reallocatedHoursToAdd

  // Check daily maximum (hard limit - NO FLEXIBILITY)
  if (newTotalHours > SAFETY_LIMITS.MAX_DAILY_HOURS) {
    const maxAllowed = SAFETY_LIMITS.MAX_DAILY_HOURS - (currentBaseHours + currentReallocatedHours)
    return {
      isValid: false,
      reason: `Would exceed daily maximum of ${SAFETY_LIMITS.MAX_DAILY_HOURS}h (current: ${currentBaseHours + currentReallocatedHours}h, trying to add: ${reallocatedHoursToAdd}h)`,
      maxAllowed: Math.max(0, maxAllowed)
    }
  }

  // Check per-shift extra hours limit
  const newReallocatedTotal = currentReallocatedHours + reallocatedHoursToAdd
  if (newReallocatedTotal > SAFETY_LIMITS.MAX_EXTRA_HOURS_PER_SHIFT) {
    const maxAllowed = SAFETY_LIMITS.MAX_EXTRA_HOURS_PER_SHIFT - currentReallocatedHours
    return {
      isValid: false,
      reason: `Would exceed maximum extra hours per shift of ${SAFETY_LIMITS.MAX_EXTRA_HOURS_PER_SHIFT}h (current extra: ${currentReallocatedHours}h, trying to add: ${reallocatedHoursToAdd}h)`,
      maxAllowed: Math.max(0, maxAllowed)
    }
  }

  // Check operational hours constraint
  const operationalViolation = validateOperationalHours(shiftDetails, reallocatedHoursToAdd)
  if (!operationalViolation.isValid) {
    return {
      isValid: false,
      reason: operationalViolation.reason,
      maxAllowed: 0 // Cannot add any hours if it violates operational constraints
    }
  }

  return { isValid: true }
}

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
 * Validate that reallocated hours don't extend shifts beyond operational hours (9:15 AM - 9:45 PM)
 * This includes break time calculation based on business rules
 */
function validateOperationalHours(
  shiftDetails: ShiftDefinition,
  reallocatedHoursToAdd: number
): { isValid: boolean; reason?: string } {
  const totalWorkHours = shiftDetails.workHours + (shiftDetails.reallocatedHours || 0) + reallocatedHoursToAdd
  
  // Calculate break time based on total work hours
  const breakTime = calculateBreakTime(totalWorkHours)
  
  // Total time at workplace = work hours + break time
  const totalTimeAtWorkplace = totalWorkHours + breakTime
  
  // Calculate if total time would extend beyond operational window
  const shiftStart = shiftDetails.startTime
  const [startHour, startMin] = shiftStart.split(":").map(Number)
  const startMinutes = startHour * 60 + startMin
  
  // Calculate end time with total time at workplace (work + break)
  const endMinutes = startMinutes + (totalTimeAtWorkplace * 60)
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
  
  // Check against operational end time (21:45)
  const [opEndHour, opEndMin] = SAFETY_LIMITS.OPERATIONAL_END.split(":").map(Number)
  const opEndMinutes = opEndHour * 60 + opEndMin
  
  if (endMinutes > opEndMinutes) {
    return {
      isValid: false,
      reason: `Would extend shift beyond operational hours (calculated end: ${calculatedEndTime} with ${breakTime}h break, limit: ${SAFETY_LIMITS.OPERATIONAL_END})`
    }
  }
  
  return { isValid: true }
}

/**
 * Calculate the total hours for a staff member on a given day including reallocated hours
 */
function calculateDailyTotalHours(shiftDetails: ShiftDefinition | null): number {
  if (!shiftDetails) return 0
  const baseHours = shiftDetails.workHours || 0
  const reallocatedHours = shiftDetails.reallocatedHours || 0
  return baseHours + reallocatedHours
}

/**
 * Initialize hour tracking properties when a public holiday is created
 */
function initializeHourTracking(
  scheduledDay: ScheduledDay,
  staffId: string,
  originalBankedHours: number
): void {
  const staffSchedule = scheduledDay.staff[staffId]
  if (staffSchedule) {
    staffSchedule.originalBankedHours = originalBankedHours
    staffSchedule.bankedHours = originalBankedHours // Initially all hours are banked
    staffSchedule.totalReallocatedHours = 0
    staffSchedule.remainingUnallocatedHours = 0
  }
}

/**
 * Update hour tracking after reallocation process
 */
function updateHourTracking(
  scheduledDay: ScheduledDay,
  staffId: string,
  totalReallocated: number,
  remainingUnallocated: number
): void {
  const staffSchedule = scheduledDay.staff[staffId]
  if (staffSchedule && staffSchedule.originalBankedHours !== undefined) {
    staffSchedule.totalReallocatedHours = totalReallocated
    staffSchedule.remainingUnallocatedHours = remainingUnallocated
    staffSchedule.bankedHours = remainingUnallocated // Only unallocated hours remain "banked"
  }
}

/**
 * Calculate total reallocated hours for a staff member across all shifts in a schedule
 */
function calculateTotalReallocatedHours(
  schedule: ScheduledDay[],
  staffId: string,
  excludeDay?: Date
): number {
  return schedule.reduce((total, day) => {
    // Skip the holiday day itself to avoid double counting
    if (excludeDay && day.date.getTime() === excludeDay.getTime()) {
      return total
    }
    
    const shift = day.staff[staffId]
    if (shift?.event === 'Shift' && shift.details?.reallocatedHours) {
      return total + shift.details.reallocatedHours
    }
    return total
  }, 0)
}

/**
 * Result of attempting an annual leave swap
 */
interface SwapResult {
  swapMade: boolean
  warning?: string
  coveringStaffId?: string
}

/**
 * Attempt to find a same-role staff member who is OFF to cover an annual leave request
 * Returns information about whether a swap was made and any warnings
 */
function attemptAnnualLeaveSwap(
  requestingStaff: StaffMember,
  requestingStaffShift: ShiftDefinition | null,
  date: Date,
  pattern: ShiftPattern,
  scheduledDay: ScheduledDay,
  allStaff: StaffMember[],
  annualLeave: { staffId: string; dates: Date[] }[] = []
): SwapResult {
  // If the requesting staff wasn't scheduled to work, no swap needed
  if (!requestingStaffShift) {
    return { swapMade: true } // Allow AL without needing coverage
  }

  const dayOfWeek = getDay(date)
  
  // Find staff members of the same role
  const sameRoleStaff = allStaff.filter(
    staff => 
      staff.role === requestingStaff.role && 
      staff.id !== requestingStaff.id
  )
  
  // Look for available staff - prioritize those who are OFF, then those who can swap
  for (const potentialCover of sameRoleStaff) {
    const coverStaffShift = pattern.dailyShifts[potentialCover.id]?.[dayOfWeek]
    
    // Check if this potential cover staff is also requesting annual leave on the same date
    const potentialCoverHasLeave = annualLeave.some(leave => 
      leave.staffId === potentialCover.id && 
      leave.dates.some(leaveDate => leaveDate.getTime() === date.getTime())
    );
    
    // Skip this potential cover if they also have annual leave
    if (potentialCoverHasLeave) {
      continue;
    }
    
    // Priority 1: Staff who are OFF (no shift assigned) can easily cover
    if (!coverStaffShift) {
      // Perform the swap: give the covering staff the ORIGINAL requesting staff's shift details
      // This ensures they get the exact same shift (hours, timing) that was scheduled for the person on leave
      scheduledDay.staff[potentialCover.id] = {
        event: "Shift",
        details: cloneShiftDefinition(requestingStaffShift),
      }
      
      return {
        swapMade: true,
        coveringStaffId: potentialCover.id
      }
    }
  }
  
  // Priority 2: Limited shift swapping in beneficial scenarios only
  // Allow swaps when it makes operational sense (e.g., similar shift lengths)
  for (const potentialCover of sameRoleStaff) {
    const coverStaffShift = pattern.dailyShifts[potentialCover.id]?.[dayOfWeek]
    
    // Check if this potential cover staff is also requesting annual leave on the same date
    const potentialCoverHasLeave = annualLeave.some(leave => 
      leave.staffId === potentialCover.id && 
      leave.dates.some(leaveDate => leaveDate.getTime() === date.getTime())
    );
    
    // Check if this potential cover staff is already assigned through a swap
    const isAlreadyAssigned = scheduledDay.staff[potentialCover.id] !== undefined;
    
    // Skip if they have annual leave or are already assigned
    if (potentialCoverHasLeave || isAlreadyAssigned) {
      continue;
    }
    
    if (coverStaffShift && requestingStaffShift) {
      // Only allow beneficial swaps: when covering staff works same or fewer hours
      // AND only for Pharmacists (more senior role with more flexibility)
      const coverStaffHours = coverStaffShift.workHours;
      const requestingStaffHours = requestingStaffShift.workHours;
      
      if (coverStaffHours <= requestingStaffHours && requestingStaff.role === "Pharmacist") {
        // This is a reasonable swap - covering staff takes on equal or more responsibility
        // Only allowed for Pharmacist role due to operational flexibility requirements
        scheduledDay.staff[potentialCover.id] = {
          event: "Shift",
          details: cloneShiftDefinition(requestingStaffShift),
        }
        
        return {
          swapMade: true,
          coveringStaffId: potentialCover.id
        }
      }
    }
  }
  
  // No suitable coverage found
  const roleName = requestingStaff.role === "Assistant Pharmacist" ? "Assistant Pharmacist" : "Pharmacist"
  
  return {
    swapMade: false,
    warning: `Coverage gap: No available ${roleName} to cover annual leave request`
  }
}

/**
 * Process swaps by exchanging shifts between staff members on specified dates
 */
function processSwaps(
  schedule: ScheduledDay[],
  swaps: { id: string; staffId1: string; staffId2: string; date1: Date; date2: Date }[]
): void {
  swaps.forEach(swap => {
    // Find the days in the schedule using date-only comparison
    const day1 = schedule.find(day => isSameDate(day.date, swap.date1))
    const day2 = schedule.find(day => isSameDate(day.date, swap.date2))
    
    if (!day1 || !day2) {
      console.warn(`Swap ${swap.id}: Could not find dates in schedule`)
      console.warn(`Looking for dates: ${swap.date1.toISOString()} and ${swap.date2.toISOString()}`)
      console.warn(`Available schedule dates:`, schedule.map(d => d.date.toISOString()).slice(0, 5))
      return
    }

    // Get current assignments
    const staff1Day1 = day1.staff[swap.staffId1] // Person taking leave's original assignment
    const staff2Day1 = day1.staff[swap.staffId2] // Covering person's assignment on leave date
    const staff1Day2 = day2.staff[swap.staffId1] // Person taking leave's assignment on swap date
    const staff2Day2 = day2.staff[swap.staffId2] // Covering person's original assignment on swap date

    if (!staff1Day1 || !staff2Day2) {
      console.warn(`Swap ${swap.id}: Missing required staff assignments`)
      console.warn(`Staff1 Day1:`, staff1Day1, `Staff2 Day2:`, staff2Day2)
      return
    }

    // Store original assignments before swap
    const staff1OriginalShift = { ...staff1Day1 } // Person taking leave's original shift
    const staff2OriginalShift = { ...staff2Day2 } // Covering person's original shift

    // Apply the swap with coverage priority
    // Day1 (leave date): Show covering person working (staff2 takes staff1's shift)
    day1.staff[swap.staffId2] = {
      ...staff1OriginalShift,
      event: staff1OriginalShift.event === 'AL' ? 'Shift' : staff1OriginalShift.event,
      isSwapCoverage: true,
      swapInfo: {
        originalStaffId: swap.staffId1,
        originalStaffName: STAFF_MEMBERS.find(s => s.id === swap.staffId1)?.name || swap.staffId1,
        swapType: 'covering'
      }
    }

    // Day2 (swap date): Show person taking leave working (staff1 takes staff2's shift)  
    day2.staff[swap.staffId1] = {
      ...staff2OriginalShift,
      isSwapCoverage: true,
      swapInfo: {
        originalStaffId: swap.staffId2,
        originalStaffName: STAFF_MEMBERS.find(s => s.id === swap.staffId2)?.name || swap.staffId2,
        swapType: 'covering'
      }
    }

    // Remove/modify the original assignments to prevent conflicts
    if (staff1Day1.event === 'AL') {
      // Person taking leave: remove AL display since coverage is shown
      delete day1.staff[swap.staffId1]
    }

    // Remove original assignment for covering person on swap date
    day2.staff[swap.staffId2] = {
      event: "OFF",
      details: null,
      isSwapResult: true,
      swapInfo: {
        originalStaffId: swap.staffId2,
        originalStaffName: STAFF_MEMBERS.find(s => s.id === swap.staffId2)?.name || swap.staffId2,
        coveringStaffId: swap.staffId1,
        coveringStaffName: STAFF_MEMBERS.find(s => s.id === swap.staffId1)?.name || swap.staffId1,
        swapType: 'original_off'
      }
    }

    console.log(`✅ Swap ${swap.id} applied successfully:`)
    console.log(`  ${swap.staffId1} (taking leave) → ${swap.staffId2} covers on ${swap.date1.toDateString()}`)
    console.log(`  ${swap.staffId2} (original shift) → ${swap.staffId1} covers on ${swap.date2.toDateString()}`)
  })
}

export function generateSchedule(
  targetMonth: Date,
  publicHolidays: Date[] = [],
  annualLeave: { staffId: string; dates: Date[] }[] = [],
  swaps: { id: string; staffId1: string; staffId2: string; date1: Date; date2: Date }[] = []
): ScheduledDay[] {
  // Get extended date range (full weeks containing the month)
  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)

  // Start from Monday of the week containing the first day
  const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  // End on Sunday of the week containing the last day
  const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const allDates: Date[] = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  const allDays: ScheduledDay[] = allDates.map((date: Date) => {
    const dayOfWeek = getDay(date)
    const isoWeek = getISOWeek(date)
    const patternIndex: 0 | 1 = (isoWeek % 2) as 0 | 1 // 0 for even weeks, 1 for odd weeks
    const pattern: ShiftPattern = SHIFT_PATTERNS[patternIndex]

    const scheduledDay: ScheduledDay = {
      date,
      staff: {},
      isCurrentMonth: isSameMonth(date, targetMonth),
    }

    // Check if it's a public holiday
    const isPublicHoliday = publicHolidays.some(
      (ph) => ph.getTime() === date.getTime()
    )

    STAFF_MEMBERS.forEach((staff) => {
      // Skip if this staff member has already been assigned through a swap
      if (scheduledDay.staff[staff.id]) {
        return
      }

      // Determine the potential shift for the day first (CLONE IT to prevent mutation)
      const originalShift = pattern.dailyShifts[staff.id]?.[dayOfWeek]
      const shift = cloneShiftDefinition(originalShift)

      // Check for annual leave first, as it takes precedence
      const hasAnnualLeave = annualLeave.some(
        (al) =>
          al.staffId === staff.id &&
          al.dates.some((alDate) => alDate.getTime() === date.getTime())
      )

      if (hasAnnualLeave) {
        // Attempt role-based coverage swap
        const swapResult = attemptAnnualLeaveSwap(
          staff, 
          originalShift, 
          date, 
          pattern, 
          scheduledDay, 
          STAFF_MEMBERS,
          annualLeave
        )
        
        if (swapResult.swapMade) {
          // Swap was successful - the covering staff takes the shift
        scheduledDay.staff[staff.id] = {
          event: "AL",
          details: null,
          }
          // The covering staff's assignment is handled in attemptAnnualLeaveSwap
          return
        } else {
          // No swap possible - grant AL anyway with warning about coverage gap
          scheduledDay.staff[staff.id] = {
            event: "AL",
            details: null,
            warning: swapResult.warning, // This will indicate the coverage gap
          }
          return
        }
      }

      // Now, handle public holidays and shifts
      if (isPublicHoliday) {
        if (shift) {
          // They were scheduled to work, so bank the hours
          scheduledDay.staff[staff.id] = {
            event: "PH",
            details: shift, // Keep shift details for reference
            bankedHours: shift.workHours,
          }
          initializeHourTracking(scheduledDay, staff.id, shift.workHours)
        } else {
          // They were already off
           scheduledDay.staff[staff.id] = {
            event: "OFF",
            details: null,
          }
        }
        return
      }

      // Regular day logic
      if (shift) {
        scheduledDay.staff[staff.id] = {
          event: "Shift",
          details: shift,
        }
      } else {
        scheduledDay.staff[staff.id] = {
          event: "OFF",
          details: null,
        }
      }
    })

    return scheduledDay
  })

  // Process swaps after initial schedule generation
  processSwaps(allDays, swaps)

  return reallocateBankedHours(allDays)
}

export function isCurrentMonth(date: Date, targetMonth: Date): boolean {
  return isSameMonth(date, targetMonth)
}

/**
 * Calculate actual weekly hours for each staff member from the generated schedule
 * This includes base hours + reallocated hours from public holidays
 */
export function calculateWeeklyHours(schedule: ScheduledDay[]): WeeklyHourLog[] {
  // Group days by ISO week and staff
  const weeklyLogs: { [key: string]: WeeklyHourLog } = {}

  schedule.forEach((day) => {
    const weekNumber = getISOWeek(day.date)
    
    STAFF_MEMBERS.forEach((staff) => {
      const key = `${staff.id}-${weekNumber}`
      
      if (!weeklyLogs[key]) {
        weeklyLogs[key] = {
          staffId: staff.id,
          weekNumber,
          targetHours: staff.weeklyHours,
          scheduledHours: 0,
          bankedHours: 0,
        }
      }

      const daySchedule = day.staff[staff.id]
      if (daySchedule) {
        // Add regular shift hours
        if (daySchedule.event === "Shift" && daySchedule.details) {
          const baseHours = daySchedule.details.workHours
          const reallocatedHours = daySchedule.details.reallocatedHours || 0
          weeklyLogs[key].scheduledHours += baseHours + reallocatedHours
        }
        
        // Track banked hours (not yet reallocated)
        if (daySchedule.bankedHours && daySchedule.bankedHours > 0) {
          weeklyLogs[key].bankedHours += daySchedule.bankedHours
        }
      }
    })
  })

  return Object.values(weeklyLogs)
}

/**
 * Get total weekly hours for a specific staff member in a specific week
 * Includes both regular and reallocated hours
 */
export function getStaffWeeklyHours(
  schedule: ScheduledDay[], 
  staffId: string, 
  weekNumber: number
): number {
  const weeklyLogs = calculateWeeklyHours(schedule)
  const log = weeklyLogs.find(log => log.staffId === staffId && log.weekNumber === weekNumber)
  return log ? log.scheduledHours : 0
}

function reallocateBankedHours(schedule: ScheduledDay[]): ScheduledDay[] {
  // Group days by both ISO week and month
  const weeks = schedule.reduce((acc, day) => {
    const weekNumber = getISOWeek(day.date)
    if (!acc[weekNumber]) {
      acc[weekNumber] = []
    }
    acc[weekNumber].push(day)
    return acc
  }, {} as { [week: number]: ScheduledDay[] })

  // Process each week to handle banked hours
  for (const weekNumber in weeks) {
    const week = weeks[weekNumber]
    STAFF_MEMBERS.forEach((staff) => {
      // Calculate total banked hours for the staff member in this week
      const totalBankedHours = week.reduce((total, day) => {
        return total + (day.staff[staff.id]?.bankedHours || 0)
      }, 0)

      if (totalBankedHours === 0) return

      // Find the holiday day(s) to determine the month context
      const holidayDays = week.filter((day) => day.staff[staff.id]?.bankedHours)
      if (holidayDays.length === 0) return

      const holidayMonth = holidayDays[0].date.getMonth()
      const holidayYear = holidayDays[0].date.getFullYear()

      // PHASE 1: Try to reallocate within the same ISO week first
      const weekShifts = week.filter(
        (day) =>
          day.staff[staff.id]?.event === "Shift" &&
          day.staff[staff.id]?.details !== null
      )

      let hoursToDistribute = totalBankedHours
      
      // Distribute to week shifts first (existing logic)
      if (weekShifts.length > 0) {
        hoursToDistribute = distributeHours(
          hoursToDistribute, 
          weekShifts, 
          staff.id, 
          holidayDays[0].date
        )
      }

      // PHASE 2: If hours remain, extend to same month
      if (hoursToDistribute > 0) {
        // Find all available shifts in the same month (excluding current week)
        const monthShifts = schedule.filter((day) => {
          const dayMonth = day.date.getMonth()
          const dayYear = day.date.getFullYear()
          const dayWeek = getISOWeek(day.date)
          
          return (
            dayMonth === holidayMonth &&
            dayYear === holidayYear &&
            dayWeek !== parseInt(weekNumber) && // Exclude current week
            day.staff[staff.id]?.event === "Shift" &&
            day.staff[staff.id]?.details !== null
          )
        })

        if (monthShifts.length > 0) {
          // Sort by proximity to holiday for better distribution
          monthShifts.sort((a, b) => {
            const aDiff = Math.abs(a.date.getTime() - holidayDays[0].date.getTime())
            const bDiff = Math.abs(b.date.getTime() - holidayDays[0].date.getTime())
            return aDiff - bDiff
          })

          hoursToDistribute = distributeHours(
            hoursToDistribute, 
            monthShifts, 
            staff.id, 
            holidayDays[0].date
          )
        }
      }

      // Calculate how many hours were successfully reallocated
      const totalReallocatedHours = totalBankedHours - hoursToDistribute
      
      // Update hour tracking for each holiday day
      holidayDays.forEach((phDay) => {
        if (phDay.staff[staff.id]?.originalBankedHours) {
          updateHourTracking(
            phDay,
            staff.id,
            totalReallocatedHours,
            hoursToDistribute
          )
        }
      })

      // If still hours remain, add warning
      if (hoursToDistribute > 0) {
        const phDay = holidayDays[0]
        phDay.staff[staff.id].warning = `Could not reallocate ${hoursToDistribute} of ${totalBankedHours} banked hours.`
      }
    })
  }

  return Object.values(weeks).flat()
}

/**
 * Strategically distribute hours among available shifts based on staff targets and current workload
 * Prioritizes staff who are furthest below their weekly targets
 * Returns the number of hours that could not be distributed
 */
function distributeHours(
  hoursToDistribute: number,
  availableShifts: ScheduledDay[],
  staffId: string,
  holidayDate: Date
): number {
  if (hoursToDistribute <= 0 || availableShifts.length === 0) {
    return hoursToDistribute
  }

  // Get the week number for the holiday to focus on that week's targets
  const holidayWeek = getISOWeek(holidayDate)
  
  // Group shifts by week to calculate current totals
  const shiftsByWeek = availableShifts.reduce((acc, shift) => {
    const weekNum = getISOWeek(shift.date)
    if (!acc[weekNum]) {
      acc[weekNum] = []
    }
    acc[weekNum].push(shift)
    return acc
  }, {} as { [week: number]: ScheduledDay[] })

  // Find the staff member to get their target
  const staff = STAFF_MEMBERS.find(s => s.id === staffId)
  if (!staff) {
    return hoursToDistribute // Fallback to old algorithm if staff not found
  }

  let remainingHours = hoursToDistribute

  // Process weeks in order of priority (holiday week first, then others)
  const weekNumbers = Object.keys(shiftsByWeek).map(Number).sort((a, b) => {
    if (a === holidayWeek) return -1
    if (b === holidayWeek) return 1
    return Math.abs(a - holidayWeek) - Math.abs(b - holidayWeek) // Closer weeks first
  })

  for (const weekNum of weekNumbers) {
    if (remainingHours <= 0) break

    const weekShifts = shiftsByWeek[weekNum]
    
    // Calculate current weekly hours for this staff member in this week
    let currentWeeklyHours = 0
    weekShifts.forEach(shift => {
      const shiftDetails = shift.staff[staffId]?.details
      if (shiftDetails && shift.staff[staffId]?.event === 'Shift') {
        currentWeeklyHours += shiftDetails.workHours + (shiftDetails.reallocatedHours || 0)
      }
    })

    // Calculate hour deficit for this week
    const hourDeficit = Math.max(0, staff.weeklyHours - currentWeeklyHours)
    
    // Determine how many hours to allocate to this week
    const hoursForThisWeek = Math.min(remainingHours, hourDeficit)
    
    if (hoursForThisWeek > 0) {
      // Distribute hours within this week using weighted approach
      remainingHours -= distributeHoursInWeek(weekShifts, staffId, hoursForThisWeek)
    }
  }

  // If still hours remain after strategic distribution, fall back to even distribution
  if (remainingHours > 0) {
    remainingHours = distributeHoursEvenly(availableShifts, staffId, remainingHours)
  }

  return remainingHours
}

/**
 * Log successful reallocation for debugging and tracking
 */
function logReallocation(staffId: string, day: number, hours: number, message?: string): void {
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
  console.log(`[REALLOCATION SUCCESS] ${staffId}: +${hours}h on ${dayName}${message ? ` (${message})` : ''}`)
}

/**
 * Log failed reallocation attempts for debugging
 */
function logReallocationFailure(staffId: string, hours: number, reason: string): void {
  console.log(`[REALLOCATION FAILURE] ${staffId}: Could not allocate ${hours}h - ${reason}`)
}

/**
 * Distribute hours within a single week, prioritizing shifts that can accommodate more hours
 * SMART LOGIC: Only target shifts with available capacity within the 11-hour daily limit
 */
function distributeHoursInWeek(
  weekShifts: ScheduledDay[],
  staffId: string,
  hoursToDistribute: number
): number {
  let remainingHours = hoursToDistribute
  
  // Filter and sort shifts by available capacity (most capacity first)
  const sortedShifts = weekShifts
    .filter(shift => shift.staff[staffId]?.event === 'Shift' && shift.staff[staffId]?.details)
    .map(shift => {
      const shiftDetails = shift.staff[staffId].details!
      const currentTotal = shiftDetails.workHours + (shiftDetails.reallocatedHours || 0)
      const availableCapacity = SAFETY_LIMITS.MAX_DAILY_HOURS - currentTotal
      return {
        shift,
        shiftDetails,
        availableCapacity
      }
    })
    .filter(item => item.availableCapacity > 0) // Only include shifts with available capacity
    .sort((a, b) => b.availableCapacity - a.availableCapacity) // Sort by capacity (most available first)

  if (sortedShifts.length === 0) {
    // No shifts with available capacity in this week
    console.log(`[REALLOCATION] ${staffId}: No shifts with available capacity in week (all shifts at capacity)`)
    return remainingHours
  }

  // Distribute hours to shifts with available capacity
  while (remainingHours > 0 && sortedShifts.length > 0) {
    let hoursDistributedThisRound = 0
    
    for (const item of sortedShifts) {
      if (remainingHours <= 0) break
      
      const { shiftDetails, availableCapacity } = item
      
      // Calculate how many hours we can add to this shift
      const hoursToAdd = Math.min(
        remainingHours, 
        availableCapacity,
        2 // Maximum 2 hours per shift per round for better distribution
      )
      
      if (hoursToAdd > 0) {
        // Double-check with validation (including operational hours)
        const validation = validateDailySafetyLimits(shiftDetails, hoursToAdd)
        
        if (validation.isValid) {
          const currentReallocated = shiftDetails.reallocatedHours || 0
          shiftDetails.reallocatedHours = currentReallocated + hoursToAdd
          remainingHours -= hoursToAdd
          hoursDistributedThisRound += hoursToAdd
          
          // Update available capacity for next round
          item.availableCapacity -= hoursToAdd
          
          console.log(`[REALLOCATION] ${staffId}: Added ${hoursToAdd}h to ${shiftDetails.workHours}h shift (${item.availableCapacity}h capacity remaining)`)
        } else if (validation.maxAllowed && validation.maxAllowed > 0) {
          // Add what we can within safety limits
          const currentReallocated = shiftDetails.reallocatedHours || 0
          shiftDetails.reallocatedHours = currentReallocated + validation.maxAllowed
          remainingHours -= validation.maxAllowed
          hoursDistributedThisRound += validation.maxAllowed
          
          // Update available capacity for next round
          item.availableCapacity -= validation.maxAllowed
          
          console.log(`[REALLOCATION] ${staffId}: Limited to ${validation.maxAllowed}h on ${shiftDetails.workHours}h shift: ${validation.reason}`)
        } else {
          console.log(`[REALLOCATION] ${staffId}: Skipped ${shiftDetails.workHours}h shift: ${validation.reason}`)
        }
      }
    }
    
    // Remove shifts that have no more capacity
    sortedShifts.forEach((item, index) => {
      if (item.availableCapacity <= 0) {
        sortedShifts.splice(index, 1)
      }
    })
    
    // If no hours were distributed this round, break to avoid infinite loop
    if (hoursDistributedThisRound === 0) {
      console.log(`[REALLOCATION] ${staffId}: No more capacity available in week shifts`)
      break
    }
  }

  const hoursDistributed = hoursToDistribute - remainingHours
  console.log(`[REALLOCATION] ${staffId}: Distributed ${hoursDistributed}h in week, ${remainingHours}h remaining`)
  
  return remainingHours
}

/**
 * Fallback: Distribute remaining hours evenly across all available shifts
 */
function distributeHoursEvenly(
  availableShifts: ScheduledDay[],
  staffId: string,
  hoursToDistribute: number
): number {
  let remainingHours = hoursToDistribute
  let shiftIndex = 0
  let safetyBreaker = 0
  const maxAttempts = availableShifts.length * SAFETY_LIMITS.MAX_EXTRA_HOURS_PER_SHIFT
  
  while (remainingHours > 0 && availableShifts.length > 0 && safetyBreaker < maxAttempts) {
    const shift = availableShifts[shiftIndex % availableShifts.length]
    const shiftDetails = shift.staff[staffId]?.details
    
    if (shiftDetails && shift.staff[staffId]?.event === 'Shift') {
      // Validate safety limits before adding 1 hour
      const validation = validateDailySafetyLimits(shiftDetails, 1)
      
      if (validation.isValid) {
        const currentReallocated = shiftDetails.reallocatedHours || 0
        shiftDetails.reallocatedHours = currentReallocated + 1
        remainingHours--
      }
      // If validation fails, skip this shift and try the next one
    }
    
    shiftIndex++
    safetyBreaker++
  }
  
  return remainingHours
}

/**
 * Dynamic OFF day management for annual leave scenarios
 */
interface OffDayShiftOptions {
  preserveConsecutiveDays: boolean;
  minimumConsecutiveDays: number;
  allowRoleSubstitution: boolean;
}

/**
 * Calculate optimal OFF day patterns when annual leave creates conflicts
 */
function calculateDynamicOffDays(
  staffMembers: StaffMember[],
  annualLeave: { staffId: string; dates: Date[] }[],
  targetDate: Date,
  options: OffDayShiftOptions = {
    preserveConsecutiveDays: true,
    minimumConsecutiveDays: 2,
    allowRoleSubstitution: true
  }
): Map<string, Set<number>> {
  // Start with default OFF days
  const dynamicOffDays = new Map<string, Set<number>>();
  
  staffMembers.forEach(staff => {
    dynamicOffDays.set(staff.id, new Set(staff.defaultOffDays));
  });

  // Apply annual leave constraints and adjust OFF days if needed
  annualLeave.forEach(leave => {
    leave.dates.forEach(leaveDate => {
      if (isSameDate(leaveDate, targetDate)) {
        // Staff member is on leave this day - may need to shift other staff's OFF days
        const dayOfWeek = leaveDate.getDay();
        
        // Find staff with same role who could cover
        const onLeaveStaff = staffMembers.find(s => s.id === leave.staffId);
        if (!onLeaveStaff) return;
        
        const potentialCovers = staffMembers.filter(s => 
          s.id !== leave.staffId && 
          s.role === onLeaveStaff.role
        );
        
        // Check if any potential cover staff need their OFF days adjusted
        potentialCovers.forEach(coverStaff => {
          const currentOffDays = dynamicOffDays.get(coverStaff.id) || new Set();
          
          // If the cover staff is normally OFF on this day, consider shifting their OFF days
          if (currentOffDays.has(dayOfWeek)) {
            // Try to maintain consecutive OFF days by shifting the pattern
            const shiftedOffDays = findAlternativeOffDays(
              coverStaff,
              currentOffDays,
              dayOfWeek,
              options
            );
            
            if (shiftedOffDays.size >= options.minimumConsecutiveDays) {
              dynamicOffDays.set(coverStaff.id, shiftedOffDays);
            }
          }
        });
      }
    });
  });

  return dynamicOffDays;
}

/**
 * Find alternative OFF days that maintain consecutive day requirements
 */
function findAlternativeOffDays(
  staff: StaffMember,
  currentOffDays: Set<number>,
  dayToWork: number,
  options: OffDayShiftOptions
): Set<number> {
  const newOffDays = new Set(currentOffDays);
  
  // Remove the day they need to work
  newOffDays.delete(dayToWork);
  
  // If we still have enough consecutive days, we're good
  if (hasConsecutiveDays(newOffDays, options.minimumConsecutiveDays)) {
    return newOffDays;
  }
  
  // Otherwise, try to find a new pattern that works
  // For simplicity, try shifting the pattern by +/- 1 day
  for (let shift = -1; shift <= 1; shift += 2) {
    const shiftedPattern = new Set<number>();
    
    staff.defaultOffDays.forEach(day => {
      let newDay = (day + shift) % 7;
      if (newDay < 0) newDay += 7;
      
      // Don't add the day they need to work
      if (newDay !== dayToWork) {
        shiftedPattern.add(newDay);
      }
    });
    
    if (hasConsecutiveDays(shiftedPattern, options.minimumConsecutiveDays)) {
      return shiftedPattern;
    }
  }
  
  // If no good pattern found, return original minus the work day
  return newOffDays;
}

/**
 * Check if a set of days contains the required number of consecutive days
 */
function hasConsecutiveDays(days: Set<number>, required: number): boolean {
  if (days.size < required) return false;
  
  const sortedDays = Array.from(days).sort((a, b) => a - b);
  
  // Check for consecutive sequence
  for (let i = 0; i <= sortedDays.length - required; i++) {
    let consecutive = 1;
    
    for (let j = i + 1; j < sortedDays.length; j++) {
      if (sortedDays[j] === sortedDays[j-1] + 1) {
        consecutive++;
        if (consecutive >= required) return true;
      } else {
        break;
      }
    }
  }
  
  // Also check wrap-around (Sunday to Monday)
  if (sortedDays.includes(0) && sortedDays.includes(6)) {
    // Check if we have consecutive days wrapping around the week
    const wrapAroundDays = [6, ...sortedDays.filter(d => d !== 6)];
    for (let i = 0; i <= wrapAroundDays.length - required; i++) {
      let consecutive = 1;
      
      for (let j = i + 1; j < wrapAroundDays.length; j++) {
        const current = wrapAroundDays[j];
        const previous = wrapAroundDays[j-1];
        
        if ((current === 0 && previous === 6) || current === previous + 1) {
          consecutive++;
          if (consecutive >= required) return true;
        } else {
          break;
        }
      }
    }
  }
  
  return false;
}

function processAnnualLeave(
  schedule: ScheduledDay[],
  annualLeave: { staffId: string; dates: Date[]; coverageMethod?: string; tempStaff?: any }[],
  staffMembers: StaffMember[]
): void {
  annualLeave.forEach(leave => {
    leave.dates.forEach(leaveDate => {
      const dayIndex = schedule.findIndex(day => isSameDate(day.date, leaveDate));
      if (dayIndex === -1) return;

      const scheduleDay = schedule[dayIndex];
      const staffOnLeave = scheduleDay.staff[leave.staffId];
      
      if (!staffOnLeave) return;

      // Calculate dynamic OFF days for this date
      const dynamicOffDays = calculateDynamicOffDays(staffMembers, annualLeave, leaveDate);

      // Check if staff member was scheduled to work
      if (staffOnLeave.event === 'Shift' && staffOnLeave.details) {
        const originalShift = staffOnLeave.details;
        const staffMember = staffMembers.find(s => s.id === leave.staffId);
        
                         // Check if temp staff is assigned for this leave
        if (leave.coverageMethod === "temp-staff" && leave.tempStaff) {
          // Show temp staff working instead of AL
          scheduleDay.staff[leave.staffId] = {
            event: 'Shift',
            details: {
              type: originalShift.type,
              timing: originalShift.timing,
              startTime: leave.tempStaff.startTime,
              endTime: leave.tempStaff.endTime,
              workHours: originalShift.workHours
            },
            warning: undefined,
            tempStaffName: leave.tempStaff.name
          };
        } else {
          // Mark as Annual Leave
          scheduleDay.staff[leave.staffId] = {
            event: 'AL',
            details: null,
            warning: undefined
          };
        }

        // Try to find someone of the same role to cover the shift
        const potentialCovers = staffMembers.filter(staff => 
          staff.id !== leave.staffId && 
          staff.role === staffMember?.role
        );

        let coverFound = false;
        
        // Look for available cover staff (considering dynamic OFF days)
        for (const coverStaff of potentialCovers) {
          const coverSchedule = scheduleDay.staff[coverStaff.id];
          const coverOffDays = dynamicOffDays.get(coverStaff.id) || new Set(coverStaff.defaultOffDays);
          const dayOfWeek = leaveDate.getDay();
          
          // Check if this staff member can cover (not already working and not on dynamic OFF day)
          if (coverSchedule.event === 'OFF' || !coverOffDays.has(dayOfWeek)) {
                         // Assign the original shift to the cover staff
             scheduleDay.staff[coverStaff.id] = {
               event: 'Shift',
               details: {
                 ...originalShift,
                 // Keep the original shift details including work hours
                 workHours: originalShift.workHours,
                 startTime: originalShift.startTime,
                 endTime: originalShift.endTime
               },
               warning: undefined
             };
            coverFound = true;
            break;
          }
        }

        // If no cover found, create a warning
        if (!coverFound) {
          scheduleDay.staff[leave.staffId] = {
            event: 'AL',
            details: null,
            warning: `Coverage gap: No available ${staffMember?.role} to cover ${originalShift.workHours}h shift`
          };
        }
             } else {
         // Staff member was already off, just mark as AL
         scheduleDay.staff[leave.staffId] = {
           event: 'AL',
           details: null,
           warning: undefined
         };
       }
    });
  });
}

