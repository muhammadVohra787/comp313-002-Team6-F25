from PyPDF2 import PdfReader
import docx


def extract_text_from_file(file, filename):
    ext = filename.split('.')[-1].lower()
    text = ""

    if ext == "pdf":
        try:
            reader = PdfReader(file)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            text = "[PDF text could not be extracted]"
    elif ext in ["doc", "docx"]:
        try:
            doc = docx.Document(file)
            text = "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())
        except Exception:
            text = "[DOCX text could not be extracted]"
    elif ext == "txt":
        try:
            text = file.read().decode("utf-8", errors="ignore")
        except Exception:
            text = "[TXT file unreadable]"
    else:
        text = "[Unsupported file type]"

    # Clean up for LLM (remove excess whitespace, normalize newlines)
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    file.seek(0)
    return text