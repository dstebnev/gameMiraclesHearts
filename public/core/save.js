const KEY_PREFIX = 'gmh-save-';
/**
 * Automatically persist game state to a default slot in localStorage.
 * Currently uses slot 0.
 */
export let lastSave = null;
export function autoSave(state) {
    lastSave = JSON.parse(JSON.stringify(state));
    localStorage.setItem(`${KEY_PREFIX}0`, JSON.stringify(state));
}
/**
 * Load a previously saved game state from the given slot.
 */
export function load(slot) {
    const raw = localStorage.getItem(`${KEY_PREFIX}${slot}`);
    return raw ? JSON.parse(raw) : null;
}
