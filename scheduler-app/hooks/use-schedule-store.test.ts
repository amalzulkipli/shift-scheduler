import { describe, it, expect, beforeEach } from "vitest"
import { useScheduleStore } from "./use-schedule-store"
import { act } from "@testing-library/react"

// Reset store before each test
beforeEach(() => {
  act(() => {
    useScheduleStore.setState({
      currentMonth: new Date("2024-07-01T00:00:00.000Z"),
      publicHolidays: [],
      annualLeave: [],
      swaps: [],
    })
  })
})

describe("useScheduleStore", () => {
  it("should set the current month", () => {
    const newMonth = new Date("2024-08-01T00:00:00.000Z")
    act(() => {
      useScheduleStore.getState().setCurrentMonth(newMonth)
    })
    expect(useScheduleStore.getState().currentMonth).toEqual(newMonth)
  })

  it("should add a public holiday", () => {
    const holiday = new Date("2024-07-25T00:00:00.000Z")
    act(() => {
      useScheduleStore.getState().addPublicHoliday(holiday)
    })
    expect(useScheduleStore.getState().publicHolidays).toContainEqual({ date: holiday, name: "Public Holiday" })
  })

  it("should remove a public holiday", () => {
    const holiday = new Date("2024-07-25T00:00:00.000Z")
    act(() => {
      useScheduleStore.getState().addPublicHoliday(holiday)
    })
    expect(useScheduleStore.getState().publicHolidays).toContainEqual({ date: holiday, name: "Public Holiday" })

    act(() => {
      useScheduleStore.getState().removePublicHoliday(holiday)
    })
    expect(useScheduleStore.getState().publicHolidays).not.toContainEqual({ date: holiday, name: "Public Holiday" })
  })

  it("should add annual leave for a new staff member", () => {
    const staffId = "test-staff"
    const leaveDate = new Date("2024-07-10T00:00:00.000Z")
    act(() => {
      useScheduleStore.getState().addAnnualLeave(staffId, leaveDate)
    })
    const annualLeave = useScheduleStore.getState().annualLeave
    expect(annualLeave).toHaveLength(1)
    expect(annualLeave[0].staffId).toBe(staffId)
    expect(annualLeave[0].dates).toContainEqual(leaveDate)
  })

  it("should add annual leave for an existing staff member", () => {
    const staffId = "test-staff"
    const firstLeaveDate = new Date("2024-07-10T00:00:00.000Z")
    const secondLeaveDate = new Date("2024-07-11T00:00:00.000Z")

    act(() => {
      useScheduleStore.getState().addAnnualLeave(staffId, firstLeaveDate)
    })
    act(() => {
      useScheduleStore.getState().addAnnualLeave(staffId, secondLeaveDate)
    })

    const annualLeave = useScheduleStore.getState().annualLeave
    expect(annualLeave).toHaveLength(1)
    expect(annualLeave[0].dates).toHaveLength(2)
    expect(annualLeave[0].dates).toContainEqual(firstLeaveDate)
    expect(annualLeave[0].dates).toContainEqual(secondLeaveDate)
  })

  it("should remove annual leave for a staff member", () => {
    const staffId = "test-staff"
    const leaveDate1 = new Date("2024-07-10T00:00:00.000Z")
    const leaveDate2 = new Date("2024-07-11T00:00:00.000Z")

    act(() => {
      useScheduleStore.getState().addAnnualLeave(staffId, leaveDate1)
      useScheduleStore.getState().addAnnualLeave(staffId, leaveDate2)
    })

    act(() => {
      useScheduleStore.getState().removeAnnualLeave(staffId, leaveDate1)
    })

    const annualLeave = useScheduleStore.getState().annualLeave
    expect(annualLeave).toHaveLength(1)
    expect(annualLeave[0].dates).toHaveLength(1)
    expect(annualLeave[0].dates).not.toContainEqual(leaveDate1)
    expect(annualLeave[0].dates).toContainEqual(leaveDate2)
  })

  it("should remove the staff member from annual leave list if they have no leave dates left", () => {
    const staffId = "test-staff"
    const leaveDate = new Date("2024-07-10T00:00:00.000Z")

    act(() => {
      useScheduleStore.getState().addAnnualLeave(staffId, leaveDate)
    })

    act(() => {
      useScheduleStore.getState().removeAnnualLeave(staffId, leaveDate)
    })

    const annualLeave = useScheduleStore.getState().annualLeave
    expect(annualLeave).toHaveLength(0)
  })
}) 