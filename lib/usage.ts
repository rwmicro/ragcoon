// Usage tracking is disabled in SQLite-only mode for simplicity
// In a self-hosted environment, rate limiting may not be necessary

const isFreeModel = (modelId: string) => true // All models are considered "free" in self-hosted
const isProModel = (modelId: string) => false

/**
 * Checks the user's daily usage - disabled in SQLite mode
 */
export async function checkUsage(userId: string) {
  // No usage limits in SQLite-only mode
  return {
    userData: { anonymous: false, premium: true, message_count: 0, daily_message_count: 0 },
    dailyCount: 0,
    dailyLimit: Infinity,
  }
}

/**
 * Increments usage - disabled in SQLite mode
 */
export async function incrementUsage(userId: string): Promise<void> {
  // No-op in SQLite mode
}

/**
 * Checks pro usage - disabled in SQLite mode
 */
export async function checkProUsage(userId: string) {
  return {
    dailyProCount: 0,
    limit: Infinity,
  }
}

/**
 * Increments pro usage - disabled in SQLite mode
 */
export async function incrementProUsage(userId: string) {
  // No-op in SQLite mode
}

/**
 * Checks usage by model - disabled in SQLite mode
 */
export async function checkUsageByModel(
  userId: string,
  modelId: string,
  isAuthenticated: boolean
) {
  return await checkUsage(userId)
}

/**
 * Increments usage by model - disabled in SQLite mode
 */
export async function incrementUsageByModel(
  userId: string,
  modelId: string,
  isAuthenticated: boolean
) {
  // No-op in SQLite mode
}