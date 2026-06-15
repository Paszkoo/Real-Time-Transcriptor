class ExportError(Exception):
    code: str = "export_error"
    message: str = "Export failed."

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message


class UnsupportedExportFormatError(ExportError):
    code = "unsupported_export_format"


class ExportNoTranscriptError(ExportError):
    code = "export_no_transcript"
