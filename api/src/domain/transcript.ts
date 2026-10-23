export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
}
