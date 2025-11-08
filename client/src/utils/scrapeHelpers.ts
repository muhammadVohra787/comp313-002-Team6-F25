// frontend-job-extractor.ts
// This module figures out which job site the user is on,
// extracts the job details from the DOM, and returns a unified payload
// that the rest of the extension can use.

import { JobDescription } from "../models/coverLetter";
import { extractLinkedInDetails } from "./linkedinExtractor";
import { getHtmlContent, getTextContent, normalizeText } from "./domUtils";

// Known job sites we want to recognize
export enum JobSite {
  LINKEDIN = "LinkedIn",
  GOOGLE = "Google Jobs",
  INDEED = "Indeed",
  MONSTER = "Monster",
  GLASSDOOR = "Glassdoor",
  CAREERBUILDER = "CareerBuilder",
  DICE = "Dice",
  DEFAULT = "Default",
}

// Internal shape for data we extract from the page
// (this later becomes part of JobDescription)
type ExtractedJobDetails = {
  jobDescription: string;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
};

// Try to detect which job site we're on based on the URL
export function detectJobSite(url: string): JobSite {
  if (url.includes("linkedin.com")) return JobSite.LINKEDIN;
  if (url.includes("google.com") && url.includes("search"))
    return JobSite.GOOGLE;
  if (url.includes("indeed.com")) return JobSite.INDEED;
  if (url.includes("monster.com")) return JobSite.MONSTER;
  if (url.includes("glassdoor.com")) return JobSite.GLASSDOOR;
  if (url.includes("careerbuilder.com")) return JobSite.CAREERBUILDER;
  if (url.includes("dice.com")) return JobSite.DICE;
  // fallback for unknown sites
  return JobSite.DEFAULT;
}

// -----------------------------
// Site-specific extractors
// -----------------------------

function extractIndeed(root: HTMLElement): ExtractedJobDetails {
  // Try the most common Indeed job description containers
  const descriptionEl =
    root.querySelector<HTMLElement>("#jobDescriptionText") ||
    root.querySelector<HTMLElement>(".jobsearch-JobComponent-description") ||
    root.querySelector<HTMLElement>(".job-description");

  // Try multiple selectors because Indeed changes layout often
  const jobTitle = getTextContent(root, [
    ".jobsearch-JobInfoHeader-title",
    "h1.jobsearch-JobInfoHeader-title",
    "h1",
    ".job-title",
    ".icl-u-xs-mb--xs",
  ]);

  const companyName = getTextContent(root, [
    ".jobsearch-InlineCompanyRating div:first-child",
    ".jobsearch-CompanyInfoWithoutHeaderImage div:first-child span",
    "[data-company-name]",
    ".company-name",
    ".employer-name",
  ]);

  const location = getTextContent(root, [
    ".jobsearch-JobInfoHeader-subtitle div:nth-child(2)",
    ".jobsearch-CompanyInfoWithoutHeaderImage div:nth-child(2)",
    ".jobsearch-CompanyInfoWithReview div:nth-child(2)",
    ".job-location",
    ".location",
  ]);

  return {
    jobDescription: getHtmlContent(descriptionEl),
    jobTitle,
    companyName,
    location,
  };
}

function extractMonster(root: HTMLElement): ExtractedJobDetails {
  // Monster also uses a few different wrappers for the description
  const descriptionEl =
    root.querySelector<HTMLElement>(".job-description") ||
    root.querySelector<HTMLElement>("#JobDescription") ||
    root.querySelector<HTMLElement>(".job-content");

  const jobTitle = getTextContent(root, [
    "h1",
    ".job-title",
    ".title",
    ".jobTitle",
  ]);

  const companyName = getTextContent(root, [
    ".company-name",
    ".employer",
    ".company",
    "[data-company]",
  ]);

  const location = getTextContent(root, [
    ".job-location",
    ".location",
    ".jobLocation",
  ]);

  return {
    jobDescription: getHtmlContent(descriptionEl),
    jobTitle,
    companyName,
    location,
  };
}

