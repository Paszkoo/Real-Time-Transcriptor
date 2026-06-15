from app.db.models import SegmentRow, SessionRow, SpeakerRow


def sorted_session_parts(
    session_row: SessionRow,
) -> tuple[list[SpeakerRow], dict[str, str], list[SegmentRow]]:
    speakers = sorted(session_row.speakers, key=lambda speaker: speaker.sort_order)
    speaker_labels = {speaker.id: speaker.label for speaker in speakers}
    segments = sorted(session_row.segments, key=lambda segment: segment.sequence)
    return speakers, speaker_labels, segments
