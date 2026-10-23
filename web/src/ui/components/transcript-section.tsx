import { formatClock } from '../../application/format';
import type { Transcript } from '../../domain/meeting';

export function TranscriptSection({ transcript }: { transcript: Transcript }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <details>
        <summary className="cursor-pointer text-lg font-semibold text-slate-900">Transcripción</summary>
        <ol className="mt-4 space-y-2 text-sm">
          {transcript.segments.map((segment) => (
            <li key={segment.startSeconds} className="flex gap-3">
              <span className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
                {formatClock(segment.startSeconds)}
              </span>
              <span className="text-slate-700">{segment.text}</span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
