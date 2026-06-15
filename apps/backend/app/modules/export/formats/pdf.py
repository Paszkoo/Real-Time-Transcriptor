from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.modules.export.payload import ExportSessionData
from app.modules.export.time_format import format_clock_timestamp


def render_pdf(data: ExportSessionData) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    body_style = ParagraphStyle(
        "ExportBody",
        parent=styles["BodyText"],
        leading=14,
        spaceAfter=8,
    )
    meta_style = ParagraphStyle(
        "ExportMeta",
        parent=styles["BodyText"],
        textColor=colors.grey,
        spaceAfter=4,
    )
    footer_style = ParagraphStyle(
        "ExportFooter",
        parent=styles["BodyText"],
        textColor=colors.grey,
        fontSize=9,
    )

    story: list[object] = [
        Paragraph(_escape(data.display_title), title_style),
        Paragraph(f"Started: {_escape(data.started_at.strftime('%Y-%m-%d %H:%M'))}", meta_style),
    ]
    if data.duration_ms is not None:
        story.append(
            Paragraph(
                f"Duration: {_escape(format_clock_timestamp(data.duration_ms))}",
                meta_style,
            )
        )
    if data.device_name:
        story.append(Paragraph(f"Device: {_escape(data.device_name)}", meta_style))

    summary = data.summary_text
    if summary:
        story.extend(
            [
                Spacer(1, 0.4 * cm),
                Paragraph("Summary", heading_style),
                Paragraph(_escape(summary).replace("\n", "<br/>"), body_style),
            ]
        )

    story.extend([Spacer(1, 0.4 * cm), Paragraph("Transcript", heading_style)])
    if not data.segments:
        story.append(Paragraph("No transcript segments.", body_style))
    else:
        for segment in data.segments:
            timestamp = format_clock_timestamp(segment.start_ms)
            line = (
                f"<b>{_escape(segment.speaker_label)}</b> "
                f"<font color='#666666'>[{_escape(timestamp)}]</font><br/>"
                f"{_escape(segment.text)}"
            )
            story.append(Paragraph(line, body_style))

    story.extend(
        [
            Spacer(1, 0.8 * cm),
            Paragraph(f"Real-Time Transcriptor v{_escape(data.backend_version)}", footer_style),
        ]
    )

    doc.build(story)
    return buffer.getvalue()


def _escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
