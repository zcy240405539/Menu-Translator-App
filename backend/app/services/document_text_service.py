import ipaddress
import os
import socket
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests


MAX_MARKDOWN_INPUT_BYTES = int(os.getenv("MARKITDOWN_MAX_INPUT_BYTES", str(15 * 1024 * 1024)))
URL_FETCH_TIMEOUT_SECONDS = int(os.getenv("MARKITDOWN_URL_TIMEOUT_SECONDS", "20"))
URL_MAX_REDIRECTS = int(os.getenv("MARKITDOWN_URL_MAX_REDIRECTS", "5"))
URL_USER_AGENT = os.getenv(
    "MARKITDOWN_USER_AGENT",
    "MenuTranslatorApp/1.0 (+https://ai-menu-app.onrender.com)",
)


IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


def is_image_content(content_type: str = "", filename: str = "") -> bool:
    content_type = (content_type or "").split(";")[0].strip().lower()
    if content_type in IMAGE_CONTENT_TYPES or content_type.startswith("image/"):
        return True

    suffix = Path(filename or "").suffix.lower()
    return suffix in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def _load_markitdown():
    try:
        from markitdown import MarkItDown
    except Exception as exc:
        raise RuntimeError(
            "MarkItDown is not installed. Install backend requirements with markitdown extras."
        ) from exc

    return MarkItDown(enable_plugins=False)


def _extract_result_text(result) -> str:
    text = (
        getattr(result, "text_content", None)
        or getattr(result, "markdown", None)
        or getattr(result, "text", None)
        or ""
    )
    return str(text or "").strip()


def _safe_suffix(filename: str = "", content_type: str = "") -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix and len(suffix) <= 12:
        return suffix

    content_type = (content_type or "").split(";")[0].strip().lower()
    return {
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "text/html": ".html",
        "text/csv": ".csv",
        "application/json": ".json",
        "text/plain": ".txt",
    }.get(content_type, ".bin")


def _assert_size_allowed(file_bytes: bytes) -> None:
    if len(file_bytes or b"") > MAX_MARKDOWN_INPUT_BYTES:
        raise ValueError(
            f"File is too large for MarkItDown extraction. Max bytes: {MAX_MARKDOWN_INPUT_BYTES}"
        )


def extract_markdown_from_file_bytes(
    file_bytes: bytes,
    filename: str = "menu",
    content_type: str = "application/octet-stream",
) -> str:
    _assert_size_allowed(file_bytes)
    suffix = _safe_suffix(filename, content_type)
    md = _load_markitdown()
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        converter = getattr(md, "convert_local", None) or md.convert
        result = converter(temp_path)
        text = _extract_result_text(result)

        if not text:
            raise ValueError("MarkItDown returned empty text.")

        return text

    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass


def _is_blocked_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return True

    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_public_http_url(url: str) -> str:
    parsed = urlparse(str(url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https menu URLs are supported.")

    if not parsed.hostname:
        raise ValueError("Menu URL must include a hostname.")

    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Menu URL hostname could not be resolved.") from exc

    for address in addresses:
        ip = address[4][0]
        if _is_blocked_ip(ip):
            raise ValueError("Menu URL points to a private or restricted network address.")

    return parsed.geturl()


def extract_markdown_from_url(url: str) -> str:
    safe_url = validate_public_http_url(url)
    md = _load_markitdown()

    response = None
    current_url = safe_url

    for _ in range(URL_MAX_REDIRECTS + 1):
        response = requests.get(
            current_url,
            timeout=URL_FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": URL_USER_AGENT},
            stream=True,
            allow_redirects=False,
        )

        if not response.is_redirect:
            break

        redirect_location = response.headers.get("Location")
        if not redirect_location:
            raise ValueError("Menu URL redirect did not include a destination.")

        current_url = validate_public_http_url(urljoin(current_url, redirect_location))
    else:
        raise ValueError("Menu URL redirected too many times.")

    if response is None:
        raise ValueError("Menu URL could not be fetched.")

    response.raise_for_status()

    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > MAX_MARKDOWN_INPUT_BYTES:
                raise ValueError(
                    f"URL content is too large for MarkItDown extraction. Max bytes: {MAX_MARKDOWN_INPUT_BYTES}"
                )
        except ValueError:
            if content_length.strip().isdigit():
                raise

    chunks = []
    total_bytes = 0
    for chunk in response.iter_content(chunk_size=65536):
        if not chunk:
            continue
        total_bytes += len(chunk)
        if total_bytes > MAX_MARKDOWN_INPUT_BYTES:
            raise ValueError(
                f"URL content is too large for MarkItDown extraction. Max bytes: {MAX_MARKDOWN_INPUT_BYTES}"
            )
        chunks.append(chunk)

    content = b"".join(chunks)
    _assert_size_allowed(content)
    response._content = content

    converter = getattr(md, "convert_response", None)
    if converter:
        result = converter(response)
    else:
        result = md.convert_stream(BytesIO(content))

    text = _extract_result_text(result)
    if not text:
        raise ValueError("MarkItDown returned empty text for the URL.")

    return text


def ocr_blocks_to_markdown(ocr_blocks: list[dict], source_label: str = "image_ocr") -> str:
    sorted_blocks = sorted(
        [block for block in ocr_blocks if str(block.get("text") or "").strip()],
        key=lambda block: (
            float(block.get("y_min") or block.get("center_y") or 0),
            float(block.get("x_min") or block.get("center_x") or 0),
        ),
    )

    lines = [
        "# Extracted menu text",
        "",
        f"Source: {source_label}",
        "",
    ]

    for index, block in enumerate(sorted_blocks, start=1):
        text = str(block.get("text") or "").strip()
        confidence = block.get("confidence")
        if confidence is not None:
            lines.append(f"{index}. {text}  <!-- confidence: {confidence} -->")
        else:
            lines.append(f"{index}. {text}")

    return "\n".join(lines).strip()
