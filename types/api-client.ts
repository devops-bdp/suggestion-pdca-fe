import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  Method,
} from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://sugestion-system.vercel.app/api";

export const AUTH_TOKEN_KEY = "token";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
        },
      });

const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
      }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    }
  
  // Add cache busting for GET requests to prevent stale data
  if (config.method === "get" || config.method === "GET") {
    config.headers = config.headers ?? {};
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";
    
    // Add timestamp to prevent browser cache (only if not already present)
    if (config.url && !config.url.includes("_t=")) {
      const separator = config.url.includes("?") ? "&" : "?";
      config.url = `${config.url}${separator}_t=${Date.now()}`;
    }
  }
  
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message?.toLowerCase() || "";
      const requestUrl = error.config?.url || "";
      
      // Don't redirect if it's a login request (invalid credentials is expected)
      const isLoginRequest = requestUrl.includes("/auth/login");
      
      // Check if token is expired or invalid (not just invalid credentials)
      if (
        !isLoginRequest && (
          errorMessage.includes("token has expired") ||
          errorMessage.includes("token expired") ||
          errorMessage.includes("invalid token") ||
          errorMessage.includes("no token provided")
        )
      ) {
        // Clear expired token
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }

        // Redirect to login if we're in the browser and not already on login page
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
    }
      }
    }
    return Promise.reject(error);
    }
);

const handleRequest = async <T, D = unknown>(
  method: Method,
  endpoint: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
    try {
    // Log request details in development
    if (process.env.NODE_ENV === "development") {
      const logData = data && typeof data === 'object' 
        ? Object.fromEntries(
            Object.entries(data).map(([key, value]) => 
              [key, key === 'password' ? '***' : value]
            )
          )
        : data;
      console.log(`API ${method} ${endpoint}:`, {
        url: `${API_BASE_URL}${endpoint}`,
        data: logData,
        headers: axiosInstance.defaults.headers,
      });
    }

    const response: AxiosResponse<T> = await axiosInstance.request({
      url: endpoint,
      method,
      data,
      ...config,
      });

    // Log successful responses for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`API ${method} ${endpoint} Success:`, response.status, response.data);
      }

    return response.data;
    } catch (error) {
    const message = extractErrorMessage(error);
    
    // Enhanced logging for 500 errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      const requestConfig = error.config;
      
      if (status === 500) {
        console.error(`API Error [${endpoint}]:`, {
          status,
          message,
          responseData,
          requestUrl: `${API_BASE_URL}${endpoint}`,
          requestMethod: requestConfig?.method?.toUpperCase(),
          requestData: requestConfig?.data,
          requestHeaders: requestConfig?.headers,
      });
      } else if (status !== 401) {
        console.error(`API Error [${endpoint}]:`, message, responseData);
      }
    } else {
      console.error(`API Error [${endpoint}]:`, message);
    }
    
    throw new Error(message);
  }
};

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const responseData = axiosError.response?.data;
    
    // Try multiple possible error message fields
    const errorMessage = 
      responseData?.message || 
      responseData?.error ||
      (typeof responseData === "string" ? responseData : null) ||
      axiosError.message ||
      "API request failed";
    
    // For 500 errors, return clean message without duplication
    if (axiosError.response?.status === 500) {
      // If error message already contains "Internal server error", return as is
      if (errorMessage.toLowerCase().includes("internal server error")) {
        return errorMessage;
      }
      return `Internal server error: ${errorMessage}`;
    }
    
    return errorMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown API error";
};

export const logout = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const apiClient = {
  get: <T>(endpoint: string, config?: AxiosRequestConfig) =>
    handleRequest<T>("GET", endpoint, undefined, config),
  post: <T, D = unknown>(
    endpoint: string,
    data?: D,
    config?: AxiosRequestConfig
  ) => handleRequest<T, D>("POST", endpoint, data, config),
  put: <T, D = unknown>(
    endpoint: string,
    data?: D,
    config?: AxiosRequestConfig
  ) => handleRequest<T, D>("PUT", endpoint, data, config),
  delete: <T>(endpoint: string, config?: AxiosRequestConfig) =>
    handleRequest<T>("DELETE", endpoint, undefined, config),
};
