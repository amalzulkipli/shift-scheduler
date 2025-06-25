import type { StaffMember, ShiftDefinition, ShiftPattern } from "@/types/schedule"

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: "fatimah",
    name: "Fatimah",
    role: "Pharmacist",
    weeklyHours: 45,
    defaultOffDays: [0, 6], // Saturday, Sunday
  },
  {
    id: "mathilda",
    name: "Mathilda",
    role: "Assistant Pharmacist",
    weeklyHours: 45,
    defaultOffDays: [1, 2], // Monday, Tuesday
  },
  {
    id: "pah",
    name: "Pah",
    role: "Assistant Pharmacist",
    weeklyHours: 45,
    defaultOffDays: [1, 2], // Monday, Tuesday
  },
  {
    id: "amal",
    name: "Amal",
    role: "Pharmacist",
    weeklyHours: 32,
    defaultOffDays: [3, 4, 5], // Wednesday, Thursday, Friday
  },
]

export const SHIFT_DEFINITIONS: { [key: string]: ShiftDefinition } = {
  "11h": {
    type: "11h",
    timing: null,
    startTime: "09:15",
    endTime: "21:45",
    workHours: 11,
  },
  "9h_early": {
    type: "9h",
    timing: "early",
    startTime: "09:15",
    endTime: "19:15",
    workHours: 9,
  },
  "9h_late": {
    type: "9h",
    timing: "late",
    startTime: "11:45",
    endTime: "21:45",
    workHours: 9,
  },
  "8h_early": {
    type: "8h",
    timing: "early",
    startTime: "09:15",
    endTime: "18:15",
    workHours: 8,
  },
  "8h_late": {
    type: "8h",
    timing: "late",
    startTime: "12:45",
    endTime: "21:45",
    workHours: 8,
  },
  "7h_early": {
    type: "7h",
    timing: "early",
    startTime: "09:15",
    endTime: "17:15",
    workHours: 7,
  },
  "7h_late": {
    type: "7h",
    timing: "late",
    startTime: "14:45",
    endTime: "21:45",
    workHours: 7,
  },
}

// Pattern 0 (Odd ISO Weeks)
const PATTERN_0: ShiftPattern = {
  patternId: 0,
  dailyShifts: {
    fatimah: {
      1: SHIFT_DEFINITIONS["11h"], // Monday
      2: SHIFT_DEFINITIONS["11h"], // Tuesday
      3: SHIFT_DEFINITIONS["8h_early"], // Wednesday
      4: SHIFT_DEFINITIONS["8h_early"], // Thursday
      5: SHIFT_DEFINITIONS["7h_early"], // Friday
      6: null, // Saturday (off)
      0: null, // Sunday (off)
    },
    mathilda: {
      1: null, // Monday (off)
      2: null, // Tuesday (off)
      3: SHIFT_DEFINITIONS["11h"], // Wednesday
      4: SHIFT_DEFINITIONS["9h_early"], // Thursday
      5: SHIFT_DEFINITIONS["9h_early"], // Friday
      6: SHIFT_DEFINITIONS["9h_early"], // Saturday
      0: SHIFT_DEFINITIONS["7h_late"], // Sunday
    },
    pah: {
      1: null, // Monday (off)
      2: null, // Tuesday (off)
      3: SHIFT_DEFINITIONS["9h_late"], // Wednesday
      4: SHIFT_DEFINITIONS["9h_late"], // Thursday
      5: SHIFT_DEFINITIONS["9h_late"], // Friday
      6: SHIFT_DEFINITIONS["9h_late"], // Saturday
      0: SHIFT_DEFINITIONS["9h_early"], // Sunday
    },
    amal: {
      1: SHIFT_DEFINITIONS["8h_late"], // Monday
      2: SHIFT_DEFINITIONS["8h_late"], // Tuesday
      3: null, // Wednesday (off)
      4: null, // Thursday (off)
      5: null, // Friday (off)
      6: SHIFT_DEFINITIONS["8h_late"], // Saturday
      0: SHIFT_DEFINITIONS["8h_late"], // Sunday
    },
  },
}

// Pattern 1 (Even ISO Weeks)
const PATTERN_1: ShiftPattern = {
  patternId: 1,
  dailyShifts: {
    fatimah: {
      1: SHIFT_DEFINITIONS["11h"], // Monday
      2: SHIFT_DEFINITIONS["11h"], // Tuesday
      3: SHIFT_DEFINITIONS["8h_early"], // Wednesday
      4: SHIFT_DEFINITIONS["8h_early"], // Thursday
      5: SHIFT_DEFINITIONS["7h_late"], // Friday
      6: null, // Saturday (off)
      0: null, // Sunday (off)
    },
    mathilda: {
      1: null, // Monday (off)
      2: null, // Tuesday (off)
      3: SHIFT_DEFINITIONS["9h_late"], // Wednesday
      4: SHIFT_DEFINITIONS["9h_late"], // Thursday
      5: SHIFT_DEFINITIONS["9h_late"], // Friday
      6: SHIFT_DEFINITIONS["9h_late"], // Saturday
      0: SHIFT_DEFINITIONS["9h_early"], // Sunday
    },
    pah: {
      1: null, // Monday (off)
      2: null, // Tuesday (off)
      3: SHIFT_DEFINITIONS["11h"], // Wednesday
      4: SHIFT_DEFINITIONS["9h_early"], // Thursday
      5: SHIFT_DEFINITIONS["9h_early"], // Friday
      6: SHIFT_DEFINITIONS["9h_early"], // Saturday
      0: SHIFT_DEFINITIONS["7h_late"], // Sunday
    },
    amal: {
      1: SHIFT_DEFINITIONS["8h_early"], // Monday
      2: SHIFT_DEFINITIONS["8h_early"], // Tuesday
      3: null, // Wednesday (off)
      4: null, // Thursday (off)
      5: null, // Friday (off)
      6: SHIFT_DEFINITIONS["8h_early"], // Saturday
      0: SHIFT_DEFINITIONS["8h_early"], // Sunday
    },
  },
}

export const SHIFT_PATTERNS = [PATTERN_0, PATTERN_1]
