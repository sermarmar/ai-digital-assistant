import { useState } from 'react';
import type { Meeting } from '../../domain/meeting';
import { goTo } from '../routing';
import { useServices } from '../services';
import { FileUploadForm } from './file-upload-form';
import { Recorder } from './recorder';

interface NewMeetingPageProps {
  onMeetingsChanged: () => void;
  onRecordingChange: (recording: boolean) => void;
}

export function NewMeetingPage({ onMeetingsChanged, onRecordingChange }: NewMeetingPageProps) {
  const { startRecording } = useServices();
  const [consent, setConsent] = useState(false);
  const supported = startRecording.isSupported();

  function handleUploaded(meeting: Meeting) {
    onMeetingsChanged();
    goTo({ page: 'meeting', meetingId: meeting.id });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Nueva reunión</h2>
        <p className="mt-1 text-sm text-slate-600">
          Graba el audio de una videollamada o de cualquier pestaña y obtén la transcripción, un resumen y un esquema.
        </p>
      </header>

      {!supported && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este navegador no permite grabar el audio que se comparte. Usa <strong>Chrome</strong> o <strong>Edge</strong>{' '}
          de escritorio. Mientras tanto puedes subir un archivo de audio o vídeo.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Antes de grabar</h3>
        <p className="mt-2 text-sm text-slate-600">
          En España y la UE (RGPD) tienes que <strong>informar a todas las personas</strong> de la reunión y{' '}
          <strong>obtener su consentimiento</strong> antes de grabarlas. El audio se procesa en tu ordenador y no se
          guarda, pero la transcripción se guarda en la base de datos local y se envía a Claude (Anthropic) para generar
          el resumen. Ten cuidado con reuniones confidenciales y elimina las que no necesites.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-4 accent-indigo-600"
          />
          He informado a los participantes y tengo su consentimiento para grabar.
        </label>
      </section>

      {supported && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-medium text-slate-900">Grabar</h3>
          <Recorder enabled={consent} onUploaded={handleUploaded} onRecordingChange={onRecordingChange} />
          <details className="mt-5 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">¿Qué elegir al compartir?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Pestaña</strong> (recomendado): elige la pestaña de la reunión (Meet, Teams web, Zoom web…) y
                deja marcado <em>«Compartir también el audio de la pestaña»</em>.
              </li>
              <li>
                <strong>Pantalla completa</strong>: solo en Windows; marca <em>«Compartir audio del sistema»</em>. En
                macOS solo se puede grabar el audio de una pestaña.
              </li>
              <li>
                <strong>Ventana</strong>: no sirve, Chrome no comparte el audio de una ventana.
              </li>
              <li>Tu voz se graba con el micrófono, porque lo compartido solo trae las voces de los demás.</li>
            </ul>
          </details>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">O sube un archivo de audio o vídeo</h3>
        <FileUploadForm enabled={consent} onUploaded={handleUploaded} />
      </section>
    </div>
  );
}
