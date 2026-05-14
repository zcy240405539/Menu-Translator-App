import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"
os.environ["FLAGS_cpu_deterministic"] = "1"
import tempfile
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from paddleocr import PaddleOCR


ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang="en",
    use_gpu=False,
    enable_mkldnn=False,
    show_log=False
)

def save_resized_image(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        original_path = tmp.name
        tmp.write(file_bytes)

    image = Image.open(original_path).convert("RGB")

    max_width = 1400
    max_height = 2000

    w, h = image.size
    ratio = min(max_width / w, max_height / h, 1)

    if ratio < 1:
        new_size = (int(w * ratio), int(h * ratio))
        image = image.resize(new_size, Image.LANCZOS)

    resized_path = original_path.replace(".jpg", "_resized.jpg")
    image.save(resized_path, "JPEG", quality=90)

    return resized_path

def extract_text_from_image(file_bytes: bytes) -> str:
    image_path = save_resized_image(file_bytes)

    result = ocr_engine.ocr(image_path, cls=True)

    lines = []

    for page in result:
        if not page:
            continue

        for item in page:
            text = item[1][0]
            confidence = item[1][1]

            if confidence >= 0.30:
                lines.append(text)

    return "\n".join(lines)

def extract_layout_blocks_from_image(file_bytes: bytes) -> list:
    image_path = save_resized_image(file_bytes)
    result = ocr_engine.ocr(image_path, cls=True)

    blocks = []
    for page in result:
        if not page:
            continue

        for item in page:
            box = item[0]
            text = item[1][0]
            confidence = item[1][1]

            if confidence < 0.30:
                continue

            xs = [point[0] for point in box]
            ys = [point[1] for point in box]

            blocks.append({
                "text": text,
                "x_min": min(xs),
                "y_min": min(ys),
                "x_max": max(xs),
                "y_max": max(ys),
                "center_x": sum(xs) / len(xs),
                "center_y": sum(ys) / len(ys),
                "confidence": round(float(confidence), 4),
            })

    blocks = sorted(blocks, key=lambda b: (b["center_y"], b["center_x"]))

    return blocks