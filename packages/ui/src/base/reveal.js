"use strict";
import { registerRefresh } from "./zazz-element.js";
/**
 * @fileoverview Scroll-based reveal animations.
 * @description A lightweight, configurable animation system for scroll-based
 * reveals and staggered animations, focused on viewport entry.
 *
 * @example
 * <!-- Single element -->
 * <div data-reveal="slide-up" data-reveal-duration="300">Content</div>
 *
 * @example
 * <!-- Stagger group (direct children are animated) -->
 * <div data-reveal-each="fade" data-reveal-step="100">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </div>
 */
/**
 * @description Reads a CSS custom property from `:root` computed styles.
 * @param name - Custom property name (e.g. "--ui-reveal-global-duration").
 * @returns Trimmed value, or "" when unset.
 */
function getRootCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
/**
 * @description Whether the engine computes stagger delays natively — reveal.css
 * derives each child's `--ui-reveal-wait` from `sibling-index()`. Where
 * unsupported (Firefox), `#configureStaggerGroup` falls back to writing a
 * per-child `--ui-reveal-wait` inline.
 */
const supportsSiblingIndex =
  typeof CSS !== "undefined" && CSS.supports("top", "calc(sibling-index() * 1px)");
/**
 * @description Parses a CSS time value into milliseconds.
 * @param value - CSS time string (e.g. "300ms", "0.5s") or bare number string.
 * @returns Duration in milliseconds.
 */
function parseCssTimeMs(value) {
  const str = value.trim();
  if (!str) return 0;
  if (/^-?\d*\.?\d+ms$/.test(str)) return parseFloat(str);
  if (/^-?\d*\.?\d+s$/.test(str)) return parseFloat(str) * 1000;
  return parseInt(str, 10) || 0;
}
/**
 * @class
 * @description Initializes viewport entry animations.
 *
 * @example
 * const reveal = new Reveal();
 *
 * @example
 * const reveal = new Reveal({
 *   config: {
 *     duration: 400,
 *     ease: "ease-in-out",
 *     threshold: 0.3,
 *     margin: "100px",
 *     step: 40,
 *   },
 * });
 */