function extractGlassdoor(root: HTMLElement): ExtractedJobDetails {
  // Glassdoor uses jobDescription / containers inside its job view
  const descriptionEl =
    root.querySelector<HTMLElement>(".jobDescription") ||
    root.querySelector<HTMLElement>("#JobDescriptionContainer") ||
    root.querySelector<HTMLElement>(".job-view-layout");

  const jobTitle = getTextContent(root, [
    "h1",
    ".job-title",
    ".jobTitle",
    "[data-test='job-title']",
  ]);

  const companyName = getTextContent(root, [
    ".employer-name",
    ".company-name",
    ".companyName",
    "[data-test='employer-name']",
  ]);

  const location = getTextContent(root, [
    ".job-location",
    ".location",
    ".jobLocation",
    "[data-test='location']",
  ]);

  return {
    jobDescription: getHtmlContent(descriptionEl),
    jobTitle,
    companyName,
    location,
  };
}

function extractGoogleJobs(): ExtractedJobDetails {
  // Google Jobs is rendered inside a special panel, so we query document directly
  const container =
    document.querySelector<HTMLElement>('div[jsname="sAN0nc"]') ||
    document.querySelector<HTMLElement>('div[jsname="Ym07we"]') ||
    document.querySelector<HTMLElement>(".job-description");

  const jobTitle = getTextContent(document, [
    'div[jsname="rOoJdc"]',
    'h2[data-profile-section-id="TITLE_SECTION"]',
    "h1",
    ".job-title",
  ]);

  const companyName = getTextContent(document, [
    'div[jsname="Nv5hHc"]',
    'div[data-profile-section-id="COMPANY"]',
    ".company-name",
  ]);

  const location = getTextContent(document, [
    'div[jsname="V0cE1c"]',
    'div[data-profile-section-id="LOCATION"]',
    ".job-location",
  ]);

  // helpful logging during debugging
  console.log(
    "[GoogleJobs] Desc length:",
    getHtmlContent(container)?.length || 0
  );

  return {
    jobDescription: getHtmlContent(container),
    jobTitle,
    companyName,
    location,
  };
}

// Fallback extractor for sites we don't explicitly support
function extractFallback(root: HTMLElement): ExtractedJobDetails {
  // Try to grab job title from common places or just use page title
  const jobTitle = normalizeText(
    root.querySelector("h1")?.textContent ||
      root.querySelector(".job-title")?.textContent ||
      root.querySelector(".title")?.textContent ||
      document.title ||
      ""
  );

  // Try to find a "main" block that looks like job content
  const descriptionEl =
    root.querySelector<HTMLElement>("main") ||
    root.querySelector<HTMLElement>("article") ||
    root.querySelector<HTMLElement>(".job-description") ||
    root.querySelector<HTMLElement>(".description") ||
    root.querySelector<HTMLElement>(".content") ||
    root; // last resort: entire page

  // Try to extract company name from likely selectors
  const companyName = getTextContent(root, [
    ".company-name",
    ".employer",
    ".company",
    ".employer-name",
    "[data-company]",
    ".job-company",
  ]);

  // Try to extract location from likely selectors
  const location = getTextContent(root, [
    ".job-location",
    ".location",
    ".jobLocation",
    ".workplace",
  ]);

  return {
    jobDescription: getHtmlContent(descriptionEl),
    jobTitle,
    companyName,
    location,
  };
}

// -----------------------------
// Public function: buildPayload
// -----------------------------
// This is what the content script calls.
// It figures out which site we're on, runs the right extractor,
// and returns a JobDescription that the backend expects.
export function buildPayload(url: string, root: HTMLElement): JobDescription {
  const jobSite = detectJobSite(url);
  let details: ExtractedJobDetails;

  switch (jobSite) {
    case JobSite.LINKEDIN:
      // LinkedIn has its own extractor because its DOM is very custom
      details = extractLinkedInDetails(root);
      break;
    case JobSite.INDEED:
      details = extractIndeed(root);
      break;
    case JobSite.GOOGLE:
      details = extractGoogleJobs();
      break;
    case JobSite.MONSTER:
      details = extractMonster(root);
      break;
    case JobSite.GLASSDOOR:
      details = extractGlassdoor(root);
      break;
    default:
      // fallback for any unknown job board
      details = extractFallback(root);
      break;
  }

  // Wrap everything in the shape the backend expects
  return {
    url,
    jobDescription: details.jobDescription,
    jobTitle: details.jobTitle,
    companyName: details.companyName,
    location: details.location,
    source: jobSite, // store where we scraped it from
  };
}
