from urllib.parse import quote


def build_content_disposition(filename: str) -> str:
    ascii_name = filename.encode("ascii", "ignore").decode().strip() or "session.export"
    encoded = quote(filename, safe="")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{encoded}"
