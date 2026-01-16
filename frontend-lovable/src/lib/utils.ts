import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Haptic feedback for mobile devices
 * Uses Vibration API when available
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 10],
    error: [50, 30, 50, 30, 50],
  };

  try {
    navigator.vibrate(patterns[type]);
  } catch {
    // Vibration not supported or blocked
  }
}
