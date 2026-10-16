/**
 * EventTrait.js
 * Isomorphic Event Trait and Runtime Abstraction Layer.
 * Provides unified event handling across Browser DOM (EventTarget) and Node.js (EventEmitter / headless).
 */

class EventTrait {
    static isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    static isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

    /**
     * Attaches an event listener to any target (DOM element, window, EventEmitter, or object).
     * @param {*} target 
     * @param {string} eventType 
     * @param {Function} callback 
     * @param {Object|boolean} [options] 
     */
    static addEventListener(target, eventType, callback, options) {
        if (!target) return;
        if (typeof target.addEventListener === 'function') {
            target.addEventListener(eventType, callback, options);
        } else if (typeof target.on === 'function') {
            target.on(eventType, callback);
        } else if (typeof target.addListener === 'function') {
            target.addListener(eventType, callback);
        }
    }

    /**
     * Alias for addEventListener.
     */
    static on(target, eventType, callback, options) {
        return this.addEventListener(target, eventType, callback, options);
    }

    /**
     * Removes an event listener.
     */
    static removeEventListener(target, eventType, callback, options) {
        if (!target) return;
        if (typeof target.removeEventListener === 'function') {
            target.removeEventListener(eventType, callback, options);
        } else if (typeof target.off === 'function') {
            target.off(eventType, callback);
        } else if (typeof target.removeListener === 'function') {
            target.removeListener(eventType, callback);
        }
    }

    /**
     * Alias for removeEventListener.
     */
    static off(target, eventType, callback, options) {
        return this.removeEventListener(target, eventType, callback, options);
    }

    /**
     * Dispatches an event on the target.
     */
    static dispatch(target, eventType, detail = {}) {
        if (!target) return;
        if (typeof target.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
            target.dispatchEvent(new CustomEvent(eventType, { detail }));
        } else if (typeof target.emit === 'function') {
            target.emit(eventType, detail);
        }
    }

    /**
     * Registers a callback to run when the page / simulation environment is fully loaded.
     * In browser: executes on window 'load' or immediately if already loaded.
     * In Node: executes asynchronously via setImmediate / process.nextTick.
     * @param {Function} callback 
     */
    static onLoad(callback) {
        if (this.isBrowser) {
            if (document.readyState === 'complete') {
                setTimeout(callback, 0);
            } else {
                window.addEventListener('load', callback);
            }
        } else if (this.isNode) {
            if (typeof setImmediate === 'function') {
                setImmediate(callback);
            } else {
                process.nextTick(callback);
            }
        }
    }

    /**
     * Registers a callback to run when DOM is interactive (or immediately in Node).
     * @param {Function} callback 
     */
    static onReady(callback) {
        if (this.isBrowser) {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(callback, 0);
            } else {
                window.addEventListener('DOMContentLoaded', callback);
            }
        } else if (this.isNode) {
            if (typeof setImmediate === 'function') {
                setImmediate(callback);
            } else {
                process.nextTick(callback);
            }
        }
    }
}

// Global browser registration
if (typeof window !== 'undefined') {
    window.EventTrait = EventTrait;
}

// CommonJS Node export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventTrait };
}
