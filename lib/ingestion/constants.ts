export const REQUIRED_COLUMNS = [
  "Name of the Project Location",
  "Date of Visit",
  "No. of composters",
  "Sum of Wet Waste (Kg)",
  "Sum of Brown Waste (Kg)",
  "Sum of Leachate (Litre)",
  "Sum of Harvest (Kg)",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

// Allow common alternate headers (and a few misspellings) seen in real sheets.
// These are matched case/space-insensitively by the parser.
export const COLUMN_ALIASES: Record<RequiredColumn, readonly string[]> = {
  "Name of the Project Location": ["Location Name", "Project Location", "Location"],
  "Date of Visit": ["Visit Date", "Date", "Date of visit"],
  "No. of composters": ["No of composters", "No of Aerobins", "No. of Aerobins", "Aerobins", "No of bins"],
  "Sum of Wet Waste (Kg)": ["Wet Waste", "Wet Waste (Kg)", "Wet Waste Kg", "Wet (Kg)"],
  "Sum of Brown Waste (Kg)": ["Brown Waste", "Brown Waste (Kg)", "Brown Waste Kg", "Brown (Kg)"],
  "Sum of Leachate (Litre)": ["Leachate", "Leachate (Litre)", "Leachate (L)", "Leachete", "Leachate Litre"],
  "Sum of Harvest (Kg)": ["Harvest", "Harvest (Kg)", "Harvest Kg", "harverst"],
} as const;

