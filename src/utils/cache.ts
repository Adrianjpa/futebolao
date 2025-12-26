
/**
 * Generic Caching Utility for Firestore Data
 * Stores data in localStorage to reduce read quotas.
 */

export interface CacheOptions {
    key: string;
    ttlMinutes: number;
}

export async function getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMinutes: number = 60
): Promise<T> {
    if (typeof window === 'undefined') {
        // Server-side (no localStorage), just fetch
        return fetcher();
    }

    const cached = localStorage.getItem(key);
    const now = new Date().getTime();

    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            const age = (now - parsed.timestamp) / (1000 * 60); // Age in minutes

            if (age < ttlMinutes) {
                console.log(`[Cache Hit] ${key} - Age: ${Math.round(age)}m`);
                return parsed.data as T;
            } else {
                console.log(`[Cache Expired] ${key} - Age: ${Math.round(age)}m > TTL: ${ttlMinutes}m`);
            }
        } catch (e) {
            console.warn(`[Cache Error] Failed to parse ${key}`, e);
            localStorage.removeItem(key);
        }
    }

    // Fetch fresh data
    console.log(`[Cache Miss] Fetching ${key}...`);
    const data = await fetcher();

    // Save to cache
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: now,
            data: data
        }));
    } catch (e) {
        console.warn("Storage quota exceeded or error saving cache", e);
    }

    return data;
}

/**
 * Clear specific cache key
 */
export function clearCache(key: string) {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
    }
}
