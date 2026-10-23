import type { FileSaver } from '../application/ports/file-saver';

export class BrowserFileSaver implements FileSaver {
  save(filename: string, content: Blob): void {
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
