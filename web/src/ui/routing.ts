import { useSyncExternalStore } from 'react';

// Navegación con el hash de la URL (#/ y #/reuniones/<id>), sin librería de rutas
export type Route = { page: 'new' } | { page: 'meeting'; meetingId: string };

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const match = hash.match(/^#\/reuniones\/([\w-]+)$/);
  return match?.[1] ? { page: 'meeting', meetingId: match[1] } : { page: 'new' };
}

export function goTo(route: Route): void {
  window.location.hash = route.page === 'meeting' ? `#/reuniones/${route.meetingId}` : '#/';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
