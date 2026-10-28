// Audio (o vídeo) que está llegando por la red, todavía sin guardar
export interface AudioUpload {
  stream: AsyncIterable<Uint8Array>;
  filename: string;
  mimeType: string;
}

// Audio ya guardado mientras se transcribe. content se lee del disco a medida que se envía,
// así que un vídeo de varios GB no se carga entero en memoria.
export interface AudioFile {
  /** Identifica el archivo en el almacén temporal, para poder borrarlo. */
  id: string;
  content: Blob;
  filename: string;
  mimeType: string;
}
