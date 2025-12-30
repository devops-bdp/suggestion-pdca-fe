import { useState, useEffect } from "react";
import { apiClient } from "./api-client";

export interface UseDataOptions {
  endpoint: string;
  immediate?: boolean;
}

export interface UseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useData<T>({
  endpoint,
  immediate = true,
}: UseDataOptions): UseDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<unknown>(endpoint);
      
      // Handle different possible response structures
      // API response can be: 
      // 1. { success: true, data: [...] } - Most common
      // 2. { data: [...] }
      // 3. Direct array [...]
      let extractedData = result;
      
      // Check if result has a data property (most common case)
      // API response structure: { success: true, data: [...], pagination: {...} }
      if (result && typeof result === 'object') {
        // Priority: Check for data property first
        if ('data' in result && result.data !== undefined) {
          extractedData = result.data;
        }
      }
      
      
      // Set data - handle both array and object responses
      if (Array.isArray(extractedData)) {
        setData(extractedData as T);
      } else if (extractedData && typeof extractedData === 'object') {
        // If it's an object, use it directly
        setData(extractedData as T);
      } else {
        // Fallback: use result as is
        setData(result as T);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset data immediately when endpoint changes to prevent stale data
    setData(null);
    setError(null);
    setLoading(true);
    
    if (immediate) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, immediate]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export function useMutation<T, R>(method: "post" | "put" | "delete") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (endpoint: string, payload?: T): Promise<R | null> => {
    setLoading(true);
    setError(null);
    try {
      let result: R;
      if (method === "delete") {
        result = await apiClient.delete<R>(endpoint);
      } else if (method === "post") {
        result = await apiClient.post<R, T>(endpoint, payload);
      } else {
        result = await apiClient.put<R, T>(endpoint, payload);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Operation failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error,
  };
}
