"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { 
  User, 
  Calendar, 
  AlertCircle, 
  Plus, 
  Users, 
  ArrowRightLeft, 
  UserPlus, 
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useScheduleStore } from "@/hooks/use-schedule-store"
import { STAFF_MEMBERS } from "@/lib/staff-data"
import { AnnualLeave } from "@/types/schedule"
import { useToast } from "@/hooks/use-toast"

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface AddLeaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStaffId?: string
  defaultDate?: string
  editLeave?: AnnualLeave
  editDate?: Date
}

interface FormData {
  staffId: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  isHalfDay: boolean
  halfDayPeriod: string
  requestedBy: string
  priority: string
  notes: string
}

type CoverageMethod = "auto-swap" | "temp-staff" | "decide-later"

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

export function AddLeaveModal({
  open,
  onOpenChange,
  defaultStaffId = "",
  defaultDate = "",
  editLeave,
  editDate,
}: AddLeaveModalProps) {
  const { addAnnualLeave, addSwap } = useScheduleStore()
  const { addToast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    staffId: defaultStaffId,
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

  const [coverageMethod, setCoverageMethod] = useState<CoverageMethod | "">("")
  const [selectedSwap, setSelectedSwap] = useState<string | null>(null)
  const [customSwapDate, setCustomSwapDate] = useState("")
  const [tempStaffConfig, setTempStaffConfig] = useState<TempStaffConfig>({
    name: "",
    role: "Pharmacist",
    startTime: "09:15",
    endTime: "21:45",
    hourlyRate: 45,
    notes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [swapSuggestions, setSwapSuggestions] = useState<SwapSuggestion[]>([])
  
  // UI state for collapsible sections
  const [isCoverageOpen, setIsCoverageOpen] = useState(true)
  const [isSwapSectionOpen, setIsSwapSectionOpen] = useState(true)
  const [isTempStaffSectionOpen, setIsTempStaffSectionOpen] = useState(true)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editLeave && editDate) {
        // Pre-populate form with existing leave data
        setFormData({
          staffId: editLeave.staffId,
          leaveType: "annual",
          startDate: format(editDate, "yyyy-MM-dd"),
          endDate: format(editDate, "yyyy-MM-dd"),
          reason: editLeave.reason || "",
          isHalfDay: false,
          halfDayPeriod: "morning",
          requestedBy: "staff",
          priority: "normal",
          notes: "",
        })
        setCoverageMethod(editLeave.coverageMethod || "")
        if (editLeave.tempStaff) {
          setTempStaffConfig(editLeave.tempStaff)
        }
      } else {
        // New leave request
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
        setCoverageMethod("")
        setTempStaffConfig({
          name: "",
          role: "Pharmacist",
          startTime: "09:15",
          endTime: "21:45",
          hourlyRate: 45,
          notes: ""
        })
      }
      setSelectedSwap(null)
      setCustomSwapDate("")
      setErrors({})
      setSwapSuggestions([])
    }
  }, [open, defaultStaffId, defaultDate, editLeave, editDate])

  // Find selected staff member
  const selectedStaff = STAFF_MEMBERS.find(staff => staff.id === formData.staffId)

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
      
      // Suggest 2-3 dates in the same week
      for (let i = 0; i < 7 && suggestions.length < 6; i++) {
        const suggestedDate = addDays(weekStart, i)
        if (suggestedDate.getTime() !== leaveDate.getTime()) {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.staffId) {
      newErrors.staffId = "Please select a staff member"
    }

    if (!formData.startDate) {
      newErrors.startDate = "Please select a start date"
    }

    if (!formData.endDate) {
      newErrors.endDate = "Please select an end date"
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = "End date must be after start date"
    }

    // Reason is optional - no validation needed
    // if (!formData.reason.trim()) {
    //   newErrors.reason = "Please provide a reason for the leave"
    // }

    // Coverage method is required
    if (!coverageMethod) {
      newErrors.coverage = "Please select a coverage method"
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
    // decide-later requires no additional validation

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted", formData)

    if (!validateForm()) {
      console.log("Validation failed", errors)
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate the date range
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      // Add leave for each date in the range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        console.log("Adding leave for date:", currentDate)
        
        // Determine coverage data based on method
        let tempStaffData = undefined
        let swapIdData = undefined
        
        if (coverageMethod === "temp-staff") {
          tempStaffData = tempStaffConfig
        }
        
        addAnnualLeave(
          formData.staffId, 
          new Date(currentDate), 
          coverageMethod,
          tempStaffData,
          swapIdData,
          formData.reason || "Annual Leave"
        )
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Handle coverage based on method
      let coverageDetails = ""
      if (coverageMethod === "auto-swap" && selectedSwap) {
        const swap = swapSuggestions.find(s => s.id === selectedSwap)
        if (swap) {
          // Implement actual swap logic - bidirectional swap
          const swapId = addSwap(formData.staffId, swap.staffId, startDate, swap.swapDate)
          coverageDetails = ` with ${swap.staffName} covering via swap on ${format(swap.swapDate, 'MMM d')}`
          
          console.log(`Swap created: ${swapId}`)
          console.log(`${formData.staffId} (${selectedStaff?.name}) takes leave on ${format(startDate, 'MMM d')}`)
          console.log(`${swap.staffId} (${swap.staffName}) covers on ${format(startDate, 'MMM d')}`)
          console.log(`${formData.staffId} (${selectedStaff?.name}) covers ${swap.staffId} (${swap.staffName}) on ${format(swap.swapDate, 'MMM d')}`)
        }
      } else if (coverageMethod === "temp-staff") {
        coverageDetails = ` with ${tempStaffConfig.name} (temp ${tempStaffConfig.role}) covering`
        // Note: Temp staff logic would be implemented here in a real system
        console.log(`Temp staff arranged: ${tempStaffConfig.name} (${tempStaffConfig.role})`)
      } else if (coverageMethod === "decide-later") {
        coverageDetails = " - coverage to be decided later"
        console.log("Leave added without coverage arrangement - to be decided later")
      }

      // Show success message
      const dateRangeText = startDate.getTime() === endDate.getTime() 
        ? format(startDate, "MMM d, yyyy")
        : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`

      addToast({
        title: "Leave Request Added Successfully! ✅",
        description: `${selectedStaff?.name}'s ${formData.leaveType} leave for ${dateRangeText}${coverageDetails} has been scheduled`,
        type: "success"
      })

      // Close modal and reset
      onOpenChange(false)
      console.log("Leave added successfully")

    } catch (error) {
      console.error("Error adding leave:", error)
      addToast({
        title: "Error Adding Leave",
        description: "There was a problem adding the leave request. Please try again.",
        type: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            {editLeave ? "Edit Leave" : "Add Leave"}
          </DialogTitle>
          <DialogDescription>
            {editLeave ? "Edit this leave request and update coverage arrangements." : "Add a new leave request to the schedule. This will affect staff scheduling and coverage planning."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
            {/* Basic Leave Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-4 w-4" />
                  Leave Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Staff Member Selection */}
                <div className="space-y-2">
                  <Label htmlFor="staff">
                    Staff Member <span className="text-red-500">*</span>
                  </Label>
                <Select
                  value={formData.staffId}
                    onValueChange={(value) => updateFormData("staffId", value)}
                >
                    <SelectTrigger className={cn(errors.staffId && "border-red-500")}>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                  {STAFF_MEMBERS.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium">{staff.name}</span>
                              <span className="text-xs text-muted-foreground">
                            {staff.role} • {staff.weeklyHours}h/week
                              </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                  {errors.staffId && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.staffId}
                    </p>
                  )}
                </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                  <Input
                      id="startDate"
                    type="date"
                    value={formData.startDate}
                      onChange={(e) => updateFormData("startDate", e.target.value)}
                      className={cn(
                        "transition-all duration-200",
                        errors.startDate ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                      )}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateFormData("endDate", e.target.value)}
                      className={cn(
                        "transition-all duration-200",
                        errors.endDate ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                      )}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.endDate}
                      </p>
                    )}
                  </div>
            </div>

            {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Reason <span className="text-gray-400">(optional)</span>
                  </Label>
                <Input
                  id="reason"
                    placeholder="e.g., Family vacation"
                  value={formData.reason}
                    onChange={(e) => updateFormData("reason", e.target.value)}
                    className={cn(
                      "transition-all duration-200",
                      errors.reason ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                    )}
                  />
                  {errors.reason && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.reason}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information..."
                    value={formData.notes}
                    onChange={(e) => updateFormData("notes", e.target.value)}
                    rows={3}
                    className="transition-all duration-200 hover:border-gray-400 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coverage Method Selection */}
            {selectedStaff && (
              <Collapsible open={isCoverageOpen} onOpenChange={setIsCoverageOpen}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <CardTitle className="flex items-center justify-between cursor-pointer hover:text-blue-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Coverage Method
                          <Badge variant="outline" className="text-xs">
                            {selectedStaff.role}
                          </Badge>
                        </div>
                        {isCoverageOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <RadioGroup
                        value={coverageMethod}
                        onValueChange={(value: CoverageMethod | "") => setCoverageMethod(value)}
                        className="grid grid-cols-1 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="auto-swap" id="auto-swap" />
                          <Label htmlFor="auto-swap" className="flex items-center gap-2 cursor-pointer">
                            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                            Auto-swap with colleague
                            <Badge variant="secondary" className="text-xs">
                              Same Role
                            </Badge>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="temp-staff" id="temp-staff" />
                          <Label htmlFor="temp-staff" className="flex items-center gap-2 cursor-pointer">
                            <UserPlus className="h-4 w-4 text-green-600" />
                            Use temporary staff
                            <Badge variant="secondary" className="text-xs">
                              Custom Coverage
                            </Badge>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="decide-later" id="decide-later" />
                          <Label htmlFor="decide-later" className="flex items-center gap-2 cursor-pointer">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Decide Later / Pending
                            <Badge variant="secondary" className="text-xs">
                              No Coverage Yet
                            </Badge>
                          </Label>
                    </div>
                      </RadioGroup>

                      {errors.coverage && (
                        <p className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.coverage}
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Auto-Swap Options */}
            {selectedStaff && coverageMethod === "auto-swap" && (
              <Collapsible open={isSwapSectionOpen} onOpenChange={setIsSwapSectionOpen}>
                <Card className="animate-in slide-in-from-top-2">
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <CardTitle className="flex items-center justify-between cursor-pointer hover:text-blue-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4" />
                          Swap Suggestions
                          <Badge variant="outline" className="text-xs">
                            {swapSuggestions.length} options
                          </Badge>
                        </div>
                        {isSwapSectionOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {swapSuggestions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {swapSuggestions.slice(0, 3).map((suggestion) => (
                            <div
                              key={suggestion.id}
                              className={cn(
                                "p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                                selectedSwap === suggestion.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                              onClick={() => setSelectedSwap(suggestion.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{suggestion.staffName}</div>
                                    <div className="text-xs text-gray-500">{suggestion.reason}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("px-2 py-1 rounded text-xs border", getImpactColor(suggestion.impact))}>
                                    <div className="flex items-center gap-1">
                                      {getImpactIcon(suggestion.impact)}
                                      {suggestion.currentHours}h → {suggestion.newHours}h
                                    </div>
                    </div>
                  </div>
                </div>
              </div>
                          ))}

                          {/* Custom Date Option */}
                          <div className="border-t pt-3">
                            <div className="space-y-2">
                              <Label htmlFor="customSwapDate" className="text-sm font-medium">
                                Or choose a custom date:
                              </Label>
                              <Input
                                id="customSwapDate"
                                type="date"
                                value={customSwapDate}
                                onChange={(e) => setCustomSwapDate(e.target.value)}
                                className="w-full transition-all duration-200 hover:border-gray-400 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No swap suggestions available</p>
                          <p className="text-xs">Try selecting a different date or use temporary staff</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Temporary Staff Configuration */}
            {selectedStaff && coverageMethod === "temp-staff" && (
              <Collapsible open={isTempStaffSectionOpen} onOpenChange={setIsTempStaffSectionOpen}>
                <Card className="animate-in slide-in-from-top-2">
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <CardTitle className="flex items-center justify-between cursor-pointer hover:text-green-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Temporary Staff Configuration
                          <Badge variant="outline" className="text-xs">
                            {tempStaffConfig.role}
                          </Badge>
                        </div>
                        {isTempStaffSectionOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tempName">
                            Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="tempName"
                            placeholder="Enter temp staff name"
                            value={tempStaffConfig.name}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, name: e.target.value }))}
                            className={cn(
                              "transition-all duration-200",
                              errors.tempName ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                            )}
                          />
                          {errors.tempName && (
                            <p className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.tempName}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tempRole">Role</Label>
                          <Select
                            value={tempStaffConfig.role}
                            onValueChange={(value) => setTempStaffConfig(prev => ({ ...prev, role: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                              <SelectItem value="Assistant Pharmacist">Assistant Pharmacist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tempStartTime">
                            Start Time <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="tempStartTime"
                            type="time"
                            value={tempStaffConfig.startTime}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, startTime: e.target.value }))}
                            className={cn(
                              "transition-all duration-200",
                              errors.tempTime ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tempEndTime">
                            End Time <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="tempEndTime"
                            type="time"
                            value={tempStaffConfig.endTime}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, endTime: e.target.value }))}
                            className={cn(
                              "transition-all duration-200",
                              errors.tempTime ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500"
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tempRate">Hourly Rate (£)</Label>
                          <Input
                            id="tempRate"
                            type="number"
                            min="0"
                            step="0.50"
                            value={tempStaffConfig.hourlyRate}
                            onChange={(e) => setTempStaffConfig(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                            className="transition-all duration-200 hover:border-gray-400 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {errors.tempTime && (
                        <p className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.tempTime}
                        </p>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="tempNotes">Additional Notes</Label>
                        <Textarea
                          id="tempNotes"
                          placeholder="Special instructions or requirements..."
                          value={tempStaffConfig.notes}
                          onChange={(e) => setTempStaffConfig(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="transition-all duration-200 hover:border-gray-400 focus:border-blue-500"
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
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
              disabled={isSubmitting}
            className={cn(
              "bg-green-600 hover:bg-green-700 transition-all duration-200",
                isSubmitting && "animate-pulse"
            )}
          >
            {isSubmitting ? (
              <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Adding Leave...
              </>
            ) : (
              <>
                  <Plus className="h-4 w-4 mr-2" />
                Add Leave Request
              </>
            )}
          </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
