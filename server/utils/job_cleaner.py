from bs4 import BeautifulSoup
import bleach
import re


def trim_html(job_html: str) -> str:
    """Sanitize + normalize an HTML job description block."""
    clean_html = sanitize_html(job_html)
    text = BeautifulSoup(clean_html, "html.parser").get_text()
    return normalize_whitespace(text)


def sanitize_html(html: str) -> str:
    allowed_tags = [
        "a", "body", "h1", "h2", "h3", "h4", "h5", "h6", "p",
        "strong", "i", "ul", "li", "ol", "table", "tbody",
        "tr", "td", "th", "hr",
    ]
    allowed_attrs = {
        "*": ["href", "src", "alt", "width", "height", "colspan", "rowspan", "title"]
    }

    clean = bleach.clean(
        html,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )

    # Extra cleanup like in JS
    clean = re.sub(r"<script[\s\S]*?</script>", "", clean, flags=re.I)
    clean = re.sub(r"<style[\s\S]*?</style>", "", clean, flags=re.I)
    clean = re.sub(r"\{[\s\S]*?\}", "", clean)  # remove inline {...}
    clean = re.sub(r"<div[^>]*>", "<p>", clean, flags=re.I)
    clean = re.sub(r"</div>", "</p>", clean, flags=re.I)
    clean = clean.replace("<b>", "<strong>").replace("</b>", "</strong>")
    clean = re.sub(r"<(\w+)[^>]*>", r"<\1>", clean)

    return clean


def normalize_whitespace(text: str) -> str:
    text = re.sub(r"\r?\n\s*\r?\n", "\n\n", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r" +\n", "\n", text)
    text = re.sub(r"\n +", "\n", text)
    return text.strip()
