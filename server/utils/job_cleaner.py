from bs4 import BeautifulSoup
import bleach
import re

def trim_html(job_html: str) -> str:
    """
    Sanitize and normalize a raw HTML job description.
    - Removes unsafe tags and attributes.
    - Converts to plain text.
    - Cleans up whitespace for better readability.
    """
    clean_html = sanitize_html(job_html)
    text = BeautifulSoup(clean_html, "html.parser").get_text()
    return normalize_whitespace(text)


def sanitize_html(html: str) -> str:
    """
    Remove unsafe or unnecessary HTML elements while keeping useful formatting.
    Only allows certain tags and attributes for safety.
    """
    allowed_tags = [
        "a", "body", "h1", "h2", "h3", "h4", "h5", "h6", "p",
        "strong", "i", "ul", "li", "ol", "table", "tbody",
        "tr", "td", "th", "hr",
    ]
    allowed_attrs = {
        "*": ["href", "src", "alt", "width", "height", "colspan", "rowspan", "title"]
    }

    # Use bleach to remove disallowed tags and attributes
    clean = bleach.clean(
        html,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )

    # Additional cleanup to strip unwanted content or tags
    clean = re.sub(r"<script[\s\S]*?</script>", "", clean, flags=re.I)  # remove scripts
    clean = re.sub(r"<style[\s\S]*?</style>", "", clean, flags=re.I)    # remove styles
    clean = re.sub(r"\{[\s\S]*?\}", "", clean)                          # remove inline CSS blocks
    clean = re.sub(r"<div[^>]*>", "<p>", clean, flags=re.I)             # replace <div> with <p>
    clean = re.sub(r"</div>", "</p>", clean, flags=re.I)
    clean = clean.replace("<b>", "<strong>").replace("</b>", "</strong>")  # normalize bold tags
    clean = re.sub(r"<(\w+)[^>]*>", r"<\1>", clean)                     # strip tag attributes

    return clean


def normalize_whitespace(text: str) -> str:
    """
    Normalize extra spaces and line breaks in plain text.
    Ensures clean, consistent formatting for display or LLM input.
    """
    text = re.sub(r"\r?\n\s*\r?\n", "\n\n", text)  # collapse multiple newlines
    text = re.sub(r"\s+", " ", text)               # collapse extra spaces
    text = re.sub(r" +\n", "\n", text)             # trim trailing spaces before newlines
    text = re.sub(r"\n +", "\n", text)             # trim leading spaces after newlines
    return text.strip()
