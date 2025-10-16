export const normalizeText = (
  value: string | null | undefined
): string | null => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length ? normalized : null;
};

export const getTextContent = (
  root: Document | HTMLElement,
  selectors: string[]
): string | null => {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el?.textContent) {
      const text = normalizeText(el.textContent);
      if (text) return text;
    }
  }
  return null;
};

export const getHtmlContent = (element: Element | null): string => {
  if (!element) return "";
  return element.innerHTML.trim();
};
