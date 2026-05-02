/** HttpOnly cookie: last time we sent a last-active ping (epoch ms). */
export const LAST_ACTIVE_COOKIE = "parcel_last_active_ms";

/** Skip pings more often than this (matches server-side UPDATE guard). */
export const LAST_ACTIVE_THROTTLE_MS = 10 * 60 * 1000;

export const LAST_ACTIVE_API_PATH = "/api/auth/last-active";
