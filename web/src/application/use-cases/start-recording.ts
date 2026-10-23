import type { AudioCapture, RecordingSession } from '../ports/audio-capture';

export class StartRecording {
  constructor(private readonly capture: AudioCapture) {}

  isSupported(): boolean {
    return this.capture.isSupported();
  }

  execute(includeMicrophone: boolean): Promise<RecordingSession> {
    return this.capture.start({ includeMicrophone });
  }
}
