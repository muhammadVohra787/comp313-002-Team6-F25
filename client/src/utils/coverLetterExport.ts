export function buildCoverLetterWordHtml(
  coverLetterMarkdown: string,
  jobTitle?: string,
  companyName?: string
): string {
  const paragraphs = coverLetterMarkdown
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  const titleSuffix =
    jobTitle && companyName
      ? ` - ${jobTitle} at ${companyName}`
      : jobTitle
      ? ` - ${jobTitle}`
      : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cover Letter${titleSuffix}</title>
        <style>
          body {
            font-family: "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.5;
            margin: 1in;
          }
          p {
            margin: 0 0 10px 0;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;
}
