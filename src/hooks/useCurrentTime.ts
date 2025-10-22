/**
 * useCurrentTime Hook
 * 
 * Provides a "current time" that updates every minute.
 * Uses a single global interval timer shared across all components.
 * 
 * This is efficient for presence indicators that need to update
 * relative time text (e.g., "Just now" → "Last seen 1m ago")
 */

import { useState, useEffect } from 'react';

// Global state
let currentTime = Date.now();
let listeners: Set<(time: number) => void> = new Set();
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the global timer if not already running
 */
function startGlobalTimer() {
  if (!intervalId) {
    intervalId = setInterval(() => {
      currentTime = Date.now();
      // Notify all listeners
      listeners.forEach(listener => listener(currentTime));
    }, 60000); // Update every minute
  }
}

/**
 * Stop the global timer if no more listeners
 */
function stopGlobalTimer() {
  if (intervalId && listeners.size === 0) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Hook that provides current time, updated every minute
 * All components using this hook share the same timer
 * 
 * @returns Current timestamp in milliseconds
 */
export function useCurrentTime(): number {
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    // Add this component to listeners
    listeners.add(setTime);
    
    // Start the global timer if this is the first listener
    startGlobalTimer();

    // Cleanup
    return () => {
      listeners.delete(setTime);
      stopGlobalTimer();
    };
  }, []);

  return time;
}

