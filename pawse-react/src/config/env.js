/**
 * Environment-driven configuration.
 * Replaces the old hardcoded config.js — the backend URL now comes from
 * an environment variable instead of being committed to source.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
