OLLAMA_UNAVAILABLE_MESSAGE = (
    "Ollama is not running. Start Ollama, then run `npm run setup:models` "
    "if the Qwen3 model is not installed yet."
)

OLLAMA_MODEL_MISSING_MESSAGE = (
    "The Qwen3 model is not installed locally. Run `npm run setup:models` to download it."
)


class LlmError(Exception):
    code: str = "llm_error"
    message: str = "LLM processing failed."

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message


class OllamaUnavailableError(LlmError):
    code = "ollama_unavailable"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or OLLAMA_UNAVAILABLE_MESSAGE)


class SessionNotClosedError(LlmError):
    code = "session_not_closed"


class LlmJobNotFoundError(LlmError):
    code = "llm_job_not_found"


class LlmJobAlreadyRunningError(LlmError):
    code = "llm_job_already_running"


class LlmTranscriptTooLongError(LlmError):
    code = "llm_transcript_too_long"
