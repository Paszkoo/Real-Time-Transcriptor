class AudioError(Exception):
    code: str = "audio_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class DeviceNotFoundError(AudioError):
    code = "device_not_found"


class DeviceBusyError(AudioError):
    code = "device_busy"


class MicrophonePermissionError(AudioError):
    code = "microphone_permission_denied"


class CaptureAlreadyRunningError(AudioError):
    code = "capture_already_running"


class CaptureNotRunningError(AudioError):
    code = "capture_not_running"


class CapturePausedError(AudioError):
    code = "capture_paused"


class CaptureNotPausedError(AudioError):
    code = "capture_not_paused"


class FfmpegNotFoundError(AudioError):
    code = "ffmpeg_not_found"


class UnsupportedAudioFormatError(AudioError):
    code = "unsupported_audio_format"


class AudioFileNotFoundError(AudioError):
    code = "file_not_found"


class InvalidFilePathError(AudioError):
    code = "invalid_file_path"


class AudioDecodeError(AudioError):
    code = "audio_decode_failed"
