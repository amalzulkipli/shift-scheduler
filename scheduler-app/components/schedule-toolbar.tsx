"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Plus, Settings, AlertTriangle, ChevronDown, ChevronUp, ArrowRightLeft } from "lucide-react"
import { SAMPLE_WARNINGS } from "@/lib/public-holidays"
import { format, subMonths, addMonths, addDays } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help"
import { cn } from "@/lib/utils"
import { AddHolidayModal } from "./modals/add-holiday-modal"
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
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false)
  const [showAddLeaveForm, setShowAddLeaveForm] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newHolidayName, setNewHolidayName] = useState("")
  const [newHolidayType, setNewHolidayType] = useState("public")
  const [newHolidayRecurrence, setNewHolidayRecurrence] = useState("none")
  const [newHolidayMultiDay, setNewHolidayMultiDay] = useState(false)
  const [newHolidayEndDate, setNewHolidayEndDate] = useState("")
  const [newHolidayDescription, setNewHolidayDescription] = useState("")
  const [selectedStaff, setSelectedStaff] = useState("")
  const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveCoverageMethod, setLeaveCoverageMethod] = useState("auto-swap")
  const [showSwapSuggestions, setShowSwapSuggestions] = useState(false)
  const [selectedSwapStaff, setSelectedSwapStaff] = useState("")
  const [showTempStaffConfig, setShowTempStaffConfig] = useState(false)
  const [tempStaffName, setTempStaffName] = useState("")
  const [tempStaffStartTime, setTempStaffStartTime] = useState("")
  const [tempStaffEndTime, setTempStaffEndTime] = useState("")
  const [tempStaffRate, setTempStaffRate] = useState("")
  const [leaveNotes, setLeaveNotes] = useState("")

  const [showHolidayModal, setShowHolidayModal] = useState(false)

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

      // Reset form and hide it
      setNewHolidayName("")
      setNewHolidayDate(format(new Date(), "yyyy-MM-dd"))
      setNewHolidayType("public")
      setNewHolidayRecurrence("none")
      setNewHolidayMultiDay(false)
      setNewHolidayEndDate("")
      setNewHolidayDescription("")
      setShowAddHolidayForm(false)
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

    if (!leaveReason.trim()) {
      toast.error("Reason required", "Please provide a reason for the leave")
      return
    }

    if (!leaveCoverageMethod) {
      toast.error("Coverage method required", "Please select a coverage method")
      return
    }

    // Validate coverage-specific requirements
    if (leaveCoverageMethod === "auto-swap" && !selectedSwapStaff) {
      toast.error("Swap selection required", "Please select a staff member for the swap")
      return
    }

    if (leaveCoverageMethod === "temp-staff" && !tempStaffName.trim()) {
      toast.error("Temp staff name required", "Please enter the temporary staff member's name")
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

      // Build coverage details message
      let coverageDetails = ""
      if (leaveCoverageMethod === "auto-swap" && selectedSwapStaff) {
        const swapStaff = STAFF_MEMBERS.find(s => s.id === selectedSwapStaff)
        coverageDetails = ` with ${swapStaff?.name || selectedSwapStaff} covering via swap`
      } else if (leaveCoverageMethod === "temp-staff" && tempStaffName) {
        coverageDetails = ` with ${tempStaffName} (temp staff) covering`
      }

      toast.success("Leave request added! ✅", `${staffName}'s ${leaveReason} leave for ${dateRange}${coverageDetails} has been scheduled`, {
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

      // Reset form and hide it
      resetLeaveForm()
      setShowAddLeaveForm(false)
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
    setShowAddHolidayForm(false)
    setShowAddLeaveForm(false)
  }

  const resetHolidayForm = () => {
    setNewHolidayName("")
    setNewHolidayDate(format(new Date(), "yyyy-MM-dd"))
    setNewHolidayType("public")
    setNewHolidayRecurrence("none")
    setNewHolidayMultiDay(false)
    setNewHolidayEndDate("")
    setNewHolidayDescription("")
  }

  const resetLeaveForm = () => {
    setSelectedStaff("")
    setLeaveStartDate(format(new Date(), "yyyy-MM-dd"))
    setLeaveEndDate(format(new Date(), "yyyy-MM-dd"))
    setLeaveReason("")
    setLeaveCoverageMethod("auto-swap")
    setShowSwapSuggestions(false)
    setSelectedSwapStaff("")
    setShowTempStaffConfig(false)
    setTempStaffName("")
    setTempStaffStartTime("")
    setTempStaffEndTime("")
    setTempStaffRate("")
    setLeaveNotes("")
  }

  const openHolidayPanel = () => {
    setShowHolidayPanel(!showHolidayPanel)
    setShowLeavePanel(false)
    setShowWarningsPanel(false)
    setShowAddLeaveForm(false)
  }

  const openLeavePanel = () => {
    setShowLeavePanel(!showLeavePanel)
    setShowHolidayPanel(false)
    setShowWarningsPanel(false)
    setShowAddHolidayForm(false)
  }

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: "p",
      description: "Toggle Holiday Panel",
      action: openHolidayPanel,
    },
    {
      key: "l",
      description: "Toggle Leave Panel",
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
        if (showAddHolidayForm) {
          handleAddHoliday()
        } else if (showAddLeaveForm) {
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
          {/* Content Categories - Notion Style */}
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
            Holiday
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
            Leave
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">
              L
            </kbd>
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

      {/* Holiday Panel - Content First, Action Second */}
      {showHolidayPanel && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Company Public Holidays 2025</h3>
            <Button 
              size="sm" 
              onClick={() => {
                if (!showAddHolidayForm) {
                  resetHolidayForm()
                }
                setShowAddHolidayForm(!showAddHolidayForm)
              }}
              className={cn(
                "gap-2 bg-blue-600 hover:bg-blue-700",
                showAddHolidayForm && "bg-blue-700"
              )}
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          </div>

          {/* Add Holiday Form - Shown when user clicks Add Holiday */}
          {showAddHolidayForm && (
            <div className="mb-4 p-4 bg-white border border-blue-200 rounded-lg shadow-sm">
              <div className="space-y-4">
                {/* Primary Fields Row */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Holiday Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      ref={holidayNameInputRef}
                      placeholder="e.g., Christmas Day, New Year's Day"
                      className="h-8 text-sm"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddHoliday()
                        } else if (e.key === "Escape") {
                          e.preventDefault()
                          setShowAddHolidayForm(false)
                        }
                      }}
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Secondary Fields Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Holiday Type
                    </label>
                    <select 
                      className="w-full h-8 px-3 text-sm border border-gray-300 rounded-md bg-white"
                      value={newHolidayType}
                      onChange={(e) => setNewHolidayType(e.target.value)}
                    >
                      <option value="public">Public Holiday</option>
                      <option value="company">Company Holiday</option>
                      <option value="religious">Religious Holiday</option>
                      <option value="national">National Holiday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Recurrence
                    </label>
                    <select 
                      className="w-full h-8 px-3 text-sm border border-gray-300 rounded-md bg-white"
                      value={newHolidayRecurrence}
                      onChange={(e) => setNewHolidayRecurrence(e.target.value)}
                    >
                      <option value="none">No Recurrence</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom Pattern</option>
                    </select>
                  </div>
                </div>

                {/* Multi-day Toggle & End Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="multiDay"
                      checked={newHolidayMultiDay}
                      onChange={(e) => {
                        setNewHolidayMultiDay(e.target.checked)
                        if (e.target.checked && newHolidayDate) {
                          const nextDay = addDays(new Date(newHolidayDate), 1)
                          setNewHolidayEndDate(format(nextDay, "yyyy-MM-dd"))
                        } else {
                          setNewHolidayEndDate("")
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                    <label htmlFor="multiDay" className="text-xs text-gray-700 cursor-pointer">
                      Multi-day holiday
                    </label>
                  </div>
                  
                  {newHolidayMultiDay && (
                    <div className="pl-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        className="w-40 h-8 text-sm"
                        value={newHolidayEndDate}
                        onChange={(e) => setNewHolidayEndDate(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Additional notes about this holiday..."
                      rows={2}
                      value={newHolidayDescription}
                      onChange={(e) => setNewHolidayDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                    />
                  </div>
                </div>

                {/* Coverage Impact Warning - Only show for public holidays */}
                {newHolidayType === "public" && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-medium text-amber-900">Coverage Impact</div>
                      <div className="text-amber-700 mt-1">
                        This public holiday will affect all staff schedules. Ensure adequate coverage is planned.
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">Press Enter to save, Esc to cancel</div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        resetHolidayForm()
                        setShowAddHolidayForm(false)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleAddHoliday}>
                      <Calendar className="h-3 w-3 mr-1" />
                      Add Holiday
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Holidays List */}
          <div className="space-y-2">
            {publicHolidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No public holidays added yet</p>
                <p className="text-xs mt-1">Click "Add Holiday" to get started</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {publicHolidays.map((holiday, index) => {
                  const holidayName = holiday.name
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded border text-sm hover:border-gray-300 transition-colors">
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
            )}
          </div>
        </div>
      )}

      {/* Leave Panel - Content First, Action Second */}
      {showLeavePanel && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Active Leave Requests</h3>
            <Button 
              size="sm" 
              onClick={() => {
                if (!showAddLeaveForm) {
                  resetLeaveForm()
                }
                setShowAddLeaveForm(!showAddLeaveForm)
              }}
              className={cn(
                "gap-2 bg-green-600 hover:bg-green-700",
                showAddLeaveForm && "bg-green-700"
              )}
            >
              <Plus className="h-4 w-4" />
              Add Leave
            </Button>
          </div>

          {/* Add Leave Form - Shown when user clicks Add Leave */}
          {showAddLeaveForm && (
            <div className="mb-4 p-4 bg-white border border-green-200 rounded-lg shadow-sm">
              <div className="space-y-4">
                {/* Primary Fields Section */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Staff Member <span className="text-red-500">*</span>
                      </label>
                      <select
                        ref={staffSelectRef}
                        className="w-full h-8 px-3 text-sm border border-gray-300 rounded-md bg-white"
                        value={selectedStaff}
                        onChange={(e) => setSelectedStaff(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddLeave()
                          } else if (e.key === "Escape") {
                            e.preventDefault()
                            setShowAddLeaveForm(false)
                          }
                        }}
                      >
                        <option value="">Select Staff</option>
                        {STAFF_MEMBERS.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} - {staff.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g., Family vacation"
                        className="h-8 text-sm"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Coverage Method Selection - Required */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Coverage Method <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="autoSwap"
                        name="coverageMethod"
                        value="auto-swap"
                        checked={leaveCoverageMethod === "auto-swap"}
                        onChange={(e) => setLeaveCoverageMethod(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="autoSwap" className="text-xs text-gray-700 cursor-pointer flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3 text-blue-600" />
                        Auto-swap with colleague
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Same Role</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="tempStaff"
                        name="coverageMethod"
                        value="temp-staff"
                        checked={leaveCoverageMethod === "temp-staff"}
                        onChange={(e) => setLeaveCoverageMethod(e.target.value)}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <label htmlFor="tempStaff" className="text-xs text-gray-700 cursor-pointer flex items-center gap-1">
                        <Plus className="h-3 w-3 text-green-600" />
                        Use temporary staff
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">Custom Coverage</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Auto-swap Options */}
                {leaveCoverageMethod === "auto-swap" && selectedStaff && (
                  <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-blue-900">Swap Suggestions</h4>
                      <button
                        type="button"
                        onClick={() => setShowSwapSuggestions(!showSwapSuggestions)}
                        className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1"
                      >
                        {showSwapSuggestions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {showSwapSuggestions ? "Hide" : "Show"} Options
                      </button>
                    </div>
                    
                    {showSwapSuggestions && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        <div className="text-xs text-blue-700">Role-matched staff available for swap:</div>
                        {STAFF_MEMBERS
                          .filter(staff => staff.id !== selectedStaff && staff.role === STAFF_MEMBERS.find(s => s.id === selectedStaff)?.role)
                          .slice(0, 3)
                          .map((staff) => (
                            <div key={staff.id} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="swapStaff"
                                  value={staff.id}
                                  checked={selectedSwapStaff === staff.id}
                                  onChange={(e) => setSelectedSwapStaff(e.target.value)}
                                  className="w-3 h-3"
                                />
                                <span className="font-medium">{staff.name}</span>
                                <span className="text-gray-500">{staff.weeklyHours}h/week</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">Available</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Temp Staff Configuration */}
                {leaveCoverageMethod === "temp-staff" && (
                  <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-green-900">Temporary Staff Details</h4>
                      <button
                        type="button"
                        onClick={() => setShowTempStaffConfig(!showTempStaffConfig)}
                        className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1"
                      >
                        {showTempStaffConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {showTempStaffConfig ? "Hide" : "Show"} Config
                      </button>
                    </div>
                    
                    {showTempStaffConfig && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                              placeholder="Enter temp staff name"
                              className="h-7 text-xs"
                              value={tempStaffName}
                              onChange={(e) => setTempStaffName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                            <select className="w-full h-7 px-2 text-xs border border-gray-300 rounded-md bg-white">
                              <option value="Pharmacist">Pharmacist</option>
                              <option value="Assistant Pharmacist">Assistant Pharmacist</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                            <Input
                              type="time"
                              className="h-7 text-xs"
                              value={tempStaffStartTime}
                              onChange={(e) => setTempStaffStartTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                            <Input
                              type="time"
                              className="h-7 text-xs"
                              value={tempStaffEndTime}
                              onChange={(e) => setTempStaffEndTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rate (£)</label>
                            <Input
                              type="number"
                              step="0.50"
                              className="h-7 text-xs"
                              value={tempStaffRate}
                              onChange={(e) => setTempStaffRate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Any additional information..."
                    rows={2}
                    value={leaveNotes}
                    onChange={(e) => setLeaveNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                  />
                </div>

                {/* Coverage Impact Warning */}
                {selectedStaff && leaveCoverageMethod && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <div className="font-medium text-amber-900">Coverage Impact</div>
                      <div className="text-amber-700 mt-1">
                        {leaveCoverageMethod === "auto-swap" 
                          ? "This leave will require a colleague swap. Ensure both staff members agree to the arrangement."
                          : "This leave will use temporary staff. Ensure proper onboarding and coverage arrangements."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">Press Enter to save, Esc to cancel</div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        resetLeaveForm()
                        setShowAddLeaveForm(false)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAddLeave}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Leave
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Leave Requests List */}
          <div className="space-y-2">
            {annualLeave.length === 0 || annualLeave.every(leave => leave.dates.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave requests added yet</p>
                <p className="text-xs mt-1">Click "Add Leave" to get started</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {annualLeave.flatMap((leave) => 
                  leave.dates.map((date, dateIndex) => {
                    const staffMember = STAFF_MEMBERS.find(s => s.id === leave.staffId)
                    const staffName = staffMember?.name || leave.staffId
                    
                    return (
                      <div key={`${leave.staffId}-${dateIndex}`} className="flex items-center justify-between p-3 bg-white rounded border text-sm hover:border-gray-300 transition-colors">
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
            )}
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
