/**
 * Minimal store version flag used by absence pages.
 * Bump when you change local storage shape or cached keys.
 */
export const STORE_VERSION = 'v1';

export function getStoreVersion(): string {
  return STORE_VERSION;
}
