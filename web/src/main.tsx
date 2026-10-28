// Raíz de composición: el único sitio que conoce todas las piezas y las conecta.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DeleteMeeting } from './application/use-cases/delete-meeting';
import { ExportMeeting } from './application/use-cases/export-meeting';
import { GetMeeting } from './application/use-cases/get-meeting';
import { ListMeetings } from './application/use-cases/list-meetings';
import { PrepareDiagram } from './application/use-cases/prepare-diagram';
import { RenderDiagram } from './application/use-cases/render-diagram';
import { ResumeMeeting } from './application/use-cases/resume-meeting';
import { SaveDiagram } from './application/use-cases/save-diagram';
import { StartRecording } from './application/use-cases/start-recording';
import { UploadMeeting } from './application/use-cases/upload-meeting';
import { BrowserAudioCapture } from './infrastructure/browser-audio-capture';
import { BrowserFileSaver } from './infrastructure/browser-file-saver';
import { HttpMeetingGateway } from './infrastructure/http-meeting-gateway';
import { MermaidDiagramRenderer } from './infrastructure/mermaid-diagram-renderer';
import './index.css';
import { App } from './ui/app';
import { ServicesProvider, type AppServices } from './ui/services';

// 1. Adaptadores de salida
const gateway = new HttpMeetingGateway();
const audioCapture = new BrowserAudioCapture();
const renderer = new MermaidDiagramRenderer();
const fileSaver = new BrowserFileSaver();

// 2. Casos de uso, que reciben los adaptadores a través de sus puertos
const services: AppServices = {
  listMeetings: new ListMeetings(gateway),
  getMeeting: new GetMeeting(gateway),
  deleteMeeting: new DeleteMeeting(gateway),
  uploadMeeting: new UploadMeeting(gateway),
  resumeMeeting: new ResumeMeeting(gateway),
  startRecording: new StartRecording(audioCapture),
  prepareDiagram: new PrepareDiagram(renderer, gateway),
  renderDiagram: new RenderDiagram(renderer),
  saveDiagram: new SaveDiagram(renderer, gateway),
  exportMeeting: new ExportMeeting(renderer, fileSaver),
};

// 3. Adaptador de entrada: la interfaz React
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Falta el elemento #root en index.html');

createRoot(rootElement).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);
