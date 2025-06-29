"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, ChevronRight, Edit3, Save, X, AlertTriangle, Undo, Redo, Loader2 } from "lucide-react"
import { useScheduleStore } from "@/hooks/use-schedule-store"
import { generateSchedule } from "@/lib/schedule-generator"
import { STAFF_MEMBERS } from "@/lib/staff-data"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"

// Types for drag and drop
interface DragData {
  staffId: string
  date: string
  shiftData: any
}

// Draggable Shift Cell Component
function DraggableShiftCell({ 
  id, 
  staffSchedule, 
  isEditMode, 
  children 
}: { 
  id: string
  staffSchedule: any
  isEditMode: boolean
  children: React.ReactNode 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    disabled: !isEditMode || !staffSchedule?.event || staffSchedule.event !== 'Shift'
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const [staffId, dateStr] = id.split('|')
  const staff = STAFF_MEMBERS.find(s => s.id === staffId)
  const date = new Date(dateStr)
  const canDrag = isEditMode && staffSchedule?.event === 'Shift'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${isDragging ? 'opacity-50 z-50 scale-105 shadow-lg' : ''}
        ${canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-102' : ''}
        transition-all duration-200 ease-in-out
      `}
      role={canDrag ? "button" : undefined}
      tabIndex={canDrag ? 0 : undefined}
      aria-label={canDrag ? 
        `Draggable shift for ${staff?.name} on ${format(date, 'MMMM d')}. ${staffSchedule.details?.startTime} to ${staffSchedule.details?.endTime}` : 
        undefined
      }
      aria-describedby={canDrag ? `shift-instructions-${id}` : undefined}
      onKeyDown={canDrag ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // Could trigger drag start here for keyboard users
        }
      } : undefined}
    >
      {children}
      {canDrag && (
        <div id={`shift-instructions-${id}`} className="sr-only">
          Use mouse to drag and drop this shift to a new location, or press Enter to select
        </div>
      )}
    </div>
  )
}

// Droppable Cell Component
function DroppableCell({ 
  id, 
  children,
  isEditMode,
  onHoverValidation
}: { 
  id: string
  children: React.ReactNode
  isEditMode: boolean
  onHoverValidation?: (targetId: string) => string[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isEditMode
  })

  // Get hover validation warnings
  const hoverWarnings = isOver && onHoverValidation ? onHoverValidation(id) : []
  const hasWarnings = hoverWarnings.length > 0

  const [staffId, dateStr] = id.split('|')
  const staff = STAFF_MEMBERS.find(s => s.id === staffId)
  const date = new Date(dateStr)

  return (
    <div
      ref={setNodeRef}
      className={`
        ${isOver && isEditMode ? (
          hasWarnings 
            ? 'ring-2 ring-amber-400 ring-opacity-50 bg-amber-50 animate-pulse' 
            : 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50'
        ) : ''}
        transition-all duration-200 ease-in-out
      `}
      title={isOver && hasWarnings ? hoverWarnings.join('\n') : undefined}
      role={isEditMode ? "region" : undefined}
      aria-label={isEditMode ? 
        `Drop zone for ${staff?.name} on ${format(date, 'MMMM d')}${isOver ? (hasWarnings ? ' - has warnings' : ' - valid drop zone') : ''}` : 
        undefined
      }
      aria-live={isOver && hasWarnings ? "polite" : undefined}
    >
      {children}
      {isOver && hasWarnings && (
        <div 
          className="absolute z-10 mt-1 p-2 bg-amber-100 border border-amber-300 rounded shadow-lg text-xs animate-in fade-in slide-in-from-top-2 duration-200"
          role="alert"
          aria-live="assertive"
        >
          {hoverWarnings.slice(0, 2).map((warning, index) => (
            <div key={index} className="text-amber-800">{warning}</div>
          ))}
          {hoverWarnings.length > 2 && (
            <div className="text-amber-600">+{hoverWarnings.length - 2} more...</div>
          )}
        </div>
      )}
    </div>
  )
}

export function ManualAdjustments() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragData, setDragData] = useState<DragData | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map())
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [undoStack, setUndoStack] = useState<Map<string, any>[]>([])
  const [redoStack, setRedoStack] = useState<Map<string, any>[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  
  const { publicHolidays, annualLeave } = useScheduleStore()
  
  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditMode) return
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, undoStack.length, redoStack.length])

  // Generate the current schedule
  const holidayDates = publicHolidays.map(h => h.date)
  const schedule = generateSchedule(selectedDate, holidayDates, annualLeave)
  
  // Get month boundaries and days
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const currentMonth = format(selectedDate, "MMMM yyyy")

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedDate(newDate)
  }

  const handleEditModeToggle = () => {
    setIsEditMode(!isEditMode)
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    
    try {
      // Save current state to undo stack before applying changes
      setUndoStack(prev => [...prev, new Map(pendingChanges)])
      setRedoStack([]) // Clear redo stack when new action is performed
      
      // TODO: Apply pending changes to the schedule store
      // For now, we'll simulate the save process
      console.log("Saving changes:", pendingChanges)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Clear pending changes after successful save
      setPendingChanges(new Map())
      setValidationWarnings([])
      setIsEditMode(false)
      
      // Show success feedback (could add a toast here)
      console.log("Changes saved successfully!")
      
    } catch (error) {
      console.error("Failed to save changes:", error)
      // TODO: Show error toast
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelChanges = () => {
    // Clear all changes without saving
    setPendingChanges(new Map())
    setValidationWarnings([])
    setIsEditMode(false)
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    
    const lastState = undoStack[undoStack.length - 1]
    setRedoStack(prev => [...prev, new Map(pendingChanges)])
    setUndoStack(prev => prev.slice(0, -1))
    setPendingChanges(lastState)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    
    const nextState = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, new Map(pendingChanges)])
    setRedoStack(prev => prev.slice(0, -1))
    setPendingChanges(nextState)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Parse the drag data from the active element
    const [staffId, dateStr] = (active.id as string).split('|')
    const targetDate = new Date(dateStr)
    const scheduledDay = schedule.find(s => s.date.toDateString() === targetDate.toDateString())
    const shiftData = scheduledDay?.staff[staffId]
    const staff = STAFF_MEMBERS.find(s => s.id === staffId)
    
    if (shiftData) {
      setDragData({
        staffId,
        date: dateStr,
        shiftData
      })
      
      // Announce drag start for screen readers
      setAnnouncement(`Started dragging ${staff?.name}'s shift from ${format(targetDate, 'MMMM d')}. ${shiftData.details?.startTime} to ${shiftData.details?.endTime}.`)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    
    const sourceStaff = STAFF_MEMBERS.find(s => s.id === dragData?.staffId)

    if (!over || !dragData) {
      // Announce cancelled drag
      setAnnouncement(`Drag cancelled. ${sourceStaff?.name}'s shift remains in original position.`)
      setDragData(null)
      return
    }

    const [sourceStaffId, sourceDateStr] = (active.id as string).split('|')
    const [targetStaffId, targetDateStr] = (over.id as string).split('|')
    const targetStaff = STAFF_MEMBERS.find(s => s.id === targetStaffId)
    const targetDate = new Date(targetDateStr)

    // Don't do anything if dropped on the same cell
    if (active.id === over.id) {
      setAnnouncement(`Dropped on same position. No changes made.`)
      setDragData(null)
      return
    }

    // Validate the move
    const warnings = validateMove(sourceStaffId, sourceDateStr, targetStaffId, targetDateStr)
    
    if (warnings.length > 0) {
      setValidationWarnings(warnings)
      // Still allow the move but show warnings
    }

    // Create the pending change
    const changeKey = `${targetStaffId}|${targetDateStr}`
    const newPendingChanges = new Map(pendingChanges)
    newPendingChanges.set(changeKey, {
      originalStaffId: sourceStaffId,
      originalDate: sourceDateStr,
      shiftData: dragData.shiftData,
      type: 'move'
    })
    
    // Also clear the source if it's different
    if (sourceStaffId !== targetStaffId || sourceDateStr !== targetDateStr) {
      const sourceKey = `${sourceStaffId}|${sourceDateStr}`
      newPendingChanges.set(sourceKey, {
        type: 'clear'
      })
    }
    
    setPendingChanges(newPendingChanges)
    
    // Announce successful drop for screen readers
    setAnnouncement(`Moved ${sourceStaff?.name}'s shift to ${targetStaff?.name} on ${format(targetDate, 'MMMM d')}. ${warnings.length > 0 ? `Warning: ${warnings[0]}` : 'Move completed successfully.'}`)
    setDragData(null)
  }

  // Enhanced validation function
  const validateMove = (sourceStaffId: string, sourceDateStr: string, targetStaffId: string, targetDateStr: string): string[] => {
    const warnings: string[] = []
    
    const sourceStaff = STAFF_MEMBERS.find(s => s.id === sourceStaffId)
    const targetStaff = STAFF_MEMBERS.find(s => s.id === targetStaffId)
    const sourceDate = new Date(sourceDateStr)
    const targetDate = new Date(targetDateStr)
    
    // Role validation - Critical for pharmacy operations
    if (sourceStaff && targetStaff && sourceStaff.role !== targetStaff.role) {
      warnings.push(`⚠️ Role mismatch: Moving ${sourceStaff.role} shift to ${targetStaff.role}`)
    }
    
    // Check if target already has a shift
    const scheduledDay = schedule.find(s => s.date.toDateString() === targetDate.toDateString())
    const existingShift = scheduledDay?.staff[targetStaffId]
    
    if (existingShift && existingShift.event === 'Shift') {
      warnings.push(`🔄 ${targetStaff?.name || targetStaffId} already has a shift on this day - this will be replaced`)
    }
    
    // Check for annual leave conflicts
    const targetLeave = annualLeave.find(leave => 
      leave.staffId === targetStaffId && 
      leave.date.toDateString() === targetDate.toDateString()
    )
    
    if (targetLeave) {
      warnings.push(`🏖️ ${targetStaff?.name || targetStaffId} is on annual leave on this day`)
    }
    
    // Check for public holiday implications
    const isTargetHoliday = publicHolidays.some(holiday => 
      holiday.date.toDateString() === targetDate.toDateString()
    )
    
    if (isTargetHoliday) {
      warnings.push(`🎉 This is a public holiday - ensure adequate coverage`)
    }
    
    // Check for weekend vs weekday pattern changes
    const sourceIsWeekend = sourceDate.getDay() === 0 || sourceDate.getDay() === 6
    const targetIsWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6
    
    if (sourceIsWeekend !== targetIsWeekend) {
      const direction = targetIsWeekend ? 'weekend' : 'weekday'
      warnings.push(`📅 Moving from ${sourceIsWeekend ? 'weekend' : 'weekday'} to ${direction} pattern`)
    }
    
    // Check for minimum staffing requirements
    if (sourceStaff?.role === 'Pharmacist') {
      // Count current pharmacists on target date (excluding the one being moved)
      const targetDaySchedule = schedule.find(s => s.date.toDateString() === targetDate.toDateString())
      const pharmacistCount = targetDaySchedule ? 
        Object.entries(targetDaySchedule.staff).filter(([staffId, staff]) => 
          staff.event === 'Shift' && 
          STAFF_MEMBERS.find(s => s.id === staffId)?.role === 'Pharmacist' &&
          staffId !== sourceStaffId // Exclude the staff being moved
        ).length : 0
      
      if (pharmacistCount === 0) {
        warnings.push(`💊 No other pharmacists scheduled - ensure minimum coverage requirements`)
      }
    }
    
    return warnings
  }

  // Hover validation for real-time feedback
  const getHoverValidation = (targetId: string): string[] => {
    if (!activeId || !dragData) return []
    
    const [targetStaffId, targetDateStr] = targetId.split('|')
    return validateMove(dragData.staffId, dragData.date, targetStaffId, targetDateStr)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manual Schedule Adjustments</h1>
              <p className="text-muted-foreground mt-1">
                Drag and drop staff assignments to manually adjust the schedule
              </p>
            </div>
            
            {/* Edit Mode Toggle */}
            <div className="flex items-center gap-4">
              {isEditMode && (
                <div className="flex items-center gap-2">
                  {/* Undo/Redo Controls */}
                  <div className="flex items-center gap-1 mr-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      disabled={undoStack.length === 0 || isSaving}
                      className="h-8 w-8 p-0"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRedo}
                      disabled={redoStack.length === 0 || isSaving}
                      className="h-8 w-8 p-0"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Save/Cancel Controls */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelChanges}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={isSaving || pendingChanges.size === 0}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="edit-mode-switch" className="text-sm font-medium">
                  Edit Mode
                </label>
                <Switch
                  id="edit-mode-switch"
                  checked={isEditMode}
                  onCheckedChange={handleEditModeToggle}
                  aria-describedby="edit-mode-description"
                />
                <div id="edit-mode-description" className="sr-only">
                  {isEditMode 
                    ? "Edit mode is active. You can now drag and drop staff assignments between shifts. Use Tab to navigate and arrow keys to move focus."
                    : "Edit mode is disabled. Toggle to enable drag and drop functionality for manual schedule adjustments."
                  }
                </div>
              </div>
            </div>
          </div>
          
          {isEditMode && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Edit Mode Active:</strong> You can now drag and drop staff assignments. 
                Changes will be previewed until you click "Save Changes".
              </p>
            </div>
          )}
          
          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Validation Warnings:</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Pending Changes Summary */}
          {pendingChanges.size > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    {pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1 text-xs text-green-700">
                    {Array.from(pendingChanges.entries()).slice(0, 3).map(([key, change]) => {
                      const [staffId, dateStr] = key.split('|')
                      const staff = STAFF_MEMBERS.find(s => s.id === staffId)
                      const date = new Date(dateStr)
                      
                      if (change.type === 'move') {
                        return (
                          <div key={key}>
                            • {staff?.name} - {format(date, 'MMM d')}: Shift moved from {change.originalStaffId}
                          </div>
                        )
                      } else if (change.type === 'clear') {
                        return (
                          <div key={key}>
                            • {staff?.name} - {format(date, 'MMM d')}: Shift cleared
                          </div>
                        )
                      }
                      return null
                    })}
                    {pendingChanges.size > 3 && (
                      <div className="text-green-600">
                        ... and {pendingChanges.size - 3} more changes
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-green-600 ml-4">
                  Click "Save Changes" to apply
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Month Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
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
              </div>
              
              <div className="text-sm text-muted-foreground">
                {monthDays.length} days • {STAFF_MEMBERS.length} staff members
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Schedule Grid</span>
              {isEditMode && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Editing
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {/* Grid Header - Days */}
              <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] gap-1 mb-2">
                <div className="p-3 font-medium text-sm text-muted-foreground">
                  Staff Member
                </div>
                {monthDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="p-2 text-center text-xs font-medium text-muted-foreground border-b"
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className="text-lg font-semibold text-foreground">
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid Body - Staff Rows */}
              <div className="space-y-1">
                {STAFF_MEMBERS.map((staff) => (
                  <div
                    key={staff.id}
                    className="grid grid-cols-[200px_repeat(auto-fit,minmax(120px,1fr))] gap-1"
                  >
                    {/* Staff Name Column */}
                    <div className="p-3 bg-muted/30 rounded-l border-r flex items-center gap-2">
                      <div>
                        <div className="font-medium text-sm">{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.role}</div>
                      </div>
                    </div>

                    {/* Shift Cells */}
                    {monthDays.map((day) => {
                      const scheduledDay = schedule.find(s => 
                        s.date.toDateString() === day.toDateString()
                      )
                      const staffSchedule = scheduledDay?.staff[staff.id]
                      const cellId = `${staff.id}|${day.toISOString()}`
                      
                      // Check for pending changes
                      const pendingChange = pendingChanges.get(cellId)
                      const displaySchedule = pendingChange?.type === 'move' ? {
                        event: 'Shift',
                        details: pendingChange.shiftData.details
                      } : pendingChange?.type === 'clear' ? null : staffSchedule
                      
                      return (
                        <DroppableCell 
                          key={cellId} 
                          id={cellId} 
                          isEditMode={isEditMode}
                          onHoverValidation={getHoverValidation}
                        >
                          <DraggableShiftCell 
                            id={cellId} 
                            staffSchedule={displaySchedule} 
                            isEditMode={isEditMode}
                          >
                            <div
                              className={`
                                p-2 min-h-[60px] border rounded text-xs transition-colors
                                ${isEditMode && displaySchedule?.event === 'Shift'
                                  ? 'hover:shadow-md' 
                                  : isEditMode
                                  ? 'hover:bg-muted/50'
                                  : ''
                                }
                                ${displaySchedule?.event === 'Shift' 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-background'
                                }
                                ${pendingChange ? 'ring-2 ring-green-400 ring-opacity-30' : ''}
                              `}
                            >
                              {displaySchedule?.event === 'Shift' && displaySchedule.details && (
                                <div className="space-y-1">
                                  <div className="font-medium text-blue-800">
                                    {displaySchedule.details.startTime} - {displaySchedule.details.endTime}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {displaySchedule.details.workHours}h
                                  </div>
                                  {isEditMode && (
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {pendingChange ? 'Moved' : 'Drag to move'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {displaySchedule?.event === 'OFF' && (
                                <div className="text-center text-muted-foreground">
                                  OFF
                                </div>
                              )}
                              
                              {!displaySchedule && (
                                <div className="text-center text-muted-foreground">
                                  {isEditMode ? 'Drop here' : '—'}
                                </div>
                              )}
                              
                              {pendingChange?.type === 'clear' && (
                                <div className="text-center text-muted-foreground italic">
                                  Cleared
                                </div>
                              )}
                            </div>
                          </DraggableShiftCell>
                        </DroppableCell>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {!isEditMode && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">
                  Enable <strong>Edit Mode</strong> above to start making manual adjustments to the schedule.
                </p>
                <p className="text-xs mt-1">
                  You'll be able to drag and drop staff assignments between different shifts and days.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    
    {/* Screen Reader Live Region for Announcements */}
    <div 
      aria-live="polite" 
      aria-atomic="true" 
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
    
    {/* Drag Overlay */}
    <DragOverlay>
      {activeId && dragData ? (
        <div className="p-2 min-h-[60px] border rounded text-xs bg-blue-50 border-blue-200 shadow-lg opacity-90">
          <div className="space-y-1">
            <div className="font-medium text-blue-800">
              {dragData.shiftData.details.startTime} - {dragData.shiftData.details.endTime}
            </div>
            <div className="text-muted-foreground">
              {dragData.shiftData.details.workHours}h
            </div>
            <Badge variant="outline" className="text-xs">
              Moving...
            </Badge>
          </div>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}