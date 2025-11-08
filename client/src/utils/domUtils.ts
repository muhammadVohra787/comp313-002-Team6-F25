// -----------------------------
// DOM Utility Functions
// -----------------------------
// These helper functions are used by the scraping logic
// to extract and clean text or HTML from web pages safely.

// Normalize text by collapsing extra spaces and trimming
export const normalizeText = (
  value: string | null | undefined
): string | null => {
  if (!value) return null;
  // Replace multiple whitespace characters with a single space
  const normalized = value.replace(/\s+/g, " ").trim();
  // Return null if the result is empty after cleanup
  return normalized.length ? normalized : null;
};

// Get clean text content from the first matching selector
export const getTextContent = (
  root: Document | HTMLElement,
  selectors: string[]
): string | null => {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el?.textContent) {
      const text = normalizeText(el.textContent);
      if (text) return text; // Return first valid match
    }
  }
  return null; // No matching non-empty text found
};

// Get raw inner HTML content from an element (or empty string if null)
export const getHtmlContent = (element: Element | null): string => {
  if (!element) return "";
  return element.innerHTML.trim();
};
