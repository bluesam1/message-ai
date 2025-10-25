/**
 * Debounce utility for AI features
 * 
 * Prevents excessive API calls by delaying execution until after
 * a specified time has passed since the last invocation.
 */

/**
 * Debounce function that delays execution until after wait time has passed
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @param immediate - If true, execute on the leading edge instead of trailing
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Debounce function specifically for AI API calls with 2-second delay
 * @param func - Function to debounce
 * @returns Debounced function with 2-second delay
 */
export function debounceAI<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return debounce(func, 2000, false);
}

/**
 * Debounce function for real-time tone adjustment with 2-second delay
 * @param func - Function to debounce
 * @returns Debounced function with 2-second delay
 */
export function debounceToneAdjustment<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return debounce(func, 2000, false);
}

/**
 * Debounce function for smart replies generation with 2-second delay
 * @param func - Function to debounce
 * @returns Debounced function with 2-second delay
 */
export function debounceSmartReplies<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return debounce(func, 2000, false);
}

/**
 * Cancel a debounced function
 * @param debouncedFunc - The debounced function to cancel
 */
export function cancelDebounce(debouncedFunc: (...args: any[]) => void): void {
  // This is a simplified approach - in a real implementation,
  // you might want to return a cancel function from debounce
  console.warn('cancelDebounce: This is a placeholder implementation');
}

/**
 * Debounce hook for React components
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds (default: 2000)
 * @returns Debounced callback
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 2000
): (...args: Parameters<T>) => void {
  return debounce(callback, delay, false);
}
