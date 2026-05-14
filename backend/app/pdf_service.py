import fitz  # PyMuPDF


def pdf_bytes_to_images(pdf_bytes: bytes, max_pages: int = 5):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    images = []

    for page_index in range(min(len(doc), max_pages)):
        page = doc[page_index]

        pix = page.get_pixmap(
            matrix=fitz.Matrix(2, 2),
            alpha=False,
        )

        image_bytes = pix.tobytes("jpg")
        images.append(image_bytes)

    doc.close()

    return images