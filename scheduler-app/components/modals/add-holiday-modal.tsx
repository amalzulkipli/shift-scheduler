"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { FormField, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, AlertCircle } from "lucide-react"
import { format, addDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useScheduleStore } from "@/hooks/use-schedule-store"

interface AddHolidayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
}

const HOLIDAY_TYPES = [
  { value: "public", label: "Public Holiday", description: "Affects all staff" },
  { value: "company", label: "Company Holiday", description: "Company-specific closure" },
  { value: "religious", label: "Religious Holiday", description: "Optional observance" },
  { value: "national", label: "National Holiday", description: "Government declared" },
]

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No Recurrence" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Pattern" },
]

export function AddHolidayModal({ open, onOpenChange, defaultDate }: AddHolidayModalProps) {
  const { addPublicHoliday } = useScheduleStore()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    date: defaultDate || format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    type: "public",
    recurrence: "none",
    description: "",
    affectedStaff: "all",
    isMultiDay: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        date: defaultDate || format(new Date(), "yyyy-MM-dd"),
        endDate: "",
        type: "public",
        recurrence: "none",
        description: "",
        affectedStaff: "all",
        isMultiDay: false,
      })
      setErrors({})
      setIsSubmitting(false)
    }
  }, [open, defaultDate])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Holiday name is required"
    }

    if (!formData.date) {
      newErrors.date = "Date is required"
    }

    if (formData.isMultiDay && !formData.endDate) {
      newErrors.endDate = "End date is required for multi-day holidays"
    }

    if (formData.isMultiDay && formData.endDate && formData.endDate <= formData.date) {
      newErrors.endDate = "End date must be after start date"
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
      // The holiday date needs to be a Date object, not a string
      const holidayDate = new Date(formData.date)
      // Adjust for timezone offset to prevent off-by-one day errors
      const timezoneOffset = holidayDate.getTimezoneOffset() * 60000
      const adjustedDate = new Date(holidayDate.getTime() + timezoneOffset)

      addPublicHoliday(adjustedDate)

      const dateRange = formData.isMultiDay
        ? `${format(new Date(formData.date), "MMM d")} - ${format(new Date(formData.endDate), "MMM d, yyyy")}`
        : format(new Date(formData.date), "MMM d, yyyy")

      toast.success("Holiday Added Successfully! 🎉", `${formData.name} has been scheduled for ${dateRange}`, {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: () => toast.info("Holiday Removed", `${formData.name} has been removed`),
        },
      })

      // Close modal after successful submission
      onOpenChange(false)
    } catch (error) {
      toast.error("Error Adding Holiday", "Failed to add holiday. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMultiDayToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isMultiDay: checked,
      endDate: checked ? format(addDays(new Date(prev.date), 1), "yyyy-MM-dd") : "",
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl relative z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Add Public Holiday
          </DialogTitle>
          <DialogDescription>
            Add a new holiday to the schedule. This will affect staff scheduling and coverage planning.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Holiday Name */}
            <FormField>
              <FormLabel htmlFor="holiday-name" required>
                Holiday Name
              </FormLabel>
              <FormControl>
                <Input
                  id="holiday-name"
                  placeholder="e.g., Christmas Day, New Year's Day"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={cn(
                    "transition-all duration-200",
                    errors.name ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500",
                  )}
                  autoFocus
                />
              </FormControl>
              {errors.name && <FormMessage className="animate-in slide-in-from-top-1">{errors.name}</FormMessage>}
            </FormField>

            {/* Holiday Type */}
            <FormField>
              <FormLabel>Holiday Type</FormLabel>
              <FormControl>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select holiday type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="w-full">
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormField>

            {/* Multi-day Toggle */}
            <FormField>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="multi-day"
                  checked={formData.isMultiDay}
                  onChange={(e) => handleMultiDayToggle(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                />
                <FormLabel htmlFor="multi-day" className="cursor-pointer">
                  Multi-day holiday
                </FormLabel>
              </div>
              <FormDescription>Check this if the holiday spans multiple consecutive days</FormDescription>
            </FormField>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel htmlFor="start-date" required>
                  {formData.isMultiDay ? "Start Date" : "Date"}
                </FormLabel>
                <FormControl>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className={cn(
                      "transition-all duration-200",
                      errors.date ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500",
                    )}
                  />
                </FormControl>
                {errors.date && <FormMessage className="animate-in slide-in-from-top-1">{errors.date}</FormMessage>}
              </FormField>

              {formData.isMultiDay && (
                <FormField className="animate-in slide-in-from-right-2">
                  <FormLabel htmlFor="end-date" required>
                    End Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="end-date"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                      className={cn(
                        "transition-all duration-200",
                        errors.endDate ? "border-red-500 bg-red-50" : "hover:border-gray-400 focus:border-blue-500",
                      )}
                    />
                  </FormControl>
                  {errors.endDate && (
                    <FormMessage className="animate-in slide-in-from-top-1">{errors.endDate}</FormMessage>
                  )}
                </FormField>
              )}
            </div>

            {/* Recurrence */}
            <FormField>
              <FormLabel>Recurrence</FormLabel>
              <FormControl>
                <Select
                  value={formData.recurrence}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, recurrence: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="font-medium text-sm">{option.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Set if this holiday repeats annually or follows a custom pattern</FormDescription>
            </FormField>

            {/* Description */}
            <FormField>
              <FormLabel htmlFor="description">Description (Optional)</FormLabel>
              <FormControl>
                <textarea
                  id="description"
                  placeholder="Additional notes about this holiday..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                />
              </FormControl>
            </FormField>

            {/* Coverage Impact Warning */}
            {formData.type === "public" && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-amber-900">Coverage Impact</div>
                  <div className="text-amber-700 mt-1">
                    This public holiday will affect all staff schedules. Ensure adequate coverage is planned for the
                    days before and after.
                  </div>
                </div>
              </div>
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
            disabled={isSubmitting || !formData.name.trim()}
            className={cn(
              "bg-blue-600 hover:bg-blue-700 transition-all duration-200",
              isSubmitting && "animate-pulse",
              !formData.name.trim() && "opacity-50 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Adding Holiday...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Add Holiday
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
