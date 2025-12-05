import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format enum value to user-friendly display text
 * Replaces underscores with spaces and capitalizes words
 * Special case: "IT" remains uppercase
 * Example: "Super_Admin" -> "Super Admin"
 * Example: "HRGA_OFFICER" -> "HRGA Officer"
 * Example: "APPROVAL_ONLY" -> "Approval Only"
 * Example: "IT_OFFICER" -> "IT Officer"
 * Example: "IT_MANAGER" -> "IT Manager"
 */
export function formatEnumDisplay(value: string): string {
  return value
    .split("_")
    .map((word) => {
      // Special case: "IT" remains uppercase
      if (word.toUpperCase() === "IT") {
        return "IT";
      }
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
