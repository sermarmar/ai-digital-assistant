from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptSegment:
    start_seconds: float
    end_seconds: float
    text: str


@dataclass(frozen=True)
class Transcript:
    text: str
    language: str
    duration_seconds: float
    segments: list[TranscriptSegment]
