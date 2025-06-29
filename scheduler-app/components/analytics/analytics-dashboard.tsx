"use client"

import { useState } from "react"
import { format, subMonths, addMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StaffHoursGrid } from "./staff-hours-grid"

export function AnalyticsDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const currentMonth = format(selectedDate, "MMMM yyyy")
  const currentYear = selectedDate.getFullYear()

  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1))
  }

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1))
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Hours Analytics</h1>
              <p className="text-gray-600 mt-1">Track staff hours, overtime, and compliance</p>
            </div>

          </div>
        </div>

        {/* Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between bg-white rounded-lg border p-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[140px] text-center">
                  <h2 className="font-semibold text-lg">{currentMonth}</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Year Selector */}
              <Select 
                value={currentYear.toString()} 
                onValueChange={(value) => {
                  const newDate = new Date(selectedDate)
                  newDate.setFullYear(parseInt(value))
                  setSelectedDate(newDate)
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>
        </div>



        {/* Staff Hours Data Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Hours Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffHoursGrid 
              viewType="monthly" 
              selectedDate={selectedDate} 
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 