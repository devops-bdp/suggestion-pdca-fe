import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PermissionLevel } from "./api"

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

/**
 * Check if user has permission to manage users
 * Only users with FULL_ACCESS permission level can manage users
 * @param permissionLevel - User's permission level from database
 * @returns true if user can manage users, false otherwise
 */
export function canManageUsers(permissionLevel: PermissionLevel | string): boolean {
  return permissionLevel === PermissionLevel.FULL_ACCESS;
}

/**
 * Check if user has permission to approve suggestions
 * Users with APPROVAL_ONLY, APPROVAL_SCORING, or FULL_ACCESS can approve
 * @param permissionLevel - User's permission level from database
 * @returns true if user can approve, false otherwise
 */
export function canApprove(permissionLevel: PermissionLevel | string): boolean {
  return (
    permissionLevel === PermissionLevel.APPROVAL_ONLY ||
    permissionLevel === PermissionLevel.APPROVAL_SCORING ||
    permissionLevel === PermissionLevel.FULL_ACCESS
  );
}

/**
 * Check if user has permission to score suggestions
 * Users with SCORING_ONLY, APPROVAL_SCORING, or FULL_ACCESS can score
 * @param permissionLevel - User's permission level from database
 * @returns true if user can score, false otherwise
 */
export function canScore(permissionLevel: PermissionLevel | string): boolean {
  return (
    permissionLevel === PermissionLevel.SCORING_ONLY ||
    permissionLevel === PermissionLevel.APPROVAL_SCORING ||
    permissionLevel === PermissionLevel.FULL_ACCESS
  );
}
