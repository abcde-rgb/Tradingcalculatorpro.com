import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../lib/store';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook for persisting component state to backend
 * Auto-saves after 1 second of inactivity
 * 
 * @param {string} stateId - Unique identifier for this state (e.g., "percentage_calculator")
 * @param {any} initialValue - Default value if no saved state exists
 * @returns {[state, setState, clearState, isLoading]} - State, setter, clear function, and loading status
 */
export function usePersistedState(stateId, initialValue) {
  const { token, isAuthenticated } = useAuthStore();
  const [state, setState] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Load saved state on mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    const loadState = async () => {
      try {
        const response = await fetch(`${API}/api/user-states/get/${stateId}`, { credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.state !== null && data.state !== undefined) {
            setState(data.state);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error loading persisted state:', error);
        }
      } finally {
        setIsLoading(false);
        isInitialMount.current = false;
      }
    };

    loadState();
  }, [stateId, token, isAuthenticated]); // Fixed: Added all dependencies

  // Auto-save with debounce (1 second after last change)
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current || !isAuthenticated || !token) {
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch(`${API}/api/user-states/save`, { credentials: 'include',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            state_id: stateId,
            state: state
          })
        });
      } catch (error) {
        // Non-blocking: log in dev, never interrupt user flow on save failure
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[usePersistedState] save failed:', error);
        }
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, stateId, token, isAuthenticated]); // Fixed: All dependencies included

  // Clear state function - memoized to prevent unnecessary re-renders
  const clearState = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      await fetch(`${API}/api/user-states/delete/${stateId}`, { credentials: 'include',
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setState(initialValue);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[usePersistedState] clear failed:', error);
      }
    }
  }, [stateId, token, isAuthenticated, initialValue]); // Fixed: All dependencies included

  return [state, setState, clearState, isLoading, isSaving];
}

/**
 * Hook for resetting ALL user states
 */
export function useResetAllStates() {
  const { token, isAuthenticated } = useAuthStore();

  const resetAll = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      const response = await fetch(`${API}/api/user-states/reset-all`, { credentials: 'include',
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Reload page to reset all states
        window.location.reload();
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useResetAllStates] reset failed:', error);
      }
    }
  }, [token, isAuthenticated]); // Fixed: All dependencies included

  return resetAll;
}
