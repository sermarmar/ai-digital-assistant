export interface FileSaver {
  save(filename: string, content: Blob): void;
}
