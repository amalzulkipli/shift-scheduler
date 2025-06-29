"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Plus, Settings, AlertTriangle, ChevronDown, ChevronUp, ArrowRightLeft, ChevronLeft, ChevronRight, User, Trash2, Edit } from "lucide-react"
import { SAMPLE_WARNINGS } from "@/lib/public-holidays"
import { format, subMonths, addMonths, addDays, isSameDay } from "date-fns"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddLeaveModal } from "./modals/add-leave-modal"
import { AnnualLeave } from "@/types/schedule"

export function ScheduleToolbar() {
  const { currentMonth, setCurrentMonth, publicHolidays, annualLeave, addPublicHoliday, removePublicHoliday, addAnnualLeave, removeAnnualLeave, swaps } = useScheduleStore()

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
  const [leaveCoverageMethod, setLeaveCoverageMethod] = useState("")
  const [showSwapSuggestions, setShowSwapSuggestions] = useState(false)
  const [selectedSwapStaff, setSelectedSwapStaff] = useState("")
  const [selectedSwapCustomDate, setSelectedSwapCustomDate] = useState("")
  const [showTempStaffConfig, setShowTempStaffConfig] = useState(false)
  const [tempStaffName, setTempStaffName] = useState("")
  const [tempStaffRole, setTempStaffRole] = useState("")
  const [tempStaffStartTime, setTempStaffStartTime] = useState("")
  const [tempStaffEndTime, setTempStaffEndTime] = useState("")
  const [tempStaffRate, setTempStaffRate] = useState("")
  const [tempStaffNotes, setTempStaffNotes] = useState("")
  const [leaveNotes, setLeaveNotes] = useState("")

  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [editingLeave, setEditingLeave] = useState<{ leave: AnnualLeave, date: Date } | null>(null)

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
      toast.error("Swap selection required", "Please select a staff member for the swap or choose a custom date")
      return
    }

    if (leaveCoverageMethod === "temp-staff") {
      if (!tempStaffName.trim()) {
        toast.error("Temp staff name required", "Please enter the temporary staff member's name")
        return
      }
      
      if (!tempStaffRole) {
        toast.error("Temp staff role required", "Please select the temporary staff member's role")
        return
      }
      
      if (!tempStaffStartTime || !tempStaffEndTime) {
        toast.error("Shift times required", "Please specify start and end times for the temporary staff")
        return
      }
      
      // Validate time order
      if (tempStaffStartTime >= tempStaffEndTime) {
        toast.error("Invalid shift times", "End time must be after start time")
        return
      }
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
        if (selectedSwapStaff.startsWith('custom-')) {
          const customDate = selectedSwapStaff.replace('custom-', '')
          coverageDetails = ` with custom swap date on ${new Date(customDate).toLocaleDateString()}`
        } else {
          // Extract staff name from suggestion ID
          const staffId = selectedSwapStaff.split('-')[0]
          const swapStaff = STAFF_MEMBERS.find(s => s.id === staffId)
          const swapDate = selectedSwapStaff.split('-')[1]
          coverageDetails = ` with ${swapStaff?.name || 'colleague'} covering via swap on ${new Date(swapDate).toLocaleDateString()}`
        }
      } else if (leaveCoverageMethod === "temp-staff" && tempStaffName) {
        const timeRange = tempStaffStartTime && tempStaffEndTime 
          ? ` (${tempStaffStartTime}-${tempStaffEndTime})`
          : ''
        const roleInfo = tempStaffRole ? ` as ${tempStaffRole}` : ''
        coverageDetails = ` with ${tempStaffName}${roleInfo} covering${timeRange}`
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
    setLeaveCoverageMethod("")
    setShowSwapSuggestions(false)
    setSelectedSwapStaff("")
    setSelectedSwapCustomDate("")
    setShowTempStaffConfig(false)
    setTempStaffName("")
    setTempStaffStartTime("")
    setTempStaffEndTime("")
    setTempStaffRate("")
    setTempStaffRole("")
    setTempStaffNotes("")
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

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = direction === "prev" 
      ? subMonths(currentMonth, 1) 
      : addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
  }

  const handleEditLeave = (leave: AnnualLeave, date: Date) => {
    setEditingLeave({ leave, date })
    setShowLeaveModal(true)
  }

  const handleRemoveLeave = (staffId: string, date: Date) => {
    const staffMember = STAFF_MEMBERS.find(s => s.id === staffId)
    removeAnnualLeave(staffId, date)
    toast.success("Leave Removed", `Annual leave for ${staffMember?.name} on ${format(date, 'MMM d, yyyy')} has been removed.`)
  }

  const handleLeaveModalClose = (open: boolean) => {
    setShowLeaveModal(open)
    if (!open) {
      setEditingLeave(null)
    }
  }

  const getCoverageStatus = (leave: AnnualLeave, date: Date) => {
    if (leave.coverageMethod === "auto-swap") {
      // Find the swap for this leave
      const swap = swaps.find(s => 
        (s.staffId1 === leave.staffId && isSameDay(s.date1, date)) ||
        (s.staffId2 === leave.staffId && isSameDay(s.date2, date))
      )
      if (swap) {
        const otherStaffId = swap.staffId1 === leave.staffId ? swap.staffId2 : swap.staffId1
        const otherStaff = STAFF_MEMBERS.find(s => s.id === otherStaffId)
        return {
          status: "Covered",
          details: `Swapped with ${otherStaff?.name}`,
          variant: "default" as const
        }
      }
      return {
        status: "Coverage Needed",
        details: "Auto-swap failed",
        variant: "destructive" as const
      }
    } else if (leave.coverageMethod === "temp-staff" && leave.tempStaff) {
      return {
        status: "Covered",
        details: `${leave.tempStaff.name} (Temp)`,
        variant: "default" as const
      }
    } else if (leave.coverageMethod === "decide-later") {
      return {
        status: "Coverage Needed",
        details: "Pending decision",
        variant: "secondary" as const
      }
    }
    return {
      status: "Coverage Needed",
      details: "No coverage method selected",
      variant: "destructive" as const
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Add Holiday
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Add Leave
          </Button>
        </div>
      </div>

      {/* Active Leave Requests */}
      {annualLeave.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Active Leave Requests</CardTitle>
            <CardDescription>
              Current leave requests and their coverage status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {annualLeave.map(leave => {
                const staffMember = STAFF_MEMBERS.find(s => s.id === leave.staffId)
                const coverage = getCoverageStatus(leave, leave.date)
                
                return (
                  <div
                    key={`${leave.staffId}-${leave.date.toISOString()}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          {staffMember?.name.charAt(0) || "?"}
                        </Badge>
                        <div>
                          <div className="font-medium">{staffMember?.name}</div>
                          <div className="text-sm text-gray-600">
                            {format(leave.date, 'MMM d, yyyy')}
              </div>
            </div>
                        <Badge variant={coverage.variant}>
                          {coverage.status}
                        </Badge>
                        {coverage.details && (
                          <span className="text-sm text-gray-500">
                            {coverage.details}
                          </span>
                        )}
          </div>
                      <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                          onClick={() => handleEditLeave(leave, leave.date)}
                          className="h-8 w-8 p-0"
                >
                          <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                          onClick={() => handleRemoveLeave(leave.staffId, leave.date)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                          <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
                  )
                })
              }
          </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddHolidayModal
        open={showHolidayModal}
        onOpenChange={setShowHolidayModal}
      />
      <AddLeaveModal
        open={showLeaveModal}
        onOpenChange={handleLeaveModalClose}
        editLeave={editingLeave?.leave}
        editDate={editingLeave?.date}
      />
    </div>
  )
}
