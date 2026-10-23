import { useState, type FormEvent } from 'react';
import type { Meeting } from '../../domain/meeting';
import { errorMessage } from '../errors';
import { useServices } from '../services';
import { Spinner } from './spinner';

interface FileUploadFormProps {
  enabled: boolean;
  onUploaded: (meeting: Meeting) => void;
}

export function FileUploadForm({ enabled, onUploaded }: FileUploadFormProps) {
  const { uploadMeeting } = useServices();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '');
      onUploaded(await uploadMeeting.execute(title || fallbackTitle, file, file.name));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
      setUploading(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
      <input
        type="file"
        accept="audio/*,video/webm,video/mp4"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
      />
      <input
        type="text"
        placeholder="Título (opcional)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!enabled || !file || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading && <Spinner />}
          Subir y procesar
        </button>
        {!enabled && <span className="text-sm text-slate-500">Marca antes la casilla de consentimiento.</span>}
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </form>
  );
}
