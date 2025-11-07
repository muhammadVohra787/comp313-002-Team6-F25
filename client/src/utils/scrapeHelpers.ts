// frontend-job-extractor.ts

import { JobDescription } from "../models/coverLetter";
import { extractLinkedInDetails } from "./linkedinExtractor";
import { getHtmlContent, getTextContent, normalizeText } from "./domUtils";

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

type ExtractedJobDetails = {
  jobDescription: string;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
};

export function detectJobSite(url: string): JobSite {
  if (url.includes("linkedin.com")) return JobSite.LINKEDIN;
  if (url.includes("google.com") && url.includes("search")) return JobSite.GOOGLE;
  if (url.includes("indeed.com")) return JobSite.INDEED;
  if (url.includes("monster.com")) return JobSite.MONSTER;
  if (url.includes("glassdoor.com")) return JobSite.GLASSDOOR;
  if (url.includes("careerbuilder.com")) return JobSite.CAREERBUILDER;
  if (url.includes("dice.com")) return JobSite.DICE;
  return JobSite.DEFAULT;
}

function extractIndeed(root: HTMLElement): ExtractedJobDetails {
  const descriptionEl =
    root.querySelector<HTMLElement>("#jobDescriptionText") ||
    root.querySelector<HTMLElement>(".jobsearch-JobComponent-description") ||
    root.querySelector<HTMLElement>(".job-description");

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
  const container =
    document.querySelector<HTMLElement>('div[jsname="sAN0nc"]') ||
    document.querySelector<HTMLElement>('div[jsname="Ym07we"]') ||
    document.querySelector<HTMLElement>('.job-description');

  const jobTitle = getTextContent(document, [
    'div[jsname="rOoJdc"]',
    'h2[data-profile-section-id="TITLE_SECTION"]',
    'h1',
    '.job-title',
  ]);

  const companyName = getTextContent(document, [
    'div[jsname="Nv5hHc"]',
    'div[data-profile-section-id="COMPANY"]',
    '.company-name',
  ]);

  const location = getTextContent(document, [
    'div[jsname="V0cE1c"]',
    'div[data-profile-section-id="LOCATION"]',
    '.job-location',
  ]);


  console.log("[GoogleJobs] Desc length:", getHtmlContent(container)?.length || 0);

  return {
    jobDescription: getHtmlContent(container),
    jobTitle,
    companyName,
    location,
  };
}


function extractFallback(root: HTMLElement): ExtractedJobDetails {
  // Try multiple strategies for unknown sites
  const jobTitle = normalizeText(
    root.querySelector("h1")?.textContent ||
    root.querySelector(".job-title")?.textContent ||
    root.querySelector(".title")?.textContent ||
    document.title ||
    ""
  );

  // Try to find the main content area
  const descriptionEl =
    root.querySelector<HTMLElement>("main") ||
    root.querySelector<HTMLElement>("article") ||
    root.querySelector<HTMLElement>(".job-description") ||
    root.querySelector<HTMLElement>(".description") ||
    root.querySelector<HTMLElement>(".content") ||
    root;

  // Try to extract company name from various patterns
  const companyName = getTextContent(root, [
    ".company-name",
    ".employer",
    ".company",
    ".employer-name",
    "[data-company]",
    ".job-company",
  ]);

  // Try to extract location from various patterns
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

export function buildPayload(url: string, root: HTMLElement): JobDescription {
  const jobSite = detectJobSite(url);
  let details: ExtractedJobDetails;

  switch (jobSite) {
    case JobSite.LINKEDIN:
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
      details = extractFallback(root);
      break;
  }

  return {
    url,
    jobDescription: details.jobDescription,
    jobTitle: details.jobTitle,
    companyName: details.companyName,
    location: details.location,
    source: jobSite,
  };
}


