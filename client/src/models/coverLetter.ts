// Defines the payload structure sent from the frontend to the backend
// when generating a new cover letter.
export type JobDescription = {
  url: string; // Job posting URL
  jobDescription: string; // Raw HTML fragment of the job description
  jobTitle?: string | null; // Optional: Job title from the page
  companyName?: string | null; // Optional: Company name
  location?: string | null; // Optional: Job location
  source?: string | null; // Optional: Website source (LinkedIn, Indeed, etc.)
  tone?: string; // User-selected tone (e.g., "professional", "casual")
  userPrompt?: string; // Optional: Additional user instructions to customize the letter
};

// Defines the structure of the response returned by the backend
// after generating or cleaning the job description.
export type CoverLetterResponse = {
  html: string; // The generated cover letter in HTML or Markdown format
  clean_job_description: string; // Sanitized version of the job description text
  url: string; // Job posting URL (echoed back from request)
  user_id: string; // ID of the authenticated user who generated it
  jobTitle?: string; // Optional: Job title (if available)
  companyName?: string; // Optional: Company name (if available)
  location?: string; // Optional: Job location (if available)
};
