import { JobDescription } from "../models/coverLetter";
import { apiGet, apiPost } from "./base";

export const processTheJob = async (payload: JobDescription) => {
    return await apiPost("/cover-letter", payload);
};