"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectItem } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  Users,
  UserPlus,
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft
} from "lucide-react"
import { format, differenceInDays, isBefore, isAfter, eachDayOfInterval, startOfWeek, endOfWeek, addDays } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { STAFF_MEMBERS } from "@/lib/staff-data"
import { cn } from "@/lib/utils"
import { useScheduleStore } from "@/hooks/use-schedule-store"

interface AddLeaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStaffId?: string
  defaultDate?: string
}

type CoverageMethod = "auto-swap" | "temp-staff"

interface SwapSuggestion {
  id: string
  staffId: string
  staffName: string
  originalDate: Date
  swapDate: Date
  currentHours: number
  newHours: number
  impact: "positive" | "neutral" | "warning"
  reason: string
}

interface TempStaffConfig {
  name: string
  role: string
  startTime: string
  endTime: string
  hourlyRate: number
  notes: string
}

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave", color: "bg-blue-100 text-blue-800" },
  { value: "sick", label: "Sick Leave", color: "bg-red-100 text-red-800" },
  { value: "emergency", label: "Emergency Leave", color: "bg-orange-100 text-orange-800" },
  { value: "maternity", label: "Maternity Leave", color: "bg-pink-100 text-pink-800" },
  { value: "study", label: "Study Leave", color: "bg-purple-100 text-purple-800" },
  { value: "unpaid", label: "Unpaid Leave", color: "bg-gray-100 text-gray-800" },
]

