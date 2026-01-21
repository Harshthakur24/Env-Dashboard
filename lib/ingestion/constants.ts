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

