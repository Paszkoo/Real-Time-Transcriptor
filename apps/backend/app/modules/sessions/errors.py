class SessionError(Exception):
    code: str = "session_error"
    message: str = "Session operation failed."

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message


class SessionNotFoundError(SessionError):
    code = "session_not_found"


class SessionAlreadyActiveError(SessionError):
    code = "session_already_active"
