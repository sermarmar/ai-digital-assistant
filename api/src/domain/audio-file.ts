export interface AudioFile {
  content: Uint8Array<ArrayBuffer>;
  filename: string;
  mimeType: string;
}
