import ipaddress
import os
import re
import socket
import tempfile
import ipaddress
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import requests


MAX_MARKDOWN_INPUT_BYTES = int(os.getenv("MARKITDOWN_MAX_INPUT_BYTES", str(15 * 1024 * 1024)))
URL_FETCH_TIMEOUT_SECONDS = int(os.getenv("MARKITDOWN_URL_TIMEOUT_SECONDS", "20"))
URL_MAX_REDIRECTS = int(os.getenv("MARKITDOWN_URL_MAX_REDIRECTS", "5"))
URL_MENU_FALLBACK_MAX_LINKS = int(os.getenv("URL_MENU_FALLBACK_MAX_LINKS", "3"))
PDF_VISION_OCR_ENABLED = os.getenv("PDF_VISION_OCR_ENABLED", "true").lower() in {
    "1",
    "true",
    "yes",
}
PDF_VISION_MAX_PAGES = int(os.getenv("PDF_VISION_MAX_PAGES", "3"))
PDF_INCLUDE_TEXT_LAYER_FALLBACK = os.getenv("PDF_INCLUDE_TEXT_LAYER_FALLBACK", "false").lower() in {
    "1",
    "true",
    "yes",
}
DOCUMENT_TEXT_PROVIDER = os.getenv("DOCUMENT_TEXT_PROVIDER", "auto").strip().lower()
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


def _extract_html_markdown_fast(html: str) -> str:
    try:
        from bs4 import BeautifulSoup
    except Exception:
        return ""

    soup = BeautifulSoup(html or "", "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    lines = []
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "a"]):
        text = re.sub(r"\s+", " ", tag.get_text(" ", strip=True)).strip()
        if not text:
            continue
        if tag.name in {"h1", "h2"}:
            lines.append(f"# {text}")
        elif tag.name in {"h3", "h4"}:
            lines.append(f"## {text}")
        elif tag.name == "li":
            lines.append(f"- {text}")
        else:
            lines.append(text)

    deduped = []
    seen_recent = set()
    for line in lines:
        key = line.lower()
        if key in seen_recent:
            continue
        deduped.append(line)
        seen_recent.add(key)
        if len(seen_recent) > 400:
            seen_recent.clear()

    return "\n\n".join(deduped).strip()


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


def _is_pdf_content(content_type: str = "", filename: str = "") -> bool:
    content_type = (content_type or "").split(";")[0].strip().lower()
    return content_type == "application/pdf" or Path(filename or "").suffix.lower() == ".pdf"


def _assert_size_allowed(file_bytes: bytes) -> None:
    if len(file_bytes or b"") > MAX_MARKDOWN_INPUT_BYTES:
        raise ValueError(
            f"File is too large for MarkItDown extraction. Max bytes: {MAX_MARKDOWN_INPUT_BYTES}"
        )


def extract_markdown_from_file_bytes(
    file_bytes: bytes,
    filename: str = "menu",
    content_type: str = "application/octet-stream",
    target_lang: str = "zh",
    source_lang: str = "auto",
    document_provider: str | None = None,
) -> str:
    _assert_size_allowed(file_bytes)
    if _is_pdf_content(content_type, filename):
        return extract_markdown_from_pdf_bytes(
            file_bytes=file_bytes,
            target_lang=target_lang,
            source_lang=source_lang,
            mime_type=content_type,
            document_provider=document_provider,
        )

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


def _fetch_public_url(url: str) -> requests.Response:
    safe_url = validate_public_http_url(url)
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

    return response


def _extract_markdown_from_response(
    response: requests.Response,
    target_lang: str = "zh",
    source_lang: str = "auto",
    document_provider: str | None = None,
) -> str:
    content = response.content or b""
    content_type = response.headers.get("Content-Type", "")
    filename = urlparse(response.url).path

    if _is_pdf_content(content_type, filename):
        return extract_markdown_from_pdf_bytes(
            file_bytes=content,
            target_lang=target_lang,
            source_lang=source_lang,
            mime_type=content_type or "application/pdf",
            document_provider=document_provider,
        )

    if "html" in content_type.lower():
        fast_text = _extract_html_markdown_fast(response.text)
        if _menu_signal_score(fast_text) >= 6:
            return fast_text

    md = _load_markitdown()
    converter = getattr(md, "convert_response", None)
    if converter:
        result = converter(response)
    else:
        result = md.convert_stream(BytesIO(content))

    text = _extract_result_text(result)
    if not text:
        raise ValueError("MarkItDown returned empty text for the URL.")

    return text