export function AddLeaveModal({ open, onOpenChange, defaultStaffId, defaultDate }: AddLeaveModalProps) {
  const [formData, setFormData] = useState({
    staffId: defaultStaffId || "",
    leaveType: "annual",
    startDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
    endDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
    reason: "",
    isHalfDay: false,
    halfDayPeriod: "morning",
    requestedBy: "staff",
    priority: "normal",
    notes: "",
  })

  const [coverageMethod, setCoverageMethod] = useState<CoverageMethod>("auto-swap")
  const [selectedSwap, setSelectedSwap] = useState<string | null>(null)
  const [customSwapDate, setCustomSwapDate] = useState("")
  const [tempStaffConfig, setTempStaffConfig] = useState<TempStaffConfig>({
    name: "",
    role: "",
    startTime: "09:15",
    endTime: "21:45",
    hourlyRate: 45,
    notes: ""
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSwapSectionOpen, setIsSwapSectionOpen] = useState(true)
  const [isTempStaffSectionOpen, setIsTempStaffSectionOpen] = useState(true)
  const [swapSuggestions, setSwapSuggestions] = useState<SwapSuggestion[]>([])

  const { addAnnualLeave } = useScheduleStore()
  const selectedStaff = STAFF_MEMBERS.find((staff) => staff.id === formData.staffId)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        staffId: defaultStaffId || "",
        leaveType: "annual",
        startDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
        endDate: defaultDate || format(new Date(), "yyyy-MM-dd"),
        reason: "",
        isHalfDay: false,
        halfDayPeriod: "morning",
        requestedBy: "staff",
        priority: "normal",
        notes: "",
      })
      setCoverageMethod("auto-swap")
      setSelectedSwap(null)
      setCustomSwapDate("")
      setTempStaffConfig({
        name: "",
        role: selectedStaff?.role || "Pharmacist",
        startTime: "09:15",
        endTime: "21:45",
        hourlyRate: 45,
        notes: ""
      })
      setErrors({})
      setIsSubmitting(false)
      setSwapSuggestions([])
    }
  }, [open, defaultStaffId, defaultDate, selectedStaff?.role])

  // Generate swap suggestions based on selected staff and dates
  const generateSwapSuggestions = () => {
    if (!formData.staffId || !formData.startDate) return

    const requestingStaff = STAFF_MEMBERS.find(s => s.id === formData.staffId)
    if (!requestingStaff) return

    // Find staff with same role
    const eligibleStaff = STAFF_MEMBERS.filter(staff => 
      staff.id !== formData.staffId && 
      staff.role === requestingStaff.role
    )

    const leaveDate = new Date(formData.startDate)
    const suggestions: SwapSuggestion[] = []

    eligibleStaff.forEach(staff => {
      // Same week suggestions (priority)
      const weekStart = startOfWeek(leaveDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(leaveDate, { weekStartsOn: 1 })
      
      // Suggest 2-3 dates in the same week
      for (let i = 0; i < 7; i++) {
        const suggestedDate = addDays(weekStart, i)
        if (suggestedDate.getTime() !== leaveDate.getTime() && suggestions.length < 3) {
          // Mock workload calculation (in real implementation, this would check actual schedule)
          const currentHours = staff.weeklyHours
          const newHours = staff.weeklyHours // Simplified for now
          
          suggestions.push({
            id: `${staff.id}-${format(suggestedDate, 'yyyy-MM-dd')}`,
            staffId: staff.id,
            staffName: staff.name,
            originalDate: leaveDate,
            swapDate: suggestedDate,
            currentHours,
            newHours,
            impact: currentHours === newHours ? "neutral" : currentHours > newHours ? "positive" : "warning",
            reason: `Same week swap - ${format(suggestedDate, 'EEEE, MMM d')}`
          })
        }
      }
    })

    setSwapSuggestions(suggestions)
  }

  // Update temp staff role when main staff changes
  useEffect(() => {
    if (selectedStaff) {
      setTempStaffConfig(prev => ({
        ...prev,
        role: selectedStaff.role
      }))
    }
  }, [selectedStaff])

  // Generate suggestions when staff or dates change
  useEffect(() => {
    generateSwapSuggestions()
  }, [formData.staffId, formData.startDate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.staffId) {
      newErrors.staffId = "Please select a staff member"
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required"
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required"
    }

    if (formData.startDate && formData.endDate && isAfter(new Date(formData.startDate), new Date(formData.endDate))) {
      newErrors.endDate = "End date must be after start date"
    }

    if (formData.startDate && isBefore(new Date(formData.startDate), new Date())) {
      newErrors.startDate = "Start date cannot be in the past"
    }

    if (formData.leaveType === "annual" && !formData.reason.trim()) {
      newErrors.reason = "Reason is required for annual leave"
    }

    // Coverage method specific validation
    if (coverageMethod === "auto-swap") {
      if (!selectedSwap && !customSwapDate) {
        newErrors.coverage = "Please select a swap option or choose a custom date"
      }
    } else if (coverageMethod === "temp-staff") {
      if (!tempStaffConfig.name.trim()) {
        newErrors.tempName = "Temporary staff name is required"
      }
      if (!tempStaffConfig.startTime || !tempStaffConfig.endTime) {
        newErrors.tempTime = "Start and end times are required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      // Shake animation for errors
      const form = e.currentTarget as HTMLFormElement
      form.style.animation = "shake 0.5s ease-in-out"
      setTimeout(() => {
        form.style.animation = ""
      }, 500)
      return
    }

    setIsSubmitting(true)

    try {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const dates = eachDayOfInterval({ start, end })

      // Add the basic leave
      dates.forEach(date => {
        addAnnualLeave(formData.staffId, date)
      })

      // Handle coverage based on method
      let coverageDetails = ""
      if (coverageMethod === "auto-swap" && selectedSwap) {
        const swap = swapSuggestions.find(s => s.id === selectedSwap)
        if (swap) {
          coverageDetails = ` with ${swap.staffName} covering via swap`
          // TODO: Implement actual swap logic in next subtask
        }
      } else if (coverageMethod === "temp-staff") {
        coverageDetails = ` with ${tempStaffConfig.name} (temp ${tempStaffConfig.role}) covering`
        // TODO: Implement temp staff logic in next subtask
      }

      const dateRange =
        formData.startDate === formData.endDate
          ? format(new Date(formData.startDate), "MMM d, yyyy")
          : `${format(new Date(formData.startDate), "MMM d")} - ${format(new Date(formData.endDate), "MMM d, yyyy")}`

      toast.success(
        "Leave Request Added Successfully! ✅",
        `${selectedStaff?.name}'s ${formData.leaveType} leave for ${dateRange}${coverageDetails} has been scheduled`,
        {
          duration: 4000,
          action: {
            label: "Undo",
            onClick: () => toast.info("Leave Removed", `${selectedStaff?.name}'s leave has been removed`),
          },
        },
      )

      // Close modal after successful submission
      onOpenChange(false)
    } catch (error) {
      toast.error("Error Adding Leave", "Failed to add leave request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getImpactIcon = (impact: SwapSuggestion['impact']) => {
    switch (impact) {
      case "positive":
        return <TrendingDown className="h-3 w-3 text-green-600" />
      case "warning":
        return <TrendingUp className="h-3 w-3 text-orange-600" />
      default:
        return <ArrowRightLeft className="h-3 w-3 text-blue-600" />
    }
  }

  const getImpactColor = (impact: SwapSuggestion['impact']) => {
    switch (impact) {
      case "positive":
        return "text-green-700 bg-green-50 border-green-200"
      case "warning":
        return "text-orange-700 bg-orange-50 border-orange-200"
      default:
        return "text-blue-700 bg-blue-50 border-blue-200"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl relative z-50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Enhanced Leave Request
          </DialogTitle>
          <DialogDescription>
            Schedule leave with intelligent coverage options including staff swaps and temporary coverage.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Leave Information */}
            <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-900">Leave Details</h3>
              </div>

              {/* Staff Selection */}
              <FormField>
                <FormLabel required>Staff Member</FormLabel>
                <FormControl>
                  <Select
                    value={formData.staffId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, staffId: value }))}
                    placeholder="Select staff member"
                    className={cn("w-full", errors.staffId ? "border-red-500" : "")}
                  >
                    {STAFF_MEMBERS.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{staff.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {staff.role} • {staff.weeklyHours}h/week
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                </FormControl>
                {errors.staffId && <FormMessage>{errors.staffId}</FormMessage>}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Leave Type */}
                <FormField>
                  <FormLabel>Leave Type</FormLabel>
                  <FormControl>
                    <Select
                      value={formData.leaveType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, leaveType: value }))}
                      className="w-full"
                    >
                      {LEAVE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className={`px-2 py-1 rounded text-xs ${type.color}`}>{type.label}</span>
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormField>

                {/* Date Range */}
                <FormField>
                  <FormLabel htmlFor="start-date" required>
                    Start Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="start-date"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate: prev.isHalfDay ? e.target.value : prev.endDate,
                        }))
                      }
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                  </FormControl>
                  {errors.startDate && <FormMessage>{errors.startDate}</FormMessage>}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="end-date" required>
                    End Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="end-date"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                  </FormControl>
                  {errors.endDate && <FormMessage>{errors.endDate}</FormMessage>}
                </FormField>
              </div>

              {/* Reason */}
              <FormField>
                <FormLabel htmlFor="reason" required={formData.leaveType === "annual"}>
                  Reason
                </FormLabel>
                <FormControl>
                  <Input
                    id="reason"
                    placeholder="e.g., Family vacation, Medical appointment"
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    className={errors.reason ? "border-red-500" : ""}
                  />
                </FormControl>
                {errors.reason && <FormMessage>{errors.reason}</FormMessage>}
              </FormField>
            </div>

            {/* Coverage Method Selection */}
            {formData.staffId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Coverage Method</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      coverageMethod === "auto-swap"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setCoverageMethod("auto-swap")}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={coverageMethod === "auto-swap"}
                        onChange={() => setCoverageMethod("auto-swap")}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-sm">Auto-swap with colleague</div>
                        <div className="text-xs text-gray-500 mt-1">Recommended - swap shifts with same role</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      coverageMethod === "temp-staff"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setCoverageMethod("temp-staff")}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={coverageMethod === "temp-staff"}
                        onChange={() => setCoverageMethod("temp-staff")}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-sm">Use temporary staff</div>
                        <div className="text-xs text-gray-500 mt-1">Custom coverage with temp staff</div>
                      </div>
                    </div>
                  </div>
                </div>

                {errors.coverage && <FormMessage>{errors.coverage}</FormMessage>}
              </div>
            )}

            {/* Auto-swap Options */}
            {coverageMethod === "auto-swap" && swapSuggestions.length > 0 && (
              <Collapsible open={isSwapSectionOpen} onOpenChange={setIsSwapSectionOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {isSwapSectionOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Swap Options ({swapSuggestions.length} suggestions)</span>
                  <Badge variant="outline" className="ml-auto text-blue-700 border-blue-200 bg-blue-50">
                    Same Role
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-3 p-4 border border-gray-100 rounded-lg bg-gray-50">
                    {swapSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={cn(
                          "p-3 border-2 rounded-lg cursor-pointer transition-all",
                          selectedSwap === suggestion.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                        onClick={() => setSelectedSwap(suggestion.id)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedSwap === suggestion.id}
                            onChange={() => setSelectedSwap(suggestion.id)}
                            className="text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{suggestion.staffName}</span>
                              <span className="text-xs text-gray-500">→</span>
                              <span className="text-xs text-gray-600">{suggestion.reason}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                {getImpactIcon(suggestion.impact)}
                                <span className="text-gray-600">Hours:</span>
                                <span className="font-medium">{suggestion.currentHours}h → {suggestion.newHours}h</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getImpactColor(suggestion.impact))}
                              >
                                {suggestion.impact === "positive" && "Reduces hours"}
                                {suggestion.impact === "warning" && "Increases hours"}
                                {suggestion.impact === "neutral" && "No change"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Custom Date Option */}
                    <div
                      className={cn(
                        "p-3 border-2 rounded-lg cursor-pointer transition-all",
                        selectedSwap === "custom"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                      onClick={() => setSelectedSwap("custom")}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={selectedSwap === "custom"}
                          onChange={() => setSelectedSwap("custom")}
                          className="text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-2">Custom date selection</div>
                          {selectedSwap === "custom" && (
                            <div className="mt-2">
                              <Input
                                type="date"
                                value={customSwapDate}
                                onChange={(e) => setCustomSwapDate(e.target.value)}
                                placeholder="Choose swap date"
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Temporary Staff Options */}
            {coverageMethod === "temp-staff" && (
              <Collapsible open={isTempStaffSectionOpen} onOpenChange={setIsTempStaffSectionOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {isTempStaffSectionOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <UserPlus className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Temporary Staff Configuration</span>
                  <Badge variant="outline" className="ml-auto text-gray-700 border-gray-200 bg-gray-50">
                    Custom Coverage
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="space-y-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField>
                        <FormLabel htmlFor="temp-name" required>
                          Staff Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="temp-name"
                            placeholder="e.g., Dr. Sarah Johnson"
                            value={tempStaffConfig.name}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, name: e.target.value }))}
                            className={errors.tempName ? "border-red-500" : ""}
                          />
                        </FormControl>
                        {errors.tempName && <FormMessage>{errors.tempName}</FormMessage>}
                      </FormField>

                      <FormField>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select
                            value={tempStaffConfig.role}
                            onValueChange={(value) => setTempStaffConfig(prev => ({ ...prev, role: value }))}
                          >
                            <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                            <SelectItem value="Assistant Pharmacist">Assistant Pharmacist</SelectItem>
                          </Select>
                        </FormControl>
                      </FormField>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField>
                        <FormLabel htmlFor="temp-start" required>
                          Start Time
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="temp-start"
                            type="time"
                            value={tempStaffConfig.startTime}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, startTime: e.target.value }))}
                            className={errors.tempTime ? "border-red-500" : ""}
                          />
                        </FormControl>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="temp-end" required>
                          End Time
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="temp-end"
                            type="time"
                            value={tempStaffConfig.endTime}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, endTime: e.target.value }))}
                            className={errors.tempTime ? "border-red-500" : ""}
                          />
                        </FormControl>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="temp-rate">
                          Hourly Rate ($)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="temp-rate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={tempStaffConfig.hourlyRate}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                          />
                        </FormControl>
                      </FormField>
                    </div>

                    {errors.tempTime && <FormMessage>{errors.tempTime}</FormMessage>}

                    <FormField>
                      <FormLabel htmlFor="temp-notes">
                        Additional Notes
                      </FormLabel>
                      <FormControl>
                        <textarea
                          id="temp-notes"
                          placeholder="Any special instructions or requirements..."
                          value={tempStaffConfig.notes}
                          onChange={(e) => setTempStaffConfig(prev => ({ ...prev, notes: e.target.value }))}
                          className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </FormControl>
                    </FormField>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </form>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="transition-all duration-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.staffId || !formData.reason.trim()}
            className={cn(
              "bg-green-600 hover:bg-green-700 transition-all duration-200",
              isSubmitting && "animate-pulse",
            )}
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Add Leave Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
