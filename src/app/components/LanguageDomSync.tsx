import { useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { translateText } from "../i18n/translations";

interface TextNodeEntry {
  original: string;
  translated: string;
}

const translatedTextNodes = new WeakMap<Text, TextNodeEntry>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();
const translatableAttributes = ["placeholder", "title", "aria-label", "alt"];
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "DEFS", "FILTER"]);

function getRoot() {
  return document.body;
}

function shouldSkipElement(element: Element | null) {
  return Boolean(element && ignoredTags.has(element.tagName));
}

function syncTextNode(node: Text, language: "ko" | "en") {
  if (shouldSkipElement(node.parentElement)) {
    return;
  }

  const current = node.nodeValue ?? "";
  const entry = translatedTextNodes.get(node);

  let original: string;
  if (entry === undefined) {
    // First time seeing this node
    original = current;
  } else if (current === entry.translated) {
    // Current value is what we last set — use stored original
    original = entry.original;
  } else {
    // Current value differs from our last translation — text was externally updated
    // (e.g. typing animation, React state change). Treat current as the new original.
    original = current;
  }

  const translated = translateText(original, language);

  if (translated !== original) {
    translatedTextNodes.set(node, { original, translated });
  }

  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
}

function syncElementAttributes(element: Element, language: "ko" | "en") {
  if (shouldSkipElement(element)) {
    return;
  }

  for (const attr of translatableAttributes) {
    const current = element.getAttribute(attr);
    const originalAttrs = translatedAttributes.get(element);

    if (!current) {
      continue;
    }

    const original = originalAttrs?.get(attr) ?? current;
    const translated = translateText(original, language);

    if (translated !== original) {
      if (!translatedAttributes.has(element)) {
        translatedAttributes.set(element, new Map());
      }
      const stored = translatedAttributes.get(element);
      if (stored && !stored.has(attr)) {
        stored.set(attr, original);
      }
      if (current !== translated) {
        element.setAttribute(attr, translated);
      }
    }
  }
}

function syncSubtree(root: HTMLElement, language: "ko" | "en") {
  syncElementAttributes(root, language);

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let elementNode = elementWalker.nextNode();
  while (elementNode) {
    syncElementAttributes(elementNode as Element, language);
    elementNode = elementWalker.nextNode();
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    syncTextNode(textNode as Text, language);
    textNode = textWalker.nextNode();
  }
}

export function LanguageDomSync() {
  const { language } = useLanguage();

  useEffect(() => {
    const root = getRoot();
    let applying = false;

    const applyTranslations = () => {
      if (applying) {
        return;
      }

      applying = true;
      syncSubtree(root, language);
      applying = false;
    };

    applyTranslations();

    const observer = new MutationObserver(() => {
      if (!applying) {
        window.requestAnimationFrame(applyTranslations);
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: translatableAttributes,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
