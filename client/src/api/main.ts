import { JobDescription } from "../models/coverLetter";
import { getWithAuth, postWithAuth } from "./base";

export const processTheJob = async (payload: JobDescription) => {
    return await postWithAuth("/cover-letter", payload);
};