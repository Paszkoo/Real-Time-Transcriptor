from app.modules.export.formats.subtitles import subtitle_cue_end_ms, subtitle_cue_text
from app.modules.export.payload import ExportSessionData
from app.modules.export.time_format import format_srt_timestamp


def render_srt(data: ExportSessionData) -> bytes:
    blocks: list[str] = []
    for index, segment in enumerate(data.segments, start=1):
        start = format_srt_timestamp(segment.start_ms)
        end = format_srt_timestamp(subtitle_cue_end_ms(segment.start_ms, segment.end_ms))
        blocks.append(f"{index}\n{start} --> {end}\n{subtitle_cue_text(segment)}")
    return "\n\n".join(blocks).encode("utf-8")