class Reveal {
  /**
   * @description Default config from `--ui-reveal-global-*` tokens in `_reveal.css`.
   */
  static #readDefaultConfig() {
    return {
      margin: "0px",
      threshold: 0.2,
      duration: getRootCssVar("--ui-reveal-global-duration") || "400ms",
      ease: getRootCssVar("--ui-reveal-global-timing-function") || "cubic-bezier(0.4, 0, 0.2, 1)",
      wait: parseCssTimeMs(getRootCssVar("--ui-reveal-global-wait")),
      distance: getRootCssVar("--ui-reveal-global-distance") || "1rem",
      step: 80,
      grow: parseFloat(getRootCssVar("--ui-reveal-global-grow")) || 0.97,
      shrink: parseFloat(getRootCssVar("--ui-reveal-global-shrink")) || 1.03,
    };
  }
  static get defaultConfig() {
    return Reveal.#readDefaultConfig();
  }
  #observers = new Map();
  config;
  /**
   * @description Creates a new Reveal instance.
   *
   * @param options - Configuration options.
   */
  constructor(options = {}) {
    this.config = { ...Reveal.defaultConfig, ...options.config };
    this.init();
  }
  /**
   * @description Gets or creates an IntersectionObserver for a given set of options.
   *
   * @param options - Observer options.
   * @returns The observer instance.
   */
  #getObserver(options) {
    const optionsKey = JSON.stringify(options);
    let observer = this.#observers.get(optionsKey);
    if (!observer) {
      observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-viewport");
            obs.unobserve(entry.target);
          }
        });
      }, options);
      this.#observers.set(optionsKey, observer);
    }
    return observer;
  }
  /**
   * @description Gets IntersectionObserver options for an element.
   *
   * @param element - The element to get options for.
   * @returns Observer configuration options.
   */
  #getElementObserverOptions(element) {
    const margin = element.dataset.revealMargin || this.config.margin;
    const threshold = parseFloat(
      element.dataset.revealThreshold || this.config.threshold.toString(),
    );
    return {
      rootMargin: margin,
      threshold: Math.min(Math.max(threshold, 0), 1),
    };
  }
  /**
   * @description Normalizes a duration to a CSS time value without duplicating units.
   *
   * @param value - Milliseconds as a number, or a CSS time string.
   * @returns A CSS time value (e.g. "300ms", "0.333s").
   */
  #formatTime(value) {
    const str = value.toString().trim();
    if (/^-?\d*\.?\d+(ms|s)$/.test(str)) return str;
    return `${Math.max(0, parseInt(str, 10) || 0)}ms`;
  }
  /**
   * @description Sets CSS custom properties on an element when a value is provided.
   *
   * @param element - The element to set properties on.
   * @param properties - CSS custom properties to set.
   */
  #setRevealProperties(element, properties) {
    Object.entries(properties).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.style.setProperty(key, value.toString());
      }
    });
  }
  /**
   * @description Configures stagger animation properties and observes child elements.
   *
   * The stagger delay (`base + step × position`) is computed natively where
   * possible: the group carries `--ui-reveal-stagger-base`/`--ui-reveal-stagger-step`
   * and each child derives its own `--ui-reveal-wait` via `sibling-index()` in
   * reveal.css (reversed groups count from the end via `sibling-count()`).
   * Where unsupported (Firefox), the same math runs here and lands as a
   * per-child inline `--ui-reveal-wait`.
   *
   * @param groupElement - The parent stagger container.
   */
  #configureStaggerGroup(groupElement) {
    const dataset = groupElement.dataset;
    const groupOptions = this.#getElementObserverOptions(groupElement);
    const groupObserver = this.#getObserver(groupOptions);
    const groupProps = {
      step: Math.max(0, parseInt(dataset.revealStep || this.config.step.toString(), 10) || 0),
      duration: dataset.revealDuration
        ? Math.max(0, parseInt(dataset.revealDuration, 10) || 0)
        : this.config.duration,
      ease: dataset.revealEase || this.config.ease,
      baseWait: Math.max(0, parseInt(dataset.revealWait || this.config.wait.toString(), 10) || 0),
      distance: dataset.revealDistance || this.config.distance,
      order: dataset.revealOrder,
    };
    const childrenArray = Array.from(groupElement.children);
    const sequence = groupProps.order === "reversed" ? childrenArray.reverse() : childrenArray;
    if (supportsSiblingIndex) {
      this.#setRevealProperties(groupElement, {
        "--ui-reveal-stagger-base": `${groupProps.baseWait}ms`,
        "--ui-reveal-stagger-step": `${groupProps.step}ms`,
      });
    }
    sequence.forEach((child, i) => {
      if (!(child instanceof HTMLElement)) return;
      this.#setRevealProperties(child, {
        "--ui-reveal-duration": this.#formatTime(groupProps.duration),
        "--ui-reveal-ease": groupProps.ease,
        // Fallback only — natively each child computes this in reveal.css.
        "--ui-reveal-wait": supportsSiblingIndex
          ? null
          : `${groupProps.baseWait + groupProps.step * i}ms`,
        "--ui-reveal-distance": groupProps.distance,
        "--ui-reveal-scale": dataset.revealScale || null,
      });
      groupObserver.observe(child);
    });
  }
  /**
   * @description Configures animation properties for a single element and observes it.
   *
   * @param element - The element to configure and observe.
   */
  #configureSingleElement(element) {
    const dataset = element.dataset;
    const elementOptions = this.#getElementObserverOptions(element);
    const elementObserver = this.#getObserver(elementOptions);
    const elementDuration = dataset.revealDuration
      ? Math.max(0, parseInt(dataset.revealDuration, 10) || 0)
      : null;
    const elementWait = dataset.revealWait
      ? Math.max(0, parseInt(dataset.revealWait, 10) || 0)
      : null;
    this.#setRevealProperties(element, {
      "--ui-reveal-duration": elementDuration !== null ? this.#formatTime(elementDuration) : null,
      "--ui-reveal-wait": elementWait !== null ? this.#formatTime(elementWait) : null,
      "--ui-reveal-ease": dataset.revealEase || null,
      "--ui-reveal-distance": dataset.revealDistance || null,
      "--ui-reveal-scale": dataset.revealScale || null,
    });
    elementObserver.observe(element);
  }
  /**
   * @description Initializes the animation system by setting global CSS variables
   * and configuring all animated elements.
   */
  init() {
    this.#observers.forEach((observer) => observer.disconnect());
    this.#observers.clear();
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--ui-reveal-global-duration", this.#formatTime(this.config.duration));
    rootStyle.setProperty("--ui-reveal-global-timing-function", this.config.ease);
    rootStyle.setProperty("--ui-reveal-global-wait", this.#formatTime(this.config.wait));
    rootStyle.setProperty("--ui-reveal-global-distance", this.config.distance);
    rootStyle.setProperty("--ui-reveal-global-grow", this.config.grow.toString());
    rootStyle.setProperty("--ui-reveal-global-shrink", this.config.shrink.toString());
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      if (element instanceof HTMLElement) this.#configureSingleElement(element);
    });
    document.querySelectorAll("[data-reveal-each]").forEach((group) => {
      if (group instanceof HTMLElement) this.#configureStaggerGroup(group);
    });
  }
  /**
   * @description Reinitializes the animation system after dynamically adding elements.
   *
   * Disconnects old observers and rescans the document.
   *
   * @example
   * container.innerHTML = newContent;
   * reveal.refresh();
   */
  refresh() {
    this.init();
  }
}
// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  let autoInstance = null;
  const autoInit = () => {
    if (!autoInstance) {
      autoInstance = new Reveal();
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
  // After a SPA <main> swap, re-scan the new content for [data-reveal] targets.
  registerRefresh(() => Reveal.getAutoInstance()?.refresh());
  /**
   * @description Prevents automatic initialization on DOM ready.
   */
  Reveal.disableAutoInit = () => {
    autoInstance = "disabled";
  };
  /**
   * @description Returns the auto-initialized Reveal instance, if any.
   *
   * @returns The auto instance, or null when disabled or not yet created.
   */
  Reveal.getAutoInstance = () => {
    return autoInstance === "disabled" ? null : autoInstance;
  };
}
// Attach to window for the documented public API (`window.Reveal`, `new Reveal()`),
// and export for module consumers (navigation.js imports it via the main.js bundle).
if (typeof window !== "undefined") {
  window.Reveal = Reveal;
}
export { Reveal };
