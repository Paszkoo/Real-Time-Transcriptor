def format_clock_timestamp(ms: int) -> str:
    total_seconds = ms // 1000
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def _format_subtitle_timestamp(ms: int, millis_separator: str) -> str:
    hours = ms // 3_600_000
    minutes = (ms % 3_600_000) // 60_000
    seconds = (ms % 60_000) // 1000
    millis = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}{millis_separator}{millis:03d}"


def format_srt_timestamp(ms: int) -> str:
    return _format_subtitle_timestamp(ms, ",")


def format_vtt_timestamp(ms: int) -> str:
    return _format_subtitle_timestamp(ms, ".")
