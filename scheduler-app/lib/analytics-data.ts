import { generateSchedule, calculateWeeklyHours } from './schedule-generator'
import { STAFF_MEMBERS } from './staff-data'
import { 
  format, 
  eachWeekOfInterval, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameWeek,
  getISOWeek,
  addDays
} from 'date-fns'

interface PublicHoliday {
  date: Date
  name: string
}

interface AnnualLeave {
  staffId: string
  dates: Date[]
}

interface WeeklyAnalyticsData {
  weekNumber: number
  weekLabel: string
  weekPeriod: string
  regularHours: number
  overtimeHours: number
  totalHours: number
  hasPublicHoliday: boolean
  hasAnnualLeave: boolean
  reallocationHours: number
  targetHours: number
  daysWorked: number
  issues: string[]
}

interface StaffAnalyticsData {
  id: string
  name: string
  role: string
  monthlyRegularHours: number
  monthlyOvertimeHours: number
  monthlyTotalHours: number
  monthlyTargetHours: number
  compliancePercentage: number
  weeklyData: WeeklyAnalyticsData[]
  issues: string[]
  status: 'compliant' | 'warning' | 'critical'
}

/**
 * Extract real analytics data from the schedule generator for a given month
 */
export function generateAnalyticsData(
  selectedDate: Date,
  publicHolidays: PublicHoliday[] = [],
  annualLeave: AnnualLeave[] = []
): StaffAnalyticsData[] {
  // Generate the actual schedule for this month
  const holidayDates = publicHolidays.map(h => h.date)
  const schedule = generateSchedule(selectedDate, holidayDates, annualLeave)
  
  // Calculate weekly hours using the existing function
  const weeklyHours = calculateWeeklyHours(schedule)
  
  // Get month boundaries
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  
  // Get weeks that overlap with this month (Monday-based weeks)
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd }, 
    { weekStartsOn: 1 } // Monday
  )
  
  return STAFF_MEMBERS.map(staff => {
    const weeklyData = weeks.map((weekStart, weekIndex) => {
      // Calculate the full week period (Monday to Sunday)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const weekNumber = getISOWeek(weekStart)
      
      // Find the corresponding weekly hour log for this staff and week
      const weekLog = weeklyHours.find(log => 
        log.staffId === staff.id && log.weekNumber === weekNumber
      )
      
      // Get all days in this week (full 7 days) - don't filter by month
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
      
      // Check for public holidays in this week
      const hasPublicHoliday = weekDays.some(day =>
        publicHolidays.some(ph => 
          ph.date.getFullYear() === day.getFullYear() &&
          ph.date.getMonth() === day.getMonth() &&
          ph.date.getDate() === day.getDate()
        )
      )
      
      // Check for annual leave in this week for this staff member
      const staffLeave = annualLeave.find(al => al.staffId === staff.id)
      const hasAnnualLeave = staffLeave ? weekDays.some(day =>
        staffLeave.dates.some(leaveDate =>
          leaveDate.getFullYear() === day.getFullYear() &&
          leaveDate.getMonth() === day.getMonth() &&
          leaveDate.getDate() === day.getDate()
        )
      ) : false
      
      // Extract hours from the schedule data for ALL days in the week
      let regularHours = 0
      let reallocationHours = 0
      let daysWorked = 0
      
      weekDays.forEach(day => {
        const scheduledDay = schedule.find(s => 
          s.date.getFullYear() === day.getFullYear() &&
          s.date.getMonth() === day.getMonth() &&
          s.date.getDate() === day.getDate()
        )
        
        if (scheduledDay) {
          const staffSchedule = scheduledDay.staff[staff.id]
          if (staffSchedule?.event === 'Shift' && staffSchedule.details) {
            const baseHours = staffSchedule.details.workHours || 0
            const reallocatedHours = staffSchedule.details.reallocatedHours || 0
            
            regularHours += baseHours
            reallocationHours += reallocatedHours
            daysWorked++
          }
        }
      })
      
      // Use weekly log data if available, otherwise use calculated data
      const totalWeeklyHours = weekLog ? weekLog.scheduledHours : regularHours + reallocationHours
      const targetHours = staff.weeklyHours // Use individual staff target hours
      
      // Calculate overtime (hours above target)
      const overtimeHours = Math.max(0, totalWeeklyHours - targetHours)
      const adjustedRegularHours = Math.min(regularHours + reallocationHours, targetHours)
      
      // Identify week-specific issues
      const weekIssues: string[] = []
      if (hasPublicHoliday && reallocationHours === 0) {
        weekIssues.push(`Week ${weekIndex + 1}: PH not reallocated`)
      }
      if (hasAnnualLeave && totalWeeklyHours < 32) {
        weekIssues.push(`Week ${weekIndex + 1}: Low hours due to AL`)
      }
      
      return {
        weekNumber: weekIndex + 1,
        weekLabel: `Week ${weekIndex + 1}`,
        weekPeriod: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        regularHours: adjustedRegularHours,
        overtimeHours,
        totalHours: totalWeeklyHours,
        hasPublicHoliday,
        hasAnnualLeave,
        reallocationHours,
        targetHours,
        daysWorked,
        issues: weekIssues
      }
    })
    
    // Calculate monthly totals as sum of weekly totals (this fixes the monthly total issue)
    const monthlyTotalHours = weeklyData.reduce((sum, week) => sum + week.totalHours, 0)
    const monthlyOvertimeHours = weeklyData.reduce((sum, week) => sum + week.overtimeHours, 0)
    const monthlyRegularHours = monthlyTotalHours - monthlyOvertimeHours
    
    // Calculate target based on number of weeks that overlap with the month
    const monthlyTargetHours = weeklyData.length * staff.weeklyHours // Use individual staff target
    const compliancePercentage = monthlyTargetHours > 0 ? 
      Math.round((monthlyTotalHours / monthlyTargetHours) * 100) : 0
    
    // Aggregate all issues from weeks
    const allWeekIssues = weeklyData.flatMap(week => week.issues)
    
    // Identify monthly issues
    const monthlyIssues: string[] = [...allWeekIssues]
    if (monthlyOvertimeHours > 20) monthlyIssues.push("High overtime")
    if (compliancePercentage < 80) monthlyIssues.push("Under target")
    if (compliancePercentage > 120) monthlyIssues.push("Over-scheduled")
    
    // Check for unallocated banked hours (from the schedule)
    const staffHasUnallocatedHours = schedule.some(day => {
      const staffSchedule = day.staff[staff.id]
      return staffSchedule?.remainingUnallocatedHours && staffSchedule.remainingUnallocatedHours > 0
    })
    
    if (staffHasUnallocatedHours) {
      monthlyIssues.push("Unallocated banked hours")
    }
    
    // Determine status
    let status: 'compliant' | 'warning' | 'critical' = 'compliant'
    if (monthlyIssues.some(issue => issue.includes("Under target"))) {
      status = 'critical'
    } else if (monthlyIssues.length > 0) {
      status = 'warning'
    }
    
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      monthlyRegularHours,
      monthlyOvertimeHours,
      monthlyTotalHours,
      monthlyTargetHours,
      compliancePercentage,
      weeklyData,
      issues: monthlyIssues,
      status
    }
  })
}

/**
 * Get analytics summary for the entire organization
 */
export function getAnalyticsSummary(
  selectedDate: Date,
  publicHolidays: PublicHoliday[] = [],
  annualLeave: AnnualLeave[] = []
) {
  const staffData = generateAnalyticsData(selectedDate, publicHolidays, annualLeave)
  
  const totalStaff = staffData.length
  const totalHours = staffData.reduce((sum, staff) => sum + staff.monthlyTotalHours, 0)
  const totalOvertimeHours = staffData.reduce((sum, staff) => sum + staff.monthlyOvertimeHours, 0)
  const totalIssues = staffData.reduce((sum, staff) => sum + staff.issues.length, 0)
  
  const compliantStaff = staffData.filter(staff => staff.status === 'compliant').length
  const complianceRate = totalStaff > 0 ? Math.round((compliantStaff / totalStaff) * 100) : 0
  
  return {
    totalStaff,
    totalHours,
    totalOvertimeHours,
    totalIssues,
    complianceRate,
    staffBreakdown: {
      compliant: compliantStaff,
      warning: staffData.filter(staff => staff.status === 'warning').length,
      critical: staffData.filter(staff => staff.status === 'critical').length
    }
  }
} 