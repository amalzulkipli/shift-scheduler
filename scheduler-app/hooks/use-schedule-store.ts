import { create } from "zustand"
import { AnnualLeave } from "@/types/schedule"
import { PUBLIC_HOLIDAYS_2025 } from "@/lib/public-holidays"

interface PublicHoliday {
  date: Date
  name: string
}

interface ScheduleState {
  currentMonth: Date
  publicHolidays: PublicHoliday[]
  annualLeave: AnnualLeave[]
  setCurrentMonth: (month: Date) => void
  addPublicHoliday: (date: Date, name?: string) => void
  removePublicHoliday: (date: Date) => void
  addAnnualLeave: (staffId: string, date: Date) => void
  removeAnnualLeave: (staffId: string, date: Date) => void
}

export const useScheduleStore = create<ScheduleState>()(set => ({
  currentMonth: new Date(),
  // Initialize with default public holidays from PUBLIC_HOLIDAYS_2025
  publicHolidays: PUBLIC_HOLIDAYS_2025.map(holiday => ({
    date: holiday.date,
    name: holiday.name
  })),
  annualLeave: [],
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
  addAnnualLeave: (staffId, date) =>
    set(state => {
      const existingEntry = state.annualLeave.find(al => al.staffId === staffId)
      if (existingEntry) {
        return {
          annualLeave: state.annualLeave.map(al =>
            al.staffId === staffId
              ? { ...al, dates: [...al.dates, date] }
              : al
          ),
        }
      } else {
        return {
          annualLeave: [...state.annualLeave, { staffId, dates: [date] }],
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
})) 