export async function getGoogleAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token: any) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      if (!token) {
        return reject(new Error("No token received from Google"));
      }

      // Some environments return a raw string, others an object with `.token`
      if (typeof token === "string") {
        return resolve(token);
      }
      if (typeof token === "object" && typeof token.token === "string") {
        return resolve(token.token);
      }

      return reject(new Error("Unexpected token format from chrome.identity"));
    });
  });
}
