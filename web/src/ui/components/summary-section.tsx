import type { Summary } from '../../domain/meeting';

export function SummarySection({ summary }: { summary: Summary }) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Resumen</h3>
        <p className="mt-2 leading-relaxed text-slate-700">{summary.resumen}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Decisiones</h4>
          {summary.decisiones.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {summary.decisiones.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Ninguna</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Tareas</h4>
          {summary.tareas.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {summary.tareas.map((task) => (
                <li key={task.descripcion} className="flex items-start gap-2">
                  <span className="mt-1 size-3 shrink-0 rounded border border-slate-400" />
                  <span>
                    {task.descripcion}
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {task.responsable ?? 'Sin responsable'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Ninguna</p>
          )}
        </div>
      </div>

      {summary.temas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Temas</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.temas.map((topic) => (
              <span key={topic} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
