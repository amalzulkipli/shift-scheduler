import { create } from "zustand"
import { TempStaffConfig } from "@/types/schedule"
import { PUBLIC_HOLIDAYS_2025 } from "@/lib/public-holidays"

interface PublicHoliday {
  date: Date
  name: string
}

interface SwapRecord {
  id: string
  staffId1: string
  staffId2: string
  date1: Date
  date2: Date
  createdAt: Date
}

interface AnnualLeave {
  staffId: string
  date: Date
  coverageMethod?: "auto-swap" | "temp-staff" | "decide-later"
  swapId?: string
  tempStaff?: TempStaffConfig
  reason?: string
}

interface ScheduleState {
  currentMonth: Date
  publicHolidays: PublicHoliday[]
  annualLeave: AnnualLeave[]
  swaps: SwapRecord[]
  setCurrentMonth: (month: Date) => void
  addPublicHoliday: (date: Date, name?: string) => void
  removePublicHoliday: (date: Date) => void
  addAnnualLeave: (staffId: string, date: Date, coverageMethod?: string, tempStaff?: any, swapId?: string, reason?: string) => void
  removeAnnualLeave: (staffId: string, date: Date) => void
  addSwap: (staffId1: string, staffId2: string, date1: Date, date2: Date) => string
  removeSwap: (swapId: string) => void
}

export const useScheduleStore = create<ScheduleState>()(set => ({
  currentMonth: new Date(),
  // Initialize with default public holidays from PUBLIC_HOLIDAYS_2025
  publicHolidays: PUBLIC_HOLIDAYS_2025.map(holiday => ({
    date: holiday.date,
    name: holiday.name
  })),
  annualLeave: [],
  swaps: [],
  setCurrentMonth: month => set({ currentMonth: month }),
  addPublicHoliday: (date, name = "Public Holiday") =>
    set(state => {
      if (state.publicHolidays.some(d => d.date.getTime() === date.getTime())) {
        return state
      }
      return { publicHolidays: [...state.publicHolidays, { date, name }] }
    }),
  removePublicHoliday: date =>
    set(state => ({
      publicHolidays: state.publicHolidays.filter(
        h => h.date.getTime() !== date.getTime()
      ),
    })),
  addAnnualLeave: (staffId, date, coverageMethod, tempStaff, swapId, reason) =>
    set(state => {
      // Store each leave date as a separate record to preserve individual coverage methods
      console.log("Store: Adding leave record", { staffId, date, coverageMethod, tempStaff, swapId, reason })
      return {
        annualLeave: [...state.annualLeave, { 
          staffId, 
          date,
          coverageMethod: coverageMethod as any,
          tempStaff,
          swapId,
          reason
        }],
      }
    }),
  removeAnnualLeave: (staffId, date) =>
    set(state => ({
      annualLeave: state.annualLeave.filter(
        al => !(al.staffId === staffId && al.date.getTime() === date.getTime())
      ),
    })),
  addSwap: (staffId1, staffId2, date1, date2) => {
    const swapId = `${staffId1}-${staffId2}-${date1.toISOString()}-${date2.toISOString()}`
    set(state => ({
      swaps: [...state.swaps, { id: swapId, staffId1, staffId2, date1, date2, createdAt: new Date() }],
    }))
    return swapId
  },
  removeSwap: swapId =>
    set(state => ({
      swaps: state.swaps.filter(s => s.id !== swapId),
    })),
})) 