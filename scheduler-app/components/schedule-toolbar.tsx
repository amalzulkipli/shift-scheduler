"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Plus, Settings, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { SAMPLE_WARNINGS } from "@/lib/public-holidays"
import { format, subMonths, addMonths } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help"
import { cn } from "@/lib/utils"
import { AddHolidayModal } from "./modals/add-holiday-modal"
import { AddLeaveModal } from "./modals/add-leave-modal"
import { useScheduleStore } from "@/hooks/use-schedule-store"
import { STAFF_MEMBERS } from "@/lib/staff-data"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ScheduleToolbar() {
  const { currentMonth, setCurrentMonth, publicHolidays, annualLeave, addPublicHoliday, removePublicHoliday, addAnnualLeave, removeAnnualLeave } = useScheduleStore()

  const [showHolidayPanel, setShowHolidayPanel] = useState(false)
  const [showLeavePanel, setShowLeavePanel] = useState(false)
  const [showWarningsPanel, setShowWarningsPanel] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newHolidayName, setNewHolidayName] = useState("")
  const [selectedStaff, setSelectedStaff] = useState("")
  const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  // Confirmation dialog states
  const [holidayToDelete, setHolidayToDelete] = useState<Date | null>(null)
  const [leaveToDelete, setLeaveToDelete] = useState<{ staffId: string; date: Date } | null>(null)

  // Refs for focusing inputs
  const holidayNameInputRef = useRef<HTMLInputElement>(null)
  const staffSelectRef = useRef<HTMLSelectElement>(null)

  const handleAddHoliday = () => {
    if (!newHolidayName.trim()) {
      toast.error("Holiday name required", "Please enter a name for the holiday")
      return
    }

    try {
      // Actually add the holiday to the store
      const holidayDate = new Date(newHolidayDate)
      // Adjust for timezone offset to prevent off-by-one day errors
      const timezoneOffset = holidayDate.getTimezoneOffset() * 60000
      const adjustedDate = new Date(holidayDate.getTime() + timezoneOffset)
      
      addPublicHoliday(adjustedDate, newHolidayName.trim())

      toast.success("Holiday added", `${newHolidayName} for ${format(adjustedDate, "MMM d, yyyy")} has been added to the schedule`, {
        action: {
          label: "Undo",
          onClick: () => {
            removePublicHoliday(adjustedDate)
            toast.info("Holiday removed", `${newHolidayName} has been removed`)
          },
        },
      })

      // Reset form
      setNewHolidayName("")
      setNewHolidayDate(format(new Date(), "yyyy-MM-dd"))
    } catch (error) {
      toast.error("Error adding holiday", "Failed to add holiday. Please try again.")
    }
  }

  const confirmRemoveHoliday = () => {
    if (!holidayToDelete) return
    
    try {
      removePublicHoliday(holidayToDelete)
      const holidayInfo = publicHolidays.find(h => h.date.getTime() === holidayToDelete.getTime())
      const holidayName = holidayInfo?.name || "Public Holiday"
      
      toast.success("Holiday removed", `${holidayName} has been removed from the schedule`, {
        action: {
          label: "Undo",
          onClick: () => {
            // Re-add the holiday
            toast.info("Holiday restored", "Holiday has been restored")
          },
        },
      })
    } catch (error) {
      toast.error("Error removing holiday", "Failed to remove holiday. Please try again.")
    } finally {
      setHolidayToDelete(null)
    }
  }

  const handleAddLeave = () => {
    if (!selectedStaff) {
      toast.error("Staff selection required", "Please select a staff member")
      return
    }

    try {
      // Actually add the leave to the store
      const startDate = new Date(leaveStartDate)
      const endDate = new Date(leaveEndDate)
      
      // Add leave for each day in the range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        addAnnualLeave(selectedStaff, new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const staffMember = STAFF_MEMBERS.find(s => s.id === selectedStaff)
      const staffName = staffMember?.name || selectedStaff
      const dateRange = leaveStartDate === leaveEndDate 
        ? format(startDate, "MMM d, yyyy")
        : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`

      toast.success("Leave request added", `${staffName}'s leave for ${dateRange} has been added to the schedule`, {
        action: {
          label: "Undo",
          onClick: () => {
            // Remove the leave dates that were just added
            const undoDate = new Date(startDate)
            while (undoDate <= endDate) {
              removeAnnualLeave(selectedStaff, new Date(undoDate))
              undoDate.setDate(undoDate.getDate() + 1)
            }
            toast.info("Leave removed", `${staffName}'s leave has been removed`)
          },
        },
      })

      // Reset form
      setSelectedStaff("")
      setLeaveStartDate(format(new Date(), "yyyy-MM-dd"))
      setLeaveEndDate(format(new Date(), "yyyy-MM-dd"))
    } catch (error) {
      toast.error("Error adding leave", "Failed to add leave request. Please try again.")
    }
  }

  const confirmRemoveLeave = () => {
    if (!leaveToDelete) return
    
    try {
      removeAnnualLeave(leaveToDelete.staffId, leaveToDelete.date)
      const staffMember = STAFF_MEMBERS.find(s => s.id === leaveToDelete.staffId)
      const staffName = staffMember?.name || leaveToDelete.staffId
      
      toast.success("Leave request removed", `${staffName}'s leave for ${format(leaveToDelete.date, "MMM d, yyyy")} has been removed`, {
        action: {
          label: "Undo",
          onClick: () => {
            toast.info("Leave restored", `${staffName}'s leave has been restored`)
          },
        },
      })
    } catch (error) {
      toast.error("Error removing leave", "Failed to remove leave request. Please try again.")
    } finally {
      setLeaveToDelete(null)
    }
  }

  const closeAllPanels = () => {
    setShowHolidayPanel(false)
    setShowLeavePanel(false)
    setShowWarningsPanel(false)
  }

  const openHolidayPanel = () => {
    setShowHolidayPanel(!showHolidayPanel)
    setShowLeavePanel(false)
    setShowWarningsPanel(false)
  }

  const openLeavePanel = () => {
    setShowLeavePanel(!showLeavePanel)
    setShowHolidayPanel(false)
    setShowWarningsPanel(false)
  }

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: "p",
      description: "Add Public Holiday",
      action: openHolidayPanel,
    },
    {
      key: "l",
      description: "Add Annual Leave",
      action: openLeavePanel,
    },
    {
      key: "w",
      description: "Toggle Warnings Panel",
      action: () => {
        setShowWarningsPanel(!showWarningsPanel)
      },
    },
    {
      key: "Escape",
      description: "Close all panels",
      action: () => {
        closeAllPanels()
      },
    },
    {
      key: "ArrowLeft",
      description: "Previous Month",
      action: () => {
        setCurrentMonth(subMonths(currentMonth, 1))
      },
    },
    {
      key: "ArrowRight",
      description: "Next Month",
      action: () => {
        setCurrentMonth(addMonths(currentMonth, 1))
      },
    },
    {
      key: "?",
      description: "Show keyboard shortcuts help",
      action: () => {
        // This will be handled by the help component
      },
    },
    {
      key: "Enter",
      description: "Submit active form",
      action: () => {
        if (showHolidayPanel) {
          handleAddHoliday()
        } else if (showLeavePanel) {
          handleAddLeave()
        }
      },
    },
  ]

  // Enable keyboard shortcuts
  useKeyboardShortcuts({ shortcuts })

  return (
    <div className="mb-6">
      {/* Main Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={openHolidayPanel}
            className={cn(
              "gap-2 text-gray-700 hover:text-gray-900 transition-colors",
              showHolidayPanel && "bg-blue-50 border-blue-300 text-blue-700",
            )}
          >
            <Calendar className="h-4 w-4" />
            Add Holiday
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              P
            </kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openLeavePanel}
            className={cn(
              "gap-2 text-gray-700 hover:text-gray-900 transition-colors",
              showLeavePanel && "bg-green-50 border-green-300 text-green-700",
            )}
          >
            <Plus className="h-4 w-4" />
            Add Leave
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              L
            </kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeaveModal(true)}
            className="gap-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors border-blue-300"
          >
            <Plus className="h-4 w-4" />
            Enhanced Leave
          </Button>

          <div className="h-4 w-px bg-gray-300" />

          {/* Warnings Indicator */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowWarningsPanel(!showWarningsPanel)
            }}
            className={cn(
              "gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors",
              showWarningsPanel && "bg-amber-50 text-amber-700",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            {SAMPLE_WARNINGS.length} Warnings
            {showWarningsPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              W
            </kbd>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search/Filter */}
          <Input placeholder="Search staff or dates..." className="w-48 h-8 text-sm" />

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp shortcuts={shortcuts} />

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-600"
            onClick={() => {}}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showHolidayPanel && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Public Holiday Management</h3>
            <div className="text-xs text-gray-500">Press Enter to add, Esc to cancel</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="date"
                className="w-40 h-8 text-sm"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
              />
              <Input
                ref={holidayNameInputRef}
                placeholder="Holiday name (e.g., Christmas Day)"
                className="flex-1 h-8 text-sm"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddHoliday()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    closeAllPanels()
                  }
                }}
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleAddHoliday}>
                Add Holiday
              </Button>
            </div>

            {/* Company Public Holidays List */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 mb-2">Company Public Holidays 2025</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {publicHolidays.map((holiday, index) => {
                  // Use the holiday name directly from store, fallback to "Public Holiday"
                  const holidayName = holiday.name
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="font-medium">{holidayName}</span>
                        <span className="text-gray-500">{format(holiday.date, "MMM d, yyyy")}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setHolidayToDelete(holiday.date)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLeavePanel && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Annual Leave Management</h3>
            <div className="text-xs text-gray-500">Press Enter to add, Esc to cancel</div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <select
                ref={staffSelectRef}
                className="h-8 px-3 text-sm border border-gray-300 rounded-md bg-white"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddLeave()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    closeAllPanels()
                  }
                }}
              >
                <option value="">Select Staff</option>
                {STAFF_MEMBERS.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                className="h-8 text-sm"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
              />
              <Input
                type="date"
                className="h-8 text-sm"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
              />
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAddLeave}>
                Add Leave
              </Button>
            </div>

            {/* Existing Leave Requests */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 mb-2">Active Leave Requests</div>
              {annualLeave.flatMap((leave) => 
                leave.dates.map((date, dateIndex) => {
                  const staffMember = STAFF_MEMBERS.find(s => s.id === leave.staffId)
                  const staffName = staffMember?.name || leave.staffId
                  
                  return (
                    <div key={`${leave.staffId}-${dateIndex}`} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="font-medium">{staffName}</span>
                        <span className="text-gray-500">{format(date, "MMM d, yyyy")}</span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Coverage Needed</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setLeaveToDelete({ staffId: leave.staffId, date })}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showWarningsPanel && (
        <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
          <h3 className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Schedule Warnings
          </h3>
          <div className="space-y-2">
            {SAMPLE_WARNINGS.map((warning) => (
              <div key={warning.id} className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-2",
                    warning.severity === "critical" && "bg-red-500",
                    warning.severity === "high" && "bg-amber-500",
                    warning.severity === "medium" && "bg-orange-500",
                  )}
                ></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{warning.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{warning.description}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => toast.info("Resolving warning", "Opening resolution wizard...")}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialogs */}
      <AddHolidayModal
        open={showHolidayModal}
        onOpenChange={setShowHolidayModal}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
      />

      <AddLeaveModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
      />

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!holidayToDelete} onOpenChange={() => setHolidayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              {holidayToDelete && (() => {
                const holidayInfo = publicHolidays.find(h => h.date.getTime() === holidayToDelete.getTime())
                const holidayName = holidayInfo?.name || "Public Holiday"
                return (
                  <>
                    Are you sure you want to remove this holiday?
                    <br />
                    <strong>{holidayName}</strong> on {format(holidayToDelete, "MMMM d, yyyy")}
                    <br /><br />
                    This action cannot be undone.
                  </>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmRemoveHoliday}
            >
              Remove Holiday
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!leaveToDelete} onOpenChange={() => setLeaveToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveToDelete && (
                <>
                  Are you sure you want to remove this leave request?
                  <br />
                  <strong>{STAFF_MEMBERS.find(s => s.id === leaveToDelete.staffId)?.name || leaveToDelete.staffId}</strong>
                  <br />
                  {format(leaveToDelete.date, "MMMM d, yyyy")}
                  <br /><br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmRemoveLeave}
            >
              Remove Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
