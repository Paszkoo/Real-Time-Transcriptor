class TranscriptionError(Exception):
    code: str = "transcription_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class WhisperModelNotAvailableError(TranscriptionError):
    code = "whisper_not_installed"


class WhisperModelLoadError(TranscriptionError):
    code = "whisper_load_failed"
