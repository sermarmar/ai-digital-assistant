import type { MeetingStatus } from '../../domain/meeting';

const STYLES: Record<MeetingStatus, { label: string; className: string }> = {
  transcribiendo: { label: 'Transcribiendo', className: 'bg-amber-100 text-amber-800' },
  resumiendo: { label: 'Resumiendo', className: 'bg-sky-100 text-sky-800' },
  listo: { label: 'Lista', className: 'bg-emerald-100 text-emerald-800' },
  error: { label: 'Error', className: 'bg-rose-100 text-rose-800' },
};

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const { label, className } = STYLES[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
