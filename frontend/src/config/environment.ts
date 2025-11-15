interface EnvironmentConfig {
  API_URL: string;
  TIMEOUT: number;
  RETRY_ATTEMPTS: number;
  // Add other environment-specific variables here
}

const development: EnvironmentConfig = {
  API_URL: (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000', // Direct backend URL in development
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

const production: EnvironmentConfig = {
  API_URL: (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000', // Use environment variable or direct backend URL
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 5,
};

export const getConfig = (): EnvironmentConfig => {
  if ((import.meta as any).env?.PROD) {
    return production;
  }
  return development;
};
