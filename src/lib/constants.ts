/**
 * Closed enums mirror the CHECK constraints in 001_schema.sql, so the form
 * cannot offer a value the database will reject.
 *
 * The open-ended dimensions (department, category, vendor, location, business
 * unit) are derived from the loaded records instead — see useFilterOptions —
 * so a newly added vendor shows up in the filters without a code change.
 */
export const PRIORITIES = ["High", "Medium", "Low"] as const;

export const PAYMENT_METHODS = [
  "Monthly",
  "Purchase Order",
  "Project",
  "Annual Contract",
  "Corporate Card",
] as const;

export const STATUSES = ["Approved", "Over Budget"] as const;

/** Seed values, offered as suggestions; free entry is still allowed for vendor. */
export const CATEGORIES = [
  "Cloud Infrastructure",
  "Office Supplies",
  "Digital Advertising",
  "Consulting",
  "Recruitment",
  "Travel",
  "Software Licenses",
  "Maintenance",
  "Events",
  "Hardware",
  "Content Services",
  "Software",
  "Employee Training",
  "Logistics",
  "Cybersecurity",
  "Utilities",
] as const;

export const DEPARTMENTS = [
  "IT",
  "Procurement",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Facilities",
  "Sales",
] as const;

export const LOCATIONS = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Chennai",
  "Pune",
] as const;

export const BUSINESS_UNITS = [
  "Technology",
  "Corporate",
  "Marketing",
  "Finance",
  "People",
  "Operations",
  "Sales",
] as const;

/**
 * One palette, keyed consistently, so a given business unit is the same colour
 * in every chart it appears in.
 */
export const SERIES_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#dc2626",
];

export const COLOR_BUDGET = "#94a3b8";
export const COLOR_SPEND = "#2563eb";
export const COLOR_SAVINGS = "#0d9488";
export const COLOR_OVERSPEND = "#dc2626";

export function colorFor(key: string, index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
