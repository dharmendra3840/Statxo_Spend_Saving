export type Status = "Approved" | "Over Budget";
export type Priority = "High" | "Medium" | "Low";

/** Shape returned by the API. camelCase; numbers are real numbers. */
export type SpendRecord = {
  id: number;
  /** 'YYYY-MM-DD' — compared as a string throughout, never parsed to Date. */
  date: string;
  department: string;
  category: string;
  vendor: string;
  location: string;
  businessUnit: string;
  budget: number;
  actualSpend: number;
  savings: number;
  /** null when budget <= 0, so the UI can render an em dash instead of NaN. */
  savingsPct: number | null;
  status: Status;
  priority: Priority;
  paymentMethod: string;
};

/** Row shape as it comes back from the spend_records_v view (snake_case). */
export type DbRow = {
  id: number;
  date: string | Date;
  department: string;
  category: string;
  vendor: string;
  location: string;
  business_unit: string;
  budget: number | string;
  actual_spend: number | string;
  priority: Priority;
  payment_method: string;
};

/**
 * Global dashboard filters.
 *
 * An empty array means "unconstrained", NOT "match nothing". That convention is
 * what allows the six filters to compose: each one only narrows the set when it
 * actually holds a selection.
 */
export type Filters = {
  dateFrom: string | null;
  dateTo: string | null;
  businessUnits: string[];
  categories: string[];
  vendors: string[];
  locations: string[];
  statuses: string[];
};

export const DEFAULT_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  businessUnits: [],
  categories: [],
  vendors: [],
  locations: [],
  statuses: [],
};

export type RecordInput = {
  date: string;
  department: string;
  category: string;
  vendor: string;
  location: string;
  businessUnit: string;
  budget: number;
  actualSpend: number;
  priority: Priority;
  paymentMethod: string;
};
