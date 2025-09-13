import DOMPurify from 'dompurify';

export enum JobSite {
  LINKEDIN = "LinkedIn",
  GOOGLE = "Google Jobs",
  INDEED = "Indeed",
  DEFAULT = "Default",
}

export function detectJobSite(url: string): JobSite {
  if (url.includes("linkedin.com")) return JobSite.LINKEDIN;
  if (url.includes("google.com") && url.includes("search")) return JobSite.GOOGLE;
  if (url.includes("indeed.com")) return JobSite.INDEED;
  return JobSite.DEFAULT;
}

export function trimHtml(root: HTMLElement, jobSite: JobSite): string {
  let relevantElement: HTMLElement | null;

  switch (jobSite) {
    case JobSite.LINKEDIN:
      relevantElement = root.querySelector(".jobs-details__main-content");
      break;
    case JobSite.GOOGLE:
      const docId = getGoogleJobsDocId(window.location.href);
      relevantElement = document.querySelector(`c-wiz[data-encoded-docid="${docId}"]`);
      break;
    case JobSite.INDEED:
      relevantElement = root.querySelector("#jobDescriptionText");
      break;
    default:
      relevantElement = root;
  }

  // Get raw HTML and sanitize
  const html = relevantElement?.innerHTML || root.innerHTML;
  const cleanHtml = sanitizeHtml(html);

  // Convert sanitized HTML → text
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanHtml;
  return normalizeWhitespace(tempDiv.innerText);
}


function getGoogleJobsDocId(url: string): string | null {

  const decodedUrl = decodeURIComponent(url);
  const match = decodedUrl.match(/docid=([^&]+)/);

  return match ? match[1] : null;
}

export function sanitizeHtml(html: string): string {
  let clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a", "body", "h1", "h2", "h3", "h4", "h5", "h6", "p",
      "strong", "i", "ul", "li", "ol", "table", "tbody",
      "tr", "td", "th", "hr",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "width", "height", "colspan", "rowspan", "title"],
    RETURN_TRUSTED_TYPE: false,
  });

  // Additional cleanup
  return clean
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\{[\s\S]*?\}/g, "")
    .replace(/<div[^>]*>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<b>/gi, "<strong>")
    .replace(/<\/b>/gi, "</strong>")
    .replace(/<(\w+)[^>]*>/gi, "<$1>");
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r?\n\s*\r?\n/g, "\n\n")
    .replace(/\s+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n +/g, "\n")
    .trim();
}