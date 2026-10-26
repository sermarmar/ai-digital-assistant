// Genera assets/mermaid-page.html: la plantilla con mermaid metido dentro.
// La página se abre desde un archivo local en el WebView, así que funciona sin internet
// y sin depender de que el WebView cargue scripts sueltos del disco.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const assetsDir = fileURLToPath(new URL('../assets/', import.meta.url));

const template = await readFile(`${assetsDir}mermaid-page.template.html`, 'utf8');
const mermaidSource = await readFile(require.resolve('mermaid/dist/mermaid.min.js'), 'utf8');

// Un "</script" dentro del código cerraría la etiqueta antes de tiempo
const page = template.replace('/*MERMAID*/', () => mermaidSource.replaceAll('</script', '<\\/script'));
await writeFile(`${assetsDir}mermaid-page.html`, page);
