export const DIAGRAM_TYPES = ['mindmap', 'flowchart', 'timeline'] as const;
export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export interface Diagram {
  type: DiagramType;
  mermaidCode: string;
}
