import { useEffect, useState } from 'react';
import type { PreparedDiagram } from '../../application/use-cases/prepare-diagram';
import type { RenderedDiagram } from '../../application/use-cases/render-diagram';
import type { Diagram } from '../../domain/meeting';
import { errorMessage } from '../errors';
import { useServices } from '../services';
import { Spinner } from './spinner';

const PREVIEW_DELAY_MS = 400;

interface DiagramSectionProps {
  meetingId: string;
  diagram: Diagram;
  /** Se llama cuando el diagrama guardado cambia (corregido por Claude o editado a mano). */
  onDiagramChanged: () => void;
}

export function DiagramSection({ meetingId, diagram, onDiagramChanged }: DiagramSectionProps) {
  const { prepareDiagram, renderDiagram, saveDiagram } = useServices();
  const [prepared, setPrepared] = useState<PreparedDiagram | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<RenderedDiagram | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Valida y dibuja el diagrama guardado; si no es válido, Claude intenta corregirlo
  useEffect(() => {
    const controller = new AbortController();
    setPrepared(null);
    void prepareDiagram.execute(meetingId, diagram.mermaidCode, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setPrepared(result);
      // Si Claude lo ha corregido, la versión corregida ya está guardada en el servidor
      if (result.mermaidCode !== diagram.mermaidCode) onDiagramChanged();
    });
    return () => controller.abort();
  }, [prepareDiagram, meetingId, diagram.mermaidCode, onDiagramChanged]);

  // Vista previa mientras se edita, cuando se deja de escribir un momento
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderDiagram.execute(draft).then((result) => {
        if (!cancelled) setPreview(result);
      });
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editing, draft, renderDiagram]);

  function startEditing() {
    setDraft(prepared?.mermaidCode ?? diagram.mermaidCode);
    setPreview(null);
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveDiagram.execute(meetingId, draft);
      setEditing(false);
      onDiagramChanged();
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">Esquema</h3>
        {!editing && prepared && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Editar
          </button>
        )}
      </div>

      {!editing && !prepared && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Preparando el diagrama…
        </p>
      )}

      {!editing && prepared?.ok && <SvgView svg={prepared.svg} />}

      {!editing && prepared && !prepared.ok && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>No se ha podido dibujar el diagrama ni corregirlo automáticamente. Puedes editar el código a mano.</p>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{prepared.error}</pre>
        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              rows={18}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            />
            <div className="min-h-40 rounded-lg border border-dashed border-slate-300 p-2">
              {!preview && <p className="p-2 text-sm text-slate-400">Vista previa…</p>}
              {preview?.ok && <SvgView svg={preview.svg} />}
              {preview && !preview.ok && <pre className="p-2 text-xs whitespace-pre-wrap text-rose-700">{preview.error}</pre>}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Spinner />}
              Guardar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
          {saveError && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{saveError}</p>}
        </div>
      )}
    </section>
  );
}

// El SVG lo genera mermaid con securityLevel "strict", que limpia cualquier HTML o script
function SvgView({ svg }: { svg: string }) {
  return <div className="mt-4 overflow-x-auto [&_svg]:mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}
