// Las claves van en español porque son las mismas que devuelve Claude en su JSON.

export interface Task {
  descripcion: string;
  responsable: string | null;
}

export interface Summary {
  resumen: string;
  decisiones: string[];
  tareas: Task[];
  temas: string[];
  model: string;
}
