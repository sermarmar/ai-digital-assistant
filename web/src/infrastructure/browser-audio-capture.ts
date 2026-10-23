import {
  CaptureCancelledError,
  NoSharedAudioError,
  type AudioCapture,
  type RecordingSession,
} from '../application/ports/audio-capture';

const PREFERRED_MIME_TYPE = 'audio/webm;codecs=opus';

// Graba lo que suena en la pestaña o pantalla compartida y, si se puede, el micrófono,
// mezclados en una sola pista de audio.
export class BrowserAudioCapture implements AudioCapture {
  isSupported(): boolean {
    const isChromium = /Chrome\/|Edg\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
    return isChromium && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  }

  async start({ includeMicrophone }: { includeMicrophone: boolean }): Promise<RecordingSession> {
    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        // Chrome exige pedir vídeo para poder compartir audio; el vídeo no se graba
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        // Ofrece compartir el audio del sistema al elegir pantalla completa (Windows)
        systemAudio: 'include',
        // No deja elegir la propia pestaña de esta app
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw new CaptureCancelledError();
      throw error;
    }

    if (display.getAudioTracks().length === 0) {
      stopTracks(display);
      throw new NoSharedAudioError();
    }

    let microphone: MediaStream | null = null;
    if (includeMicrophone) {
      try {
        microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Sin permiso o sin micrófono: se graba solo el audio compartido
        microphone = null;
      }
    }

    return new BrowserRecordingSession(display, microphone);
  }
}

class BrowserRecordingSession implements RecordingSession {
  readonly hasMicrophone: boolean;
  private readonly context = new AudioContext();
  private readonly recorder: MediaRecorder;
  private readonly chunks: Blob[] = [];
  private readonly interruptedListeners: Array<() => void> = [];
  private stopped: Promise<Blob> | null = null;

  constructor(
    private readonly display: MediaStream,
    private readonly microphone: MediaStream | null,
  ) {
    this.hasMicrophone = microphone !== null;

    // Mezcla con Web Audio: las dos fuentes van a un único destino que es lo que se graba.
    // No se conectan a los altavoces, así que no hay eco del micrófono.
    const destination = this.context.createMediaStreamDestination();
    this.context.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(destination);
    if (microphone) this.context.createMediaStreamSource(microphone).connect(destination);

    const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME_TYPE) ? PREFERRED_MIME_TYPE : '';
    this.recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(1000);

    // "Dejar de compartir" en la barra del navegador termina las pistas compartidas
    for (const track of display.getTracks()) {
      track.addEventListener('ended', () => this.interruptedListeners.forEach((listener) => listener()));
    }
  }

  onInterrupted(listener: () => void): void {
    this.interruptedListeners.push(listener);
  }

  stop(): Promise<Blob> {
    this.stopped ??= new Promise<Blob>((resolve) => {
      this.recorder.onstop = () => {
        stopTracks(this.display);
        if (this.microphone) stopTracks(this.microphone);
        void this.context.close();
        resolve(new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' }));
      };
      this.recorder.stop();
    });
    return this.stopped;
  }
}

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
