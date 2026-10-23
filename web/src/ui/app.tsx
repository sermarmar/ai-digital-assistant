import { useCallback, useState } from 'react';
import { MeetingList } from './components/meeting-list';
import { MeetingPage } from './components/meeting-page';
import { NewMeetingPage } from './components/new-meeting-page';
import { goTo, useRoute } from './routing';

export function App() {
  const route = useRoute();
  const [refreshKey, setRefreshKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const refreshMeetings = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="flex h-screen">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-lg font-semibold text-slate-900">Asistente de reuniones</h1>
          <p className="text-xs text-slate-500">Graba, transcribe y resume con Claude</p>
        </div>
        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={recording}
            onClick={() => goTo({ page: 'new' })}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nueva reunión
          </button>
        </div>
        <h2 className="px-4 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Historial</h2>
        <nav className="flex-1 overflow-y-auto pb-4">
          <MeetingList
            selectedId={route.page === 'meeting' ? route.meetingId : null}
            refreshKey={refreshKey}
            disabled={recording}
          />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {route.page === 'meeting' ? (
          <MeetingPage key={route.meetingId} meetingId={route.meetingId} onMeetingsChanged={refreshMeetings} />
        ) : (
          <NewMeetingPage onMeetingsChanged={refreshMeetings} onRecordingChange={setRecording} />
        )}
      </main>
    </div>
  );
}
