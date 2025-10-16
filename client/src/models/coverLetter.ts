// Payload sent to the backend cover-letter endpoint
export type JobDescription = {
    url: string;
    jobDescription: string; // raw HTML fragment
    jobTitle?: string | null;
    companyName?: string | null;
    location?: string | null;
    source?: string | null;
};
