import { createContext, useContext, type ReactNode } from 'react';
import type { DeleteMeeting } from '../application/use-cases/delete-meeting';
import type { ExportMeeting } from '../application/use-cases/export-meeting';
import type { GetMeeting } from '../application/use-cases/get-meeting';
import type { ListMeetings } from '../application/use-cases/list-meetings';
import type { PrepareDiagram } from '../application/use-cases/prepare-diagram';
import type { RenderDiagram } from '../application/use-cases/render-diagram';
import type { ResumeMeeting } from '../application/use-cases/resume-meeting';
import type { SaveDiagram } from '../application/use-cases/save-diagram';
import type { StartRecording } from '../application/use-cases/start-recording';
import type { UploadMeeting } from '../application/use-cases/upload-meeting';

// Los casos de uso que puede usar la interfaz. Se crean en main.tsx y llegan a los
// componentes por contexto, así ningún componente conoce los adaptadores.
export interface AppServices {
  listMeetings: ListMeetings;
  getMeeting: GetMeeting;
  deleteMeeting: DeleteMeeting;
  uploadMeeting: UploadMeeting;
  resumeMeeting: ResumeMeeting;
  startRecording: StartRecording;
  prepareDiagram: PrepareDiagram;
  renderDiagram: RenderDiagram;
  saveDiagram: SaveDiagram;
  exportMeeting: ExportMeeting;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices necesita estar dentro de <ServicesProvider>');
  return services;
}
