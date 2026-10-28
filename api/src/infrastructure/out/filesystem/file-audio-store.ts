import { randomUUID } from 'node:crypto';
import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { AudioStore } from '../../../application/ports/out/audio-store.js';
import type { AudioFile, AudioUpload } from '../../../domain/audio-file.js';

// discardAll solo borra archivos con esta extensión, por si la carpeta apunta a un sitio con más cosas
const EXTENSION = '.upload';

// Cada subida es un archivo en la carpeta (data/uploads por defecto), nunca en la base de datos
export class FileAudioStore implements AudioStore {
  constructor(private readonly directory: string) {}

  async save({ stream, filename, mimeType }: AudioUpload): Promise<AudioFile> {
    await mkdir(this.directory, { recursive: true });
    const id = randomUUID();
    const path = this.pathOf(id);
    try {
      await pipeline(stream, createWriteStream(path));
    } catch (error) {
      // Subida cortada o demasiado grande: no se deja el archivo a medias
      await rm(path, { force: true });
      throw error;
    }
    return { id, filename, mimeType, content: await openAsBlob(path, { type: mimeType }) };
  }

  discard({ id }: AudioFile): Promise<void> {
    return rm(this.pathOf(id), { force: true });
  }

  async discardAll(): Promise<void> {
    const names = await readdir(this.directory).catch(() => []);
    await Promise.all(
      names
        .filter((name) => name.endsWith(EXTENSION))
        .map((name) => rm(join(this.directory, name), { force: true })),
    );
  }

  private pathOf(id: string): string {
    return join(this.directory, `${id}${EXTENSION}`);
  }
}
