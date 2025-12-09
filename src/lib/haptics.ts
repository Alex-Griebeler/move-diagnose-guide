/**
 * Haptic feedback utilities for mobile devices
 */

type HapticPattern = 'tap' | 'success' | 'complete' | 'error';

const patterns: Record<HapticPattern, number[]> = {
  tap: [50],
  success: [100, 50, 100],
  complete: [50, 30, 50, 30, 100],
  error: [200, 100, 200],
};

/**
 * Trigger haptic feedback on supported devices
 */
export function triggerHaptic(pattern: HapticPattern = 'tap'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Silently fail on unsupported devices
    }
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}
