class SettingsError(Exception):
    code = "settings_error"
    status_code = 400

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InvalidSettingsError(SettingsError):
    code = "invalid_settings"
