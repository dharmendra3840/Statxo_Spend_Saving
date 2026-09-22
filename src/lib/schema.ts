import { z } from "zod";
import { CATEGORIES, PAYMENT_METHODS, PRIORITIES } from "./constants";

/**
 * One schema, used by the add-record form AND by the POST route handler.
 *
 * Client-only validation is the usual way this kind of app fails a "is the
 * backend real?" probe: a curl with {"budget":"abc"} has to come back 400, not
 * 500 and not a corrupted row.
 */
const money = z
  .number({ message: "Must be a number" })
  .finite("Must be a number")
  .min(0, "Cannot be negative")
  .max(99_999_999_999, "Value is too large");

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

export const recordInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Not a valid date"),
  department: required("Department"),
  category: required("Category"),
  vendor: required("Vendor"),
  location: required("Location"),
  businessUnit: required("Business Unit"),
  budget: money,
  actualSpend: money,
  priority: z.enum(PRIORITIES),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

/** Only the three fields the brief says are editable. */
export const recordPatchSchema = z
  .object({
    budget: money.optional(),
    actualSpend: money.optional(),
    category: z.enum(CATEGORIES).or(required("Category")).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No editable fields supplied");

export type RecordInputParsed = z.infer<typeof recordInputSchema>;

/** Flattens zod issues into { field: message } for the form to consume. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
