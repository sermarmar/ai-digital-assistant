// Pantalla de la prueba de viabilidad: comprueba que la app arranca en macOS y Windows
// y que el WebView carga la página local de Mermaid y pinta un diagrama.
import { useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const mermaidPage = Image.resolveAssetSource(require('./assets/mermaid-page.html'));

const SAMPLE_DIAGRAM = `mindmap
  root((Prueba de viabilidad))
    Plataformas
      macOS
      Windows
    Piezas
      React Native
      WebView
      Mermaid`;

type Status = { kind: 'loading' | 'ok' | 'error'; message: string };

function App() {
  const webView = useRef<WebView>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading', message: 'Cargando Mermaid…' });

  function handleMessage(event: WebViewMessageEvent) {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.id === 'ready') {
      const request = JSON.stringify({ id: 'demo', action: 'show', code: SAMPLE_DIAGRAM });
      webView.current?.injectJavaScript(`window.handleRequest(${request}); true;`);
      return;
    }
    setStatus(
      message.ok
        ? { kind: 'ok', message: 'Diagrama generado con Mermaid dentro del WebView.' }
        : { kind: 'error', message: `Mermaid ha fallado: ${message.error}` },
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asistente de reuniones</Text>
      <Text style={styles.subtitle}>Prueba de viabilidad en {Platform.OS}</Text>
      <Text style={[styles.status, status.kind === 'error' && styles.error]}>{status.message}</Text>
      <WebView
        ref={webView}
        style={styles.webView}
        source={{ uri: mermaidPage.uri }}
        originWhitelist={['*']}
        allowingReadAccessToURL={mermaidPage.uri}
        onMessage={handleMessage}
        onError={(event) => setStatus({ kind: 'error', message: `El WebView no carga: ${event.nativeEvent.description}` })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  status: {
    fontSize: 14,
    color: '#166534',
  },
  error: {
    color: '#b91c1c',
  },
  webView: {
    flex: 1,
    borderRadius: 8,
  },
});

export default App;