def _menu_signal_score(text: str) -> int:
    if not text:
        return 0

    score = 0
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        lower = line.lower()
        if re.search(r"[$€£¥￥]\s*\d{1,4}(?:\.\d{1,2})?\b", line):
            score += 3
        elif re.search(r"\.{3,}\s*\d{1,4}(?:\.\d{1,2})?\s*$", line):
            score += 2
        elif (
            re.search(r"\b\d{1,3}(?:\.\d{1,2})?\s*$", line)
            and not re.search(r"\b(am|pm|hours?|street|st\.?|avenue|ave\.?|road|rd\.?|suite|floor|202\d|19\d\d)\b", lower)
        ):
            score += 1
        if re.search(r"\b(menu|food|wine|cocktail|brunch|breakfast|dinner|lunch)\b", line, re.IGNORECASE):
            score += 1
    return score


def _find_candidate_menu_links(html: str, base_url: str) -> list[str]:
    candidates = []
    for match in re.finditer(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", html or "", re.IGNORECASE | re.DOTALL):
        href = (match.group(1) or "").strip()
        label = re.sub(r"<[^>]+>", " ", match.group(2) or "")
        label = re.sub(r"\s+", " ", label).strip()
        absolute = urljoin(base_url, href)

        try:
            absolute = validate_public_http_url(absolute)
        except ValueError:
            continue

        haystack = f"{absolute} {label}".lower()
        if any(blocked in haystack for blocked in ["giftcard", "reservation", "privacy", "terms", "instagram", "facebook", "google.com/maps"]):
            continue

        score = 0
        for keyword in ["menu", "order", "online", "food", "toasttab", "toast", "pdf"]:
            if keyword in haystack:
                score += 1
        if score:
            candidates.append((score, absolute))

    ranked = []
    seen = set()
    for _, link in sorted(candidates, key=lambda pair: pair[0], reverse=True):
        if link in seen:
            continue
        ranked.append(link)
        seen.add(link)
        if len(ranked) >= URL_MENU_FALLBACK_MAX_LINKS:
            break
    return ranked


def _menu_url_variants(original_url: str, final_url: str) -> list[str]:
    parsed_original = urlparse(original_url)
    parsed_final = urlparse(final_url)
    original_path = (parsed_original.path or "").rstrip("/")
    final_path = (parsed_final.path or "").rstrip("/")

    if not re.search(r"/menus?$", original_path, re.IGNORECASE):
        return []
    if original_path == final_path and parsed_original.query:
        return []

    query = dict(parse_qsl(parsed_original.query, keep_blank_values=True))
    query.setdefault("menu_parse", "1")
    variant = urlunparse(
        (
            parsed_original.scheme,
            parsed_original.netloc,
            parsed_original.path,
            parsed_original.params,
            urlencode(query),
            "",
        )
    )
    return [variant]


def _should_try_menu_fallback(primary_text: str, html: str) -> bool:
    if not html:
        return False

    primary_score = _menu_signal_score(primary_text)
    if primary_score < 8:
        return True

    non_menu_hits = len(re.findall(r"\b(hours?|location|gift cards?|subscribe)\b", primary_text or "", re.IGNORECASE))
    return non_menu_hits > primary_score


def extract_markdown_from_url(
    url: str,
    target_lang: str = "zh",
    source_lang: str = "auto",
    document_provider: str | None = None,
) -> str:
    safe_url = validate_public_http_url(url)
    response = _fetch_public_url(safe_url)
    primary_text = _extract_markdown_from_response(
        response,
        target_lang=target_lang,
        source_lang=source_lang,
        document_provider=document_provider,
    )

    content_type = response.headers.get("Content-Type", "")
    is_html = "html" in content_type.lower()
    html = response.text if is_html else ""

    if is_html:
        primary_score = _menu_signal_score(primary_text)
        candidate_urls = [
            *_menu_url_variants(safe_url, response.url),
            *_find_candidate_menu_links(html, response.url),
        ]
        for candidate_url in candidate_urls:
            try:
                if validate_public_http_url(candidate_url) == response.url:
                    continue
                candidate_response = _fetch_public_url(candidate_url)
                candidate_text = _extract_markdown_from_response(
                    candidate_response,
                    target_lang=target_lang,
                    source_lang=source_lang,
                    document_provider=document_provider,
                )
                candidate_score = _menu_signal_score(candidate_text)
                candidate_host = urlparse(candidate_response.url).hostname or ""
                if candidate_score > primary_score or (
                    _should_try_menu_fallback(primary_text, html)
                    and candidate_score >= max(6, primary_score // 2)
                ) or (
                    "toasttab" in candidate_host
                    and candidate_score >= 6
                ):
                    return "\n\n".join(
                        [
                            "# Extracted menu text",
                            f"Source page: {response.url}",
                            f"Followed menu link: {candidate_response.url}",
                            "",
                            candidate_text,
                        ]
                    ).strip()
            except Exception as exc:
                print(f"Menu fallback link skipped: {candidate_url} -> {exc}")

    return primary_text


def _looks_like_pdf_ocr_line(text: str) -> bool:
    return bool(text and not text.startswith("<image:") and len(text) >= 2)


def _pdf_text_layer_markdown(file_bytes: bytes, max_pages: int = 5) -> str:
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    lines = ["# Extracted PDF menu text", ""]

    try:
        for page_index, page in enumerate(doc):
            if page_index >= max_pages:
                break

            lines.append(f"## Page {page_index + 1}")
            blocks = sorted(
                page.get_text("blocks"),
                key=lambda block: (
                    round(float(block[1]) / 12),
                    float(block[0]),
                ),
            )
            for block in blocks:
                raw_text = block[4] if len(block) > 4 else ""
                block_lines = [
                    re.sub(r"\s+", " ", line).strip()
                    for line in str(raw_text or "").splitlines()
                ]
                block_lines = [line for line in block_lines if _looks_like_pdf_ocr_line(line)]
                if not block_lines:
                    continue

                text = " ".join(block_lines)
                text = re.sub(r"\.{3,}", " | ", text)
                text = re.sub(r"\s+", " ", text).strip()
                lines.append(f"- {text}")
            lines.append("")
    finally:
        doc.close()

    return "\n".join(lines).strip()


def _pdf_vision_markdown(file_bytes: bytes, target_lang: str, source_lang: str) -> str:
    if not PDF_VISION_OCR_ENABLED:
        return ""

    try:
        from app.services.openrouter_service import call_openrouter_vision_for_menu
        from app.services.pdf_service import pdf_bytes_to_images
    except Exception as exc:
        print("PDF vision OCR unavailable:", exc)
        return ""

    parts = ["# Vision OCR PDF menu text", ""]
    try:
        page_images = pdf_bytes_to_images(file_bytes, max_pages=PDF_VISION_MAX_PAGES)
        for page_index, image_bytes in enumerate(page_images, start=1):
            result = call_openrouter_vision_for_menu(
                image_bytes=image_bytes,
                mime_type="image/jpeg",
                target_lang=target_lang,
                source_lang=source_lang,
            )
            parts.append(f"## Page {page_index}")
            if result.get("business_name"):
                parts.append(f"Business: {result.get('business_name')}")
            if result.get("currency"):
                parts.append(f"Currency: {result.get('currency')}")
            for line in result.get("ocr_lines") or []:
                if isinstance(line, dict):
                    text = line.get("text") or line.get("line") or line.get("content")
                else:
                    text = line
                text = re.sub(r"\s+", " ", str(text or "")).strip()
                if text:
                    parts.append(f"- {text}")
            parts.append("")
    except Exception as exc:
        print("PDF vision OCR failed:", exc)
        return ""

    return "\n".join(parts).strip()


def extract_markdown_from_pdf_bytes(
    file_bytes: bytes,
    target_lang: str = "zh",
    source_lang: str = "auto",
    mime_type: str = "application/pdf",
    document_provider: str | None = None,
) -> str:
    provider = (document_provider or DOCUMENT_TEXT_PROVIDER or "auto").strip().lower()
    document_ai_requested = provider in {"document_ai", "google_document_ai", "google", "cloud_document_ai"}
    document_ai_auto = provider in {"auto", ""}
    if document_ai_requested or document_ai_auto:
        try:
            from app.services.google_document_ai_service import (
                document_ai_result_to_markdown,
                process_document_with_document_ai,
            )

            result = process_document_with_document_ai(file_bytes, mime_type=mime_type or "application/pdf")
            markdown = document_ai_result_to_markdown(result)
            if markdown:
                text_layer = _pdf_text_layer_markdown(file_bytes)
                if text_layer and _menu_signal_score(text_layer) >= 6:
                    return "\n\n".join(
                        [
                            markdown,
                            "# PDF text layer cross-check",
                            text_layer,
                        ]
                    ).strip()
                return markdown
        except Exception as exc:
            if document_ai_requested:
                raise
            print("Document AI extraction skipped:", exc)

    vision_text = _pdf_vision_markdown(file_bytes, target_lang=target_lang, source_lang=source_lang)
    text_layer = _pdf_text_layer_markdown(file_bytes)

    if vision_text and _menu_signal_score(vision_text) >= max(6, _menu_signal_score(text_layer) // 2):
        if not PDF_INCLUDE_TEXT_LAYER_FALLBACK:
            return vision_text
        return "\n\n".join([vision_text, "# PDF text layer fallback", text_layer]).strip()

    return text_layer or vision_text


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
