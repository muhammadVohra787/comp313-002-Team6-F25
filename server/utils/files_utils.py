from PyPDF2 import PdfReader
import docx

def extract_text_from_file(file, filename):
    """
    Extracts text content from an uploaded file.
    Supports PDF, DOC/DOCX, and TXT formats.
    Returns a cleaned string version of the text.
    """

    # Get file extension in lowercase
    ext = filename.split('.')[-1].lower()
    text = ""

    # -------------------------------
    # Handle PDF extraction
    # -------------------------------
    if ext == "pdf":
        try:
            reader = PdfReader(file)
            # Extract text from each page and join with newlines
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            text = "[PDF text could not be extracted]"

    # -------------------------------
    # Handle Word document extraction
    # -------------------------------
    elif ext in ["doc", "docx"]:
        try:
            doc = docx.Document(file)
            # Collect all non-empty paragraphs
            text = "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())
        except Exception:
            text = "[DOCX text could not be extracted]"

    # -------------------------------
    # Handle plain text files
    # -------------------------------
    elif ext == "txt":
        try:
            # Decode bytes to UTF-8 text safely
            text = file.read().decode("utf-8", errors="ignore")
        except Exception:
            text = "[TXT file unreadable]"

    # -------------------------------
    # Unsupported file type
    # -------------------------------
    else:
        text = "[Unsupported file type]"

    # -------------------------------
    # Clean extracted text
    # -------------------------------
    # Remove extra whitespace and blank lines for cleaner output
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())

    # Reset file pointer for reuse after reading
    file.seek(0)

    # Return cleaned text string
    return text
