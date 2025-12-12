import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('WizardPersistence');

interface WizardPersistenceOptions<T> {
  key: string;
  initialData: T;
  assessmentId: string;
}

// Minimal data stored in localStorage (no sensitive clinical data)
interface LocalStorageMinimalState {
  assessmentId: string;
  currentStep: number;
  lastUpdated: number;
  hasDatabaseDraft: boolean;
}

export function useWizardPersistence<T>({ key, initialData, assessmentId }: WizardPersistenceOptions<T>) {
  const storageKey = `${key}_minimal_${assessmentId}`;
  const stepType = key.replace('_wizard', ''); // 'anamnesis', 'global_tests', 'segmental_tests'
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedDataRef = useRef<string>('');
  
  // State initialized from initialData - actual data comes from database
  const [data, setData] = useState<T>(initialData);

  // Initialize step from localStorage (minimal, non-sensitive)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: LocalStorageMinimalState = JSON.parse(stored);
        if (parsed.assessmentId === assessmentId) {
          return parsed.currentStep || 1;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return 1;
  });

  // Load from database on mount (source of truth for sensitive data)
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
          logger.error('Error loading draft from database', error);
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
          
          // Update localStorage with MINIMAL state only (no sensitive data)
          const minimalState: LocalStorageMinimalState = {
            assessmentId,
            currentStep: draft.current_step || 1,
            lastUpdated: Date.now(),
            hasDatabaseDraft: true,
          };
          localStorage.setItem(storageKey, JSON.stringify(minimalState));
          
          lastSyncedDataRef.current = JSON.stringify({ data: draftData, step: draft.current_step });
        }
      } catch (e) {
        logger.error('Error loading from database', e);
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
        logger.error('Error syncing to database', error);
      } else {
        lastSyncedDataRef.current = syncKey;
        logger.debug(`Synced ${stepType} to database`);
        
        // Update localStorage with MINIMAL state only
        const minimalState: LocalStorageMinimalState = {
          assessmentId,
          currentStep: stepToSync,
          lastUpdated: Date.now(),
          hasDatabaseDraft: true,
        };
        localStorage.setItem(storageKey, JSON.stringify(minimalState));
      }
    } catch (e) {
      logger.error('Error syncing to database', e);
    } finally {
      setIsSyncing(false);
    }
  }, [assessmentId, stepType, storageKey]);

  // Debounced sync effect
  useEffect(() => {
    if (isLoading) return;

    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Save MINIMAL state to localStorage immediately (no sensitive data)
    try {
      const minimalState: LocalStorageMinimalState = {
        assessmentId,
        currentStep,
        lastUpdated: Date.now(),
        hasDatabaseDraft: lastSyncedDataRef.current !== '',
      };
      localStorage.setItem(storageKey, JSON.stringify(minimalState));
    } catch (e) {
      logger.error('Error saving minimal state to localStorage', e);
    }

    // Debounce database sync (2 seconds) - sensitive data goes to DB only
    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabase(data, currentStep);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [data, currentStep, isLoading, storageKey, syncToDatabase, assessmentId]);

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
    } catch (e) {
      logger.error('Error clearing minimal state from localStorage', e);
    }

    // Clear from database
    try {
      const { error } = await supabase
        .from('assessment_drafts')
        .delete()
        .eq('assessment_id', assessmentId)
        .eq('step_type', stepType);

      if (error) {
        logger.error('Error clearing draft from database', error);
      } else {
        logger.debug(`Cleared ${stepType} draft from database`);
      }
    } catch (e) {
      logger.error('Error clearing from database', e);
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
