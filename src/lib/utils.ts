import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Small className helper.
//
// Exports:
// - cn: combines conditional class values (via clsx) and resolves conflicting
//   Tailwind classes (via twMerge) into a single className string.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
