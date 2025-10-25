/**
 * useToneAdjustment Hook
 * 
 * Manages real-time tone adjustment functionality with debouncing
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toneAdjustmentService } from '../services/ai/toneAdjustmentService';
import { debounceToneAdjustment } from '../utils/debounce';
import { UseToneAdjustmentReturn } from '../types/ai';

interface UseToneAdjustmentOptions {
  enabled?: boolean;
  debounceMs?: number;
  messageId?: string;
}

/**
 * Hook for managing tone adjustment functionality
 * @param options - Configuration options
 * @returns Tone adjustment state and methods
 */
export function useToneAdjustment({
  enabled = false,
  debounceMs = 2000,
  messageId,
}: UseToneAdjustmentOptions = {}): UseToneAdjustmentReturn {
  const [rephrasedText, setRephrasedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we're currently rephrasing
  const isRephrasingRef = useRef(false);
  
  // Ref to store the current message ID
  const messageIdRef = useRef(messageId);

  // Update ref when messageId changes
  useEffect(() => {
    messageIdRef.current = messageId;
  }, [messageId]);

  /**
   * Rephrase a message to the specified tone
   * @param text - Original message text
   * @param tone - Target tone ('formal' or 'casual')
   */
  const rephraseMessage = useCallback(async (text: string, tone: 'formal' | 'casual') => {
    if (!enabled || isRephrasingRef.current || !text.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      isRephrasingRef.current = true;

      const response = await toneAdjustmentService.rephraseAndSave(
        text,
        tone,
        messageIdRef.current
      );

      if (response.rephrasedText && response.rephrasedText !== text) {
        setRephrasedText(response.rephrasedText);
      } else {
        setRephrasedText(null);
      }
    } catch (err) {
      console.error('Error rephrasing message:', err);
      setError('Failed to rephrase message');
      setRephrasedText(null);
    } finally {
      setLoading(false);
      isRephrasingRef.current = false;
    }
  }, [enabled]);

  /**
   * Debounced version of rephraseMessage
   */
  const debouncedRephraseMessage = useCallback(
    debounceToneAdjustment(rephraseMessage),
    [rephraseMessage]
  );

  /**
   * Clear rephrased text and reset state
   */
  const clearRephrase = useCallback(() => {
    setRephrasedText(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Get existing rephrase for a specific tone
   * @param tone - Tone to get rephrase for
   */
  const getExistingRephrase = useCallback(async (tone: 'formal' | 'casual') => {
    if (!messageIdRef.current) {
      return null;
    }

    try {
      const existing = await toneAdjustmentService.getExistingRephrase(
        messageIdRef.current,
        tone
      );
      return existing;
    } catch (err) {
      console.error('Error getting existing rephrase:', err);
      return null;
    }
  }, []);

  /**
   * Check if message has rephrase history
   */
  const hasRephraseHistory = useCallback(async () => {
    if (!messageIdRef.current) {
      return false;
    }

    try {
      return await toneAdjustmentService.hasRephraseHistory(messageIdRef.current);
    } catch (err) {
      console.error('Error checking rephrase history:', err);
      return false;
    }
  }, []);

  /**
   * Rephrase message with real-time tone adjustment
   * @param text - Original message text
   * @param tone - Target tone ('formal' or 'casual')
   */
  const rephraseWithRealTime = useCallback(async (text: string, tone: 'formal' | 'casual') => {
    if (!enabled || !text.trim()) {
      return;
    }

    // Check if we already have this rephrase
    const existing = await getExistingRephrase(tone);
    if (existing) {
      setRephrasedText(existing);
      return;
    }

    // Generate new rephrase
    await debouncedRephraseMessage(text, tone);
  }, [enabled, getExistingRephrase, debouncedRephraseMessage]);

  /**
   * Accept the rephrased text
   * @param onAccept - Callback when rephrase is accepted
   */
  const acceptRephrase = useCallback((onAccept: (text: string) => void) => {
    if (rephrasedText) {
      onAccept(rephrasedText);
      clearRephrase();
    }
  }, [rephrasedText, clearRephrase]);

  /**
   * Reject the rephrased text
   */
  const rejectRephrase = useCallback(() => {
    clearRephrase();
  }, [clearRephrase]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRephrasingRef.current = false;
    };
  }, []);

  return {
    rephrasedText,
    loading,
    error,
    rephraseMessage: debouncedRephraseMessage,
    clearRephrase,
    getExistingRephrase,
    hasRephraseHistory,
    rephraseWithRealTime,
    acceptRephrase,
    rejectRephrase,
  };
}
