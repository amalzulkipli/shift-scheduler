"use client"

import { format, eachWeekOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns"

interface HoursChartProps {
  viewType: "weekly" | "monthly"
  selectedDate: Date
}

// Mock data generator
const generateChartData = (viewType: "weekly" | "monthly", selectedDate: Date) => {
  if (viewType === "weekly") {
    const startOfCurrentMonth = startOfMonth(selectedDate)
    const endOfCurrentMonth = endOfMonth(selectedDate)
    const weeks = eachWeekOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth })
    
    return weeks.map((week, index) => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 }) // Monday
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
      const regularHours = Math.floor(Math.random() * 100) + 300 // 300-400 hours
      const overtimeHours = Math.floor(Math.random() * 50) + 10 // 10-60 overtime hours
      
      return {
        label: `Week ${index + 1}`,
        period: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        regularHours,
        overtimeHours,
        totalHours: regularHours + overtimeHours,
        targetHours: 360 // Target for the week
      }
    })
  } else {
    // Monthly view - show each day
    const days = eachDayOfInterval({ 
      start: startOfMonth(selectedDate), 
      end: endOfMonth(selectedDate) 
    }).slice(0, 14) // Limit to first 14 days for better visualization
    
    return days.map(day => {
      const regularHours = Math.floor(Math.random() * 30) + 40 // 40-70 hours per day
      const overtimeHours = Math.floor(Math.random() * 10) // 0-10 overtime hours
      
      return {
        label: format(day, "d"),
        period: format(day, "MMM d"),
        regularHours,
        overtimeHours,
        totalHours: regularHours + overtimeHours,
        targetHours: 50 // Target hours per day
      }
    })
  }
}

export function HoursChart({ viewType, selectedDate }: HoursChartProps) {
  const data = generateChartData(viewType, selectedDate)
  const maxHours = Math.max(...data.map(d => d.totalHours))
  
  return (
    <div className="w-full h-80">
      {/* Chart Title */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          {viewType === "weekly" ? "Weekly Hours Distribution" : "Daily Hours Distribution"}
        </h3>
        <p className="text-xs text-gray-500">
          {viewType === "weekly" ? "Hours per week this month" : "Hours per day (first 14 days)"}
        </p>
      </div>

      {/* Simple Bar Chart */}
      <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gray-50 rounded-lg">
        {data.map((item, index) => {
          const regularHeight = (item.regularHours / maxHours) * 100
          const overtimeHeight = (item.overtimeHours / maxHours) * 100
          const targetHeight = (item.targetHours / maxHours) * 100
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 max-w-16">
              {/* Bar Chart */}
              <div className="relative w-full h-48 flex flex-col justify-end">
                {/* Target line */}
                <div 
                  className="absolute w-full border-t-2 border-red-400 border-dashed opacity-50"
                  style={{ bottom: `${targetHeight}%` }}
                  title={`Target: ${item.targetHours}h`}
                />
                
                {/* Overtime Hours (top of bar) */}
                {item.overtimeHours > 0 && (
                  <div
                    className="w-full bg-orange-400 rounded-t-sm"
                    style={{ height: `${overtimeHeight}%` }}
                  />
                )}
                
                {/* Regular Hours (bottom of bar) */}
                <div
                  className={`w-full bg-blue-500 ${item.overtimeHours === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`}
                  style={{ height: `${regularHeight}%` }}
                />
              </div>
              
              {/* Label */}
              <div className="mt-2 text-center">
                <div className="text-xs font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.period}</div>
                <div className="text-xs font-medium text-gray-700 mt-1">
                  {item.totalHours}h
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span>Regular Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
          <span>Overtime Hours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0 border-t-2 border-red-400 border-dashed"></div>
          <span>Target</span>
        </div>
      </div>
    </div>
  )
} 