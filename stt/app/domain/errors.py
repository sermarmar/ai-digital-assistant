class EmptyAudioError(Exception):
    def __init__(self) -> None:
        super().__init__("El audio está vacío")


class NoAudioTrackError(Exception):
    def __init__(self) -> None:
        super().__init__("El archivo no tiene pista de audio")


class UnreadableAudioError(Exception):
    def __init__(self) -> None:
        super().__init__("No se ha podido leer el audio; comprueba que es un formato de audio válido")
