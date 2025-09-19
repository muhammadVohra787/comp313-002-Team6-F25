import { JobDescription } from "../models/coverLetter";
import { GoogleUserInfo } from "../models/userModel";

declare global {
    interface Window {
        JobMateAuth: {
            setAuthData: (user: GoogleUserInfo, token: string) => Promise<void>;
            getAuthData: () => Promise<{ auth: { user: GoogleUserInfo; token: string } } | null>;
            removeAuthData: () => Promise<void>;
        };
        requestPageHTML: () => Promise<string>;
        loginWithGoogle: () => Promise<{ token: string }>;
        processTheJob: (payload: JobDescription) => Promise<any>;
    }
}