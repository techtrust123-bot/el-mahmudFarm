/**
 * Custom Hook: useApi
 * Handles API calls with consistent error handling, loading states, and user feedback
 * Usage: const { data, loading, error, call } = useApi()
 */

import { useState, useCallback } from 'react';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const call = useCallback(async (apiFunction, options = {}) => {
    const { onSuccess, onError, showError = true } = options;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await apiFunction();

      if (!result.success && showError) {
        const errorMsg = result.message || 'An error occurred';
        setError(errorMsg);
        onError?.(result);
        return null;
      }

      setData(result.data || result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = err.message || 'An unexpected error occurred';
      if (showError) {
        setError(errorMsg);
      }
      onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    data,
    loading,
    error,
    call,
    clearError,
    reset
  };
};

export default useApi;
