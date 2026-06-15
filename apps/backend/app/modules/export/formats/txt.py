from app.modules.export.payload import ExportSessionData
from app.modules.export.time_format import format_clock_timestamp


def render_txt(data: ExportSessionData) -> bytes:
    lines = [
        data.display_title,
        f"Started: {data.started_at.isoformat()}",
    ]
    if data.duration_ms is not None:
        lines.append(f"Duration: {format_clock_timestamp(data.duration_ms)}")
    if data.device_name:
        lines.append(f"Device: {data.device_name}")
    lines.append("")

    summary = data.summary_text
    if summary:
        lines.extend(["Summary", "-------", summary, ""])

    lines.append("Transcript")
    lines.append("----------")
    for segment in data.segments:
        timestamp = format_clock_timestamp(segment.start_ms)
        lines.append(f"[{timestamp}] {segment.speaker_label}: {segment.text}")

    return "\n".join(lines).encode("utf-8")
