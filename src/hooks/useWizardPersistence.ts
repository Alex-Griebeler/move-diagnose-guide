import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface WizardPersistenceOptions<T> {
  key: string;
  initialData: T;
  assessmentId: string;
}

export function useWizardPersistence<T>({ key, initialData, assessmentId }: WizardPersistenceOptions<T>) {
  const storageKey = `${key}_${assessmentId}`;
  const stepType = key.replace('_wizard', ''); // 'anamnesis', 'global_tests', 'segmental_tests'
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedDataRef = useRef<string>('');
  
  // Initialize state from localStorage first (fast), then sync with DB
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

  // Load from database on mount
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        const { data: draft, error } = await supabase
          .from('assessment_drafts')
          .select('draft_data, current_step')
          .eq('assessment_id', assessmentId)
          .eq('step_type', stepType)
          .maybeSingle();

        if (error) {
          console.error('Error loading draft from database:', error);
          setIsLoading(false);
          return;
        }

        if (draft && draft.draft_data) {
          const draftData = draft.draft_data as T;
          // Handle date restoration
          if (typeof draftData === 'object' && draftData !== null && 'birthDate' in draftData) {
            (draftData as Record<string, unknown>).birthDate = new Date((draftData as Record<string, unknown>).birthDate as string);
          }
          
          setData(draftData);
          setCurrentStep(draft.current_step || 1);
          
          // Update localStorage with DB data
          localStorage.setItem(storageKey, JSON.stringify(draftData));
          localStorage.setItem(`${storageKey}_step`, String(draft.current_step || 1));
          
          lastSyncedDataRef.current = JSON.stringify({ data: draftData, step: draft.current_step });
        }
      } catch (e) {
        console.error('Error loading from database:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromDatabase();
  }, [assessmentId, stepType, storageKey]);

  // Sync to database with debounce
  const syncToDatabase = useCallback(async (dataToSync: T, stepToSync: number) => {
    const syncKey = JSON.stringify({ data: dataToSync, step: stepToSync });
    
    // Skip if data hasn't changed
    if (syncKey === lastSyncedDataRef.current) {
      return;
    }

    setIsSyncing(true);
    try {
      // First check if draft exists
      const { data: existing } = await supabase
        .from('assessment_drafts')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('step_type', stepType)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing draft
        const result = await supabase
          .from('assessment_drafts')
          .update({
            draft_data: dataToSync as unknown as Json,
            current_step: stepToSync,
          })
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Insert new draft
        const result = await supabase
          .from('assessment_drafts')
          .insert([{
            assessment_id: assessmentId,
            step_type: stepType,
            draft_data: dataToSync as unknown as Json,
            current_step: stepToSync,
          }]);
        error = result.error;
      }

      if (error) {
        console.error('Error syncing to database:', error);
      } else {
        lastSyncedDataRef.current = syncKey;
        console.log(`[WizardPersistence] Synced ${stepType} to database`);
      }
    } catch (e) {
      console.error('Error syncing to database:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [assessmentId, stepType]);

  // Debounced sync effect
  useEffect(() => {
    if (isLoading) return;

    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Save to localStorage immediately
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving wizard data to localStorage:', e);
    }

    // Debounce database sync (2 seconds)
    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabase(data, currentStep);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [data, currentStep, isLoading, storageKey, syncToDatabase]);

  // Persist step to localStorage immediately
  useEffect(() => {
    if (isLoading) return;
    try {
      localStorage.setItem(`${storageKey}_step`, currentStep.toString());
    } catch (e) {
      console.error('Error saving wizard step to localStorage:', e);
    }
  }, [currentStep, storageKey, isLoading]);

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
  const clearPersistedData = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_step`);
    } catch (e) {
      console.error('Error clearing wizard data from localStorage:', e);
    }

    // Clear from database
    try {
      const { error } = await supabase
        .from('assessment_drafts')
        .delete()
        .eq('assessment_id', assessmentId)
        .eq('step_type', stepType);

      if (error) {
        console.error('Error clearing draft from database:', error);
      } else {
        console.log(`[WizardPersistence] Cleared ${stepType} draft from database`);
      }
    } catch (e) {
      console.error('Error clearing from database:', e);
    }

    lastSyncedDataRef.current = '';
  }, [storageKey, assessmentId, stepType]);

  // Force sync before unmount (for cases like browser close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      // Attempt sync (may not complete due to page unload)
      syncToDatabase(data, currentStep);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data, currentStep, syncToDatabase]);

  return {
    data,
    setData,
    updateData,
    currentStep,
    setCurrentStep,
    clearPersistedData,
    isLoading,
    isSyncing,
  };
}
