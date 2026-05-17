import fitz  # PyMuPDF


def extract_text_from_pdf_bytes(file_bytes: bytes, max_pages: int = 5) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    texts = []

    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        text = page.get_text("text")
        if text:
            texts.append(text)

    return "\n".join(texts).strip()