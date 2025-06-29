export interface StaffMember {
  id: string
  name: string
  role: "Pharmacist" | "Assistant Pharmacist"
  weeklyHours: number
  defaultOffDays: number[] // 0 = Sunday, 1 = Monday, etc.
}

export interface ShiftDefinition {
  type: "11h" | "9h" | "8h" | "7h"
  timing: "early" | "late" | null
  startTime: string
  endTime: string
  workHours: number
  reallocatedHours?: number
}

export interface ShiftPattern {
  patternId: 0 | 1
  dailyShifts: {
    [staffId: string]: {
      [dayOfWeek: number]: ShiftDefinition | null
    }
  }
}

export interface SwapInfo {
  originalStaffId: string
  originalStaffName: string
  swapType: 'covering' | 'original_off'
  coveringStaffId?: string
  coveringStaffName?: string
}

export interface ScheduledDay {
  date: Date
  staff: {
    [staffId: string]: {
      event: "Shift" | "AL" | "PH" | "OFF"
      details: ShiftDefinition | null
      warning?: string
      bankedHours?: number // Current banked hours (remaining after reallocation)
      originalBankedHours?: number // Original hours banked from this holiday
      totalReallocatedHours?: number // Total hours successfully reallocated from this day
      remainingUnallocatedHours?: number // Hours that couldn't be reallocated
      isSwapCoverage?: boolean // Indicates this person is covering for someone else
      isSwapResult?: boolean // Indicates this assignment is result of a swap
      swapInfo?: SwapInfo // Details about the swap
      tempStaffName?: string // Name of temp staff covering this shift
    }
  }
  isCurrentMonth: boolean
}

export interface WeeklyHourLog {
  staffId: string
  weekNumber: number
  targetHours: number
  scheduledHours: number
  bankedHours: number
}

export interface TempStaffConfig {
  name: string
  role: string
  startTime: string
  endTime: string
  hourlyRate: number
  notes: string
}

export interface AnnualLeave {
  staffId: string
  date: Date
  coverageMethod?: "auto-swap" | "temp-staff" | "decide-later"
  swapId?: string
  tempStaff?: TempStaffConfig
  reason?: string
}
