from app.modules.export.payload import ExportSegment


def subtitle_cue_text(segment: ExportSegment) -> str:
    return f"{segment.speaker_label}: {segment.text}"


def subtitle_cue_end_ms(start_ms: int, end_ms: int) -> int:
    return max(end_ms, start_ms + 1)
