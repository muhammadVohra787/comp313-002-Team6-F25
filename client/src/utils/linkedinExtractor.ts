import { getHtmlContent, getTextContent, normalizeText } from "./domUtils";

type LinkedInJobDetails = {
  jobDescription: string;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
};

// Helper function to extract job description from LinkedIn
function extractJobDescription(root: HTMLElement): string {
  // First try to find the "About the job" section
  const aboutSection = Array.from(
    root.querySelectorAll("h2, h3, h4, strong, span")
  ).find((el) => {
    const normalized = normalizeText(el.textContent);
    const lower = normalized?.toLowerCase();
    return (
      lower === "about the job" ||
      lower === "job description" ||
      lower === "about the role"
    );
  });

  if (aboutSection) {
    // Find the parent container that holds the job description
    let container = aboutSection.closest('section, div, article') || aboutSection.parentElement;
    
    // Get all text nodes after the "About the job" heading
    const walker = document.createTreeWalker(
      container || document,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => 
        node.parentNode?.nodeName !== 'SCRIPT' && 
        node.parentNode?.nodeName !== 'STYLE' ? 
        NodeFilter.FILTER_ACCEPT : 
        NodeFilter.FILTER_REJECT 
      }
    );

    let foundAbout = false;
    let descriptionText = '';
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = normalizeText(node.textContent) || '';
      
      if (!foundAbout) {
        // Look for the "About the job" text
        const lower = text.toLowerCase();
        if (lower.includes('about the job') || lower.includes('job description')) {
          foundAbout = true;
          // Get text after "About the job" in the same node if it exists
          const aboutIndex = lower.indexOf('about the job');
          if (aboutIndex > -1) {
            descriptionText += text.substring(aboutIndex + 'about the job'.length) + '\n';
          }
        }
      } else {
        // Stop if we hit another major section
        const parent = node.parentElement;
        if (parent && 
            (parent.tagName === 'H2' || 
             parent.tagName === 'H3' || 
             parent.classList.contains('jobs-box__footer') ||
             parent.classList.contains('jobs-apply-button'))) {
          break;
        }
        
        // Add the text if it's not empty
        if (text) {
          descriptionText += text + '\n';
        }
      }
    }

    if (descriptionText.trim()) {
      // Clean up the text
      return descriptionText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/^\s*about the job\s*[\-:]?\s*/i, '')
        .trim();
    }
  }

  // Fallback to the main content area
  const descriptionEl = 
    root.querySelector<HTMLElement>(".jobs-description__content") ||
    root.querySelector<HTMLElement>(".jobs-details__main-content") ||
    root.querySelector<HTMLElement>(".jobs-box__html-content");
  
  return normalizeText(descriptionEl?.textContent) || '';
}

// Export the updated LinkedIn extractor
export function extractLinkedInDetails(root: HTMLElement): LinkedInJobDetails {
  const jobTitle = getTextContent(root, [
    ".jobs-unified-top-card__job-title",
    "h1[data-test-job-title]",
    ".top-card-layout__title",
    "h1",
    ".job-title",
  ]);

  const companyName = getTextContent(root, [
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".jobs-details-top-card__company-info a",
    ".company-name",
    ".employer-name",
  ]);

  const location = getTextContent(root, [
    ".jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__primary-description",
    ".jobs-unified-top-card__subtitle-primary-group span",
    ".job-location",
    ".location",
  ]);

  return {
    jobDescription: extractJobDescription(root),
    jobTitle,
    companyName,
    location,
  };
}
