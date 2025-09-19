// frontend-job-extractor.ts

import { JobDescription } from "../models/coverLetter";

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

export function extractJobDescription(jobSite: JobSite, root: HTMLElement, url: string): string {
  let relevantElement: HTMLElement | null = null;

  switch (jobSite) {
    case JobSite.LINKEDIN:
      relevantElement = root.querySelector(".jobs-details__main-content");
      break;
    case JobSite.GOOGLE:
      const docId = getGoogleJobsDocId(url);
      relevantElement = document.querySelector(`c-wiz[data-encoded-docid="${docId}"]`);
      break;
    case JobSite.INDEED:
      relevantElement = root.querySelector("#jobDescriptionText");
      break;
    default:
      relevantElement = root;
  }

  return relevantElement?.innerHTML || "";
}

function getGoogleJobsDocId(url: string): string | null {
  const decodedUrl = decodeURIComponent(url);
  const match = decodedUrl.match(/docid=([^&]+)/);
  return match ? match[1] : null;
}

export function buildPayload(url: string, root: HTMLElement): JobDescription {
  const jobSite = detectJobSite(url);
  const jobHtml = extractJobDescription(jobSite, root, url);

  return {
    url,
    jobDescription: jobHtml,
  };
}
