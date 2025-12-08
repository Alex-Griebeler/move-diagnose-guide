import { useState, useEffect, useCallback } from 'react';

interface WizardPersistenceOptions<T> {
  key: string;
  initialData: T;
  assessmentId: string;
}

export function useWizardPersistence<T>({ key, initialData, assessmentId }: WizardPersistenceOptions<T>) {
  const storageKey = `${key}_${assessmentId}`;
  
  // Initialize state from localStorage or use initial data
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle date restoration for birthDate field
        if (parsed.birthDate) {
          parsed.birthDate = new Date(parsed.birthDate);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading wizard data from localStorage:', e);
    }
    return initialData;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}_step`);
      return stored ? parseInt(stored, 10) : 1;
    } catch {
      return 1;
    }
  });

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving wizard data to localStorage:', e);
    }
  }, [data, storageKey]);

  // Persist step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_step`, currentStep.toString());
    } catch (e) {
      console.error('Error saving wizard step to localStorage:', e);
    }
  }, [currentStep, storageKey]);

  // Update data function
  const updateData = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setData((prev) => {
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  // Clear persisted data (call after successful submit)
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_step`);
    } catch (e) {
      console.error('Error clearing wizard data from localStorage:', e);
    }
  }, [storageKey]);

  return {
    data,
    setData,
    updateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
  };
}
