import { getConfig } from './environment'

// API Configuration
export const API_CONFIG = {
  BASE_URL: getConfig().API_URL,
  TIMEOUT: getConfig().TIMEOUT,
  RETRY_ATTEMPTS: getConfig().RETRY_ATTEMPTS,
}
