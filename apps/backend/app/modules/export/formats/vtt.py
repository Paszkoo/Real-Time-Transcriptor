from app.modules.export.formats.subtitles import subtitle_cue_end_ms, subtitle_cue_text
from app.modules.export.payload import ExportSessionData
from app.modules.export.time_format import format_vtt_timestamp


def render_vtt(data: ExportSessionData) -> bytes:
    lines = ["WEBVTT", ""]
    for segment in data.segments:
        start = format_vtt_timestamp(segment.start_ms)
        end = format_vtt_timestamp(subtitle_cue_end_ms(segment.start_ms, segment.end_ms))
        lines.extend([f"{start} --> {end}", subtitle_cue_text(segment), ""])
    return "\n".join(lines).encode("utf-8")
