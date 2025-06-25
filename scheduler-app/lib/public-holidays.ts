export const PUBLIC_HOLIDAYS_2025 = [
  { date: new Date(2025, 2, 31), name: "Raya Puasa 1" }, // March 31
  { date: new Date(2025, 3, 1), name: "Raya Puasa 2" }, // April 1
  { date: new Date(2025, 3, 2), name: "Raya Puasa 3 (*ganti Nuzul Quran)" }, // April 2
  { date: new Date(2025, 4, 1), name: "Labour Day" }, // May 1
  { date: new Date(2025, 5, 2), name: "Agong Birthday" }, // June 2
  { date: new Date(2025, 5, 7), name: "Hari Raya Haji Day 1" }, // June 7
  { date: new Date(2025, 5, 8), name: "Hari Raya Haji Day 2 (*ganti Maulidur Rasul)" }, // June 8
  { date: new Date(2025, 5, 27), name: "Awal Muharam" }, // June 27
  { date: new Date(2025, 7, 31), name: "Merdeka Day" }, // August 31
  { date: new Date(2025, 8, 16), name: "Hari Malaysia" }, // September 16
  { date: new Date(2025, 11, 11), name: "Sultan Selangor's Birthday" }, // December 11
]

export const SAMPLE_ANNUAL_LEAVE = [
  { staffId: "mathilda", dates: [new Date(2025, 6, 15), new Date(2025, 6, 16), new Date(2025, 6, 17)] },
  { staffId: "fatimah", dates: [new Date(2025, 6, 22)] },
]

export const SAMPLE_WARNINGS = [
  {
    id: "coverage-gap-jul15",
    type: "coverage" as const,
    severity: "high" as const,
    date: new Date(2025, 6, 15),
    title: "Coverage Gap - July 15",
    description: "Mathilda on AL, no Assistant Pharmacist coverage found. Consider swapping Pah's off-day.",
  },
  {
    id: "no-pharmacist-jul22",
    type: "coverage" as const,
    severity: "critical" as const,
    date: new Date(2025, 6, 22),
    title: "No Pharmacist - July 22",
    description: "Fatimah on AL, Amal off-duty. No pharmacist coverage available.",
  },
  {
    id: "hour-banking-christmas",
    type: "banking" as const,
    severity: "medium" as const,
    date: new Date(2025, 11, 25),
    title: "Hour Banking - Christmas Day",
    description: "11 hours from cancelled shifts need redistribution within week 52.",
  },
]
