/*
 * ScoutPro Elite — Service Worker
 * ---------------------------------------------------------------
 * Estrategias de cache:
 *  - App shell (index.html, manifest, iconos):  cache-first,
 *    con actualizacion en segundo plano cuando hay conexion.
 *  - Navegacion (cargar la app):                network-first,
 *    con fallback al index.html cacheado si no hay conexion.
 *  - Recursos externos (fuentes, iconos, libs): stale-while-revalidate,
 *    para que la app cargue rapido y se actualicen solos con el tiempo.
 *
 * Cuando se publique una nueva version del archivo HTML, sube el
 * numero de CACHE_VERSION de abajo: eso invalida el cache viejo y
 * fuerza a los usuarios a recibir los archivos nuevos automaticamente.
 * ---------------------------------------------------------------
 */

const CACHE_VERSION = 'v2';
const APP_SHELL_CACHE = `scoutpro-elite-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `scoutpro-elite-runtime-${CACHE_VERSION}`;

// Archivos que forman el "esqueleto" de la app y deben quedar
// disponibles offline desde la primera visita.
const APP_SHELL_FILES = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-180x180.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    './icons/icon-maskable-512x512.png',
    './icons/favicon-32x32.png',
    './icons/favicon-16x16.png',
    './icons/favicon.ico'
];

// ---------------------------------------------------------------
// INSTALL: cachea el app shell y activa la version nueva enseguida.
// ---------------------------------------------------------------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

// ---------------------------------------------------------------
// ACTIVATE: borra caches de versiones anteriores y toma control
// de las pestanas abiertas sin necesidad de recargar manualmente.
// ---------------------------------------------------------------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name !== APP_SHELL_CACHE && name !== RUNTIME_CACHE)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// ---------------------------------------------------------------
// FETCH: aplica la estrategia segun el tipo de solicitud.
// ---------------------------------------------------------------
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo manejamos GET; el resto (POST, etc.) pasa directo a la red.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Ignora esquemas que la Cache API no soporta (chrome-extension:, etc.).
    // Algunas extensiones del navegador disparan peticiones que este SW
    // llega a interceptar; intentar cache.put() sobre ellas lanzaba
    // "Failed to execute 'put' on 'Cache': Request scheme ... is unsupported".
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    const isSameOrigin = url.origin === self.location.origin;

    // 1) Navegacion (el usuario abre o recarga la app): network-first
    //    con fallback offline al index.html cacheado.
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    // 2) Archivos del app shell (mismo origen): cache-first.
    if (isSameOrigin) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 3) Recursos externos (fuentes, Font Awesome, html2canvas, chart.js):
    //    stale-while-revalidate para velocidad + soporte offline tras la
    //    primera carga exitosa.
    event.respondWith(staleWhileRevalidate(request));
});

// --- Estrategias ------------------------------------------------

async function networkFirstNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put('./index.html', networkResponse.clone());
        return networkResponse;
    } catch (err) {
        const cache = await caches.open(APP_SHELL_CACHE);
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        // Ultimo recurso: intenta servir cualquier version cacheada de la ruta pedida.
        const fallback = await cache.match(request);
        if (fallback) return fallback;
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        // Actualiza en segundo plano sin bloquear la respuesta (si hay red).
        fetch(request).then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
        }).catch(() => {});
        return cached;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        // Si es una imagen/icono y no hay nada cacheado, no hay mucho mas que hacer.
        throw err;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    // Antes se forzaba mode:'no-cors' aqui, lo que convierte la respuesta
    // en "opaca" (sin status ni body legible). Para la mayoria de recursos
    // (CSS, JS) eso no rompe nada, pero para los archivos de fuente de
    // Font Awesome (.woff2) una respuesta opaca cacheada puede terminar
    // sirviendose invalida, y entonces el navegador no puede pintar el
    // glifo del icono y muestra un cuadrado vacio en su lugar.
    // Usamos el modo original de la solicitud (normalmente 'cors') para
    // quedarnos con una respuesta real que sepamos que es valida.
    const networkFetch = fetch(request)
        .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
                cache.put(request, res.clone());
            }
            return res;
        })
        .catch(() => undefined);

    return cached || (await networkFetch) || Response.error();
}

// ---------------------------------------------------------------
// Permite forzar la actualizacion inmediata desde la pagina
// (por ejemplo, si en el futuro se agrega un boton "Actualizar app").
// ---------------------------------------------------------------
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
