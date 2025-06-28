import { create } from "zustand"
import { AnnualLeave, TempStaffConfig } from "@/types/schedule"
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
      const existingEntry = state.annualLeave.find(al => al.staffId === staffId)
      if (existingEntry) {
        return {
          annualLeave: state.annualLeave.map(al =>
            al.staffId === staffId
              ? { 
                  ...al, 
                  dates: [...al.dates, date],
                  coverageMethod: coverageMethod as any,
                  tempStaff,
                  swapId,
                  reason
                }
              : al
          ),
        }
      } else {
        return {
          annualLeave: [...state.annualLeave, { 
            staffId, 
            dates: [date],
            coverageMethod: coverageMethod as any,
            tempStaff,
            swapId,
            reason
          }],
        }
      }
    }),
  removeAnnualLeave: (staffId, date) =>
    set(state => ({
      annualLeave: state.annualLeave
        .map(al =>
          al.staffId === staffId
            ? {
                ...al,
                dates: al.dates.filter(d => d.getTime() !== date.getTime()),
              }
            : al
        )
        .filter(al => al.dates.length > 0),
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