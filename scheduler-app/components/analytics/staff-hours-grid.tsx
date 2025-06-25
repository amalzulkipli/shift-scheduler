"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateAnalyticsData, getAnalyticsSummary } from "@/lib/analytics-data"
import { useScheduleStore } from "@/hooks/use-schedule-store"
import { ChevronDown, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"

interface StaffHoursGridProps {
  viewType: "weekly" | "monthly"
  selectedDate: Date
  isLoading: boolean
}

// This component now uses real schedule data instead of mock data

export function StaffHoursGrid({ viewType, selectedDate, isLoading }: StaffHoursGridProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const { publicHolidays, annualLeave } = useScheduleStore()
  const staffData = generateAnalyticsData(selectedDate, publicHolidays, annualLeave)
  const currentMonth = format(selectedDate, "MMMM yyyy")
  const summary = getAnalyticsSummary(selectedDate, publicHolidays, annualLeave)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading staff hours...</span>
      </div>
    )
  }

  const toggleRow = (staffId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId)
    } else {
      newExpanded.add(staffId)
    }
    setExpandedRows(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string, percentage: number) => {
    switch (status) {
      case "compliant":
        return <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">{percentage}%</Badge>
      case "warning":
        return <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">{percentage}%</Badge>
      case "critical":
        return <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">{percentage}%</Badge>
      default:
        return <Badge variant="outline">{percentage}%</Badge>
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full space-y-4">
        {/* Month Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Month: {currentMonth}</h3>
              <p className="text-sm text-blue-700">
                Individual targets: Fatimah/Mathilda/Pah 45h/week • Amal 32h/week • PH reallocations included
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700">
                Total Staff: <span className="font-semibold">{summary.totalStaff}</span>
              </div>
              <div className="text-sm text-blue-700">
                Issues Found: <span className="font-semibold text-red-600">
                  {summary.totalIssues}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table with Fixed Layout */}
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="divide-x">
                <TableHead className="w-[5%]" />
                <TableHead className="w-[16%]">Staff Member</TableHead>
                <TableHead className="w-[20%]">Role</TableHead>
                <TableHead className="w-[11%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Monthly Total</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total hours worked this month including regular hours and any reallocated hours from public holidays</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-[9%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Overtime</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Hours worked above individual weekly target (Fatimah/Mathilda/Pah: 45h, Amal: 32h)</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-[8%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Target</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expected monthly hours based on individual weekly targets (varies by staff member)</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-[11%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Compliance</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Percentage of target hours achieved (Monthly Total ÷ Target × 100%)</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-[8%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Status</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>✅ Compliant: No issues | ⚠️ Warning: Minor issues | 🔴 Critical: Under 80% target</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-[12%] text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">Issues</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Identified problems: High overtime, under target, unallocated public holiday hours, etc.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffData.map((staff) => (
                <>
                  {/* Main Row */}
                  <TableRow key={staff.id} className="divide-x">
                    <TableCell className="w-[5%]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(staff.id)}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${
                            expandedRows.has(staff.id) ? 'rotate-180' : ''
                          }`} 
                        />
                      </Button>
                    </TableCell>
                    <TableCell className="w-[16%] font-medium">{staff.name}</TableCell>
                    <TableCell className="w-[20%]">
                      <Badge variant="secondary" className="text-xs">
                        {staff.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[11%] text-center font-semibold">
                      {staff.monthlyTotalHours}h
                    </TableCell>
                    <TableCell className="w-[9%] text-center">
                      {staff.monthlyOvertimeHours > 0 ? (
                        <span className="text-orange-600 font-medium">{staff.monthlyOvertimeHours}h</span>
                      ) : (
                        <span className="text-gray-500">0h</span>
                      )}
                    </TableCell>
                    <TableCell className="w-[8%] text-center text-gray-600">
                      {staff.monthlyTargetHours}h
                    </TableCell>
                    <TableCell className="w-[11%] text-center">
                      {getStatusBadge(staff.status, staff.compliancePercentage)}
                    </TableCell>
                    <TableCell className="w-[8%] text-center">
                      {getStatusIcon(staff.status)}
                    </TableCell>
                                         <TableCell className="w-[12%]">
                       <div className="flex justify-center">
                         {staff.issues.length > 0 ? (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Badge 
                                 variant="outline" 
                                 className="text-xs text-red-700 border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                               >
                                 {staff.issues.length} issue{staff.issues.length > 1 ? 's' : ''}
                               </Badge>
                             </TooltipTrigger>
                             <TooltipContent side="left" className="max-w-xs">
                               <div className="space-y-1">
                                 {staff.issues.map((issue, index) => (
                                   <div key={index} className="text-sm">• {issue}</div>
                                 ))}
                               </div>
                             </TooltipContent>
                           </Tooltip>
                         ) : (
                           <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                             None
                           </Badge>
                         )}
                       </div>
                     </TableCell>
                  </TableRow>

                  {/* Expanded Weekly Details */}
                  {expandedRows.has(staff.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-gray-50 p-0">
                        <div className="p-4 space-y-3">
                          <h4 className="font-medium text-sm text-gray-900">Weekly Breakdown for {staff.name}</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {staff.weeklyData.map((week) => (
                              <div key={week.weekNumber} className="border rounded-lg p-3 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{week.weekLabel}</span>
                                  {week.hasPublicHoliday && (
                                    <Badge variant="outline" className="text-xs text-blue-700 border-blue-200">
                                      PH
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-xs text-gray-600 mb-2">{week.weekPeriod}</div>
                                
                                {/* Clean Notion-style Display */}
                                <div className="space-y-3">
                                  {/* Primary Focus: Total Hours */}
                                  <div className="text-center py-3 border-b border-gray-100">
                                    <div className="text-xl font-bold text-gray-900">
                                      {week.totalHours}h
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      total worked
                                    </div>
                                  </div>
                                  
                                  {/* Context: What happened this week */}
                                  <div className="space-y-2 text-sm">
                                    {week.hasPublicHoliday && week.reallocationHours > 0 ? (
                                      // Special case: Public holiday reallocation week
                                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-100">
                                            PH Week
                                          </Badge>
                                          <span className="text-xs text-blue-700 font-medium">Schedule adjusted for holiday coverage</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                          <div className="flex justify-between">
                                            <span className="text-blue-600">Regular shifts</span>
                                            <span className="font-medium">{week.regularHours - week.reallocationHours}h</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-blue-600">Holiday coverage</span>
                                            <span className="font-medium">{week.reallocationHours}h</span>
                                          </div>
                                          <div className="flex justify-between border-t border-blue-200 pt-1 font-medium">
                                            <span>Week total</span>
                                            <span>{week.totalHours}h</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      // Normal week display
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Regular schedule</span>
                                          <span className="font-medium">{week.regularHours}h</span>
                                        </div>
                                        {week.overtimeHours > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-orange-600">Overtime</span>
                                            <span className="font-medium text-orange-600">{week.overtimeHours}h</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Target Status */}
                                    <div className="pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Weekly target</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">{week.targetHours}h</span>
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs px-2 py-1 ${
                                              week.totalHours >= week.targetHours 
                                                ? 'text-green-700 border-green-200 bg-green-50' 
                                                : 'text-red-700 border-red-200 bg-red-50'
                                            }`}
                                          >
                                            {week.totalHours >= week.targetHours ? '✓ Met' : '✗ Under'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                                                     </div>
                                 </div>
                              </div>
                            ))}
                          </div>

                          {/* Week Summary */}
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Monthly Regular:</span>
                                <div className="font-semibold">{staff.monthlyRegularHours}h</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Monthly Overtime:</span>
                                <div className="font-semibold text-orange-600">{staff.monthlyOvertimeHours}h</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Monthly Total:</span>
                                <div className="font-semibold">{staff.monthlyTotalHours}h</div>
                              </div>
                              <div>
                                <span className="text-gray-600">vs Monthly Target:</span>
                                <div className={`font-semibold ${
                                  staff.compliancePercentage >= 95 ? 'text-green-600' : 
                                  staff.compliancePercentage >= 80 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {staff.compliancePercentage}% ({staff.monthlyTargetHours}h)
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Compliant: No issues, meeting targets</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span>Warning: Minor issues (high overtime, PH not reallocated)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>Critical: Under individual target (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-blue-200 bg-blue-50 rounded text-xs flex items-center justify-center text-blue-700 font-semibold">PH</div>
            <span>Week with Public Holiday</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 