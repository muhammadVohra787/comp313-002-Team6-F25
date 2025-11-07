// // Payload sent to the backend cover-letter endpoint
// export type JobDescription = {
//     url: string;
//     jobDescription: string; // raw HTML fragment
//     jobTitle?: string | null;
//     companyName?: string | null;
//     location?: string | null;
//     source?: string | null;
// };

// Payload sent to the backend cover-letter endpoint
export type JobDescription = {
  url: string;
  jobDescription: string; // raw HTML fragment
  jobTitle?: string | null;
  companyName?: string | null;
  location?: string | null;
  source?: string | null;
  tone?: string; // NEW: professional, casual, enthusiastic
  userPrompt?: string; // NEW: additional instructions
};

// Response from backend
export type CoverLetterResponse = {
  html: string;
  clean_job_description: string;
  url: string;
  user_id: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
};
