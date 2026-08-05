# ScoutPro Elite — Ahora es una PWA instalable

## Archivos entregados
```
index.html            <- tu app (misma interfaz y funciones, con las etiquetas PWA agregadas)
manifest.json          <- metadatos de la app (nombre, iconos, colores, modo standalone)
service-worker.js      <- cache offline + actualizacion automatica
icons/                 <- iconos en todos los tamanos necesarios (72 a 512px + maskable + favicons)
```

**Importante:** los tres archivos (`index.html`, `manifest.json`, `service-worker.js`) y la
carpeta `icons/` deben quedar **en la misma carpeta**, en la raiz del sitio. No cambies sus
nombres ni rutas, porque `index.html` los referencia con rutas relativas (`./manifest.json`,
`./service-worker.js`, `icons/...`).

## Como desplegarla
1. Sube esos 3 archivos + la carpeta `icons/` a tu hosting (Replit, Vercel, Netlify, servidor
   propio, etc.), tal como ya tenias `index.html` publicado.
2. La PWA **requiere HTTPS** para funcionar (instalacion + service worker). Si usas Replit,
   GitHub Pages, Vercel o Netlify, ya tienes HTTPS automatico. `localhost` tambien funciona
   para pruebas.
3. Abre la URL publicada. Ya deberia funcionar como PWA sin configuracion adicional.

## Como se instala (para tus usuarios)
- **Chrome / Edge (Windows, macOS):** aparece un icono de instalar en la barra de direcciones,
  o desde el menu ⋮ → "Instalar ScoutPro Elite".
- **Android (Chrome):** aparece un banner "Agregar a pantalla de inicio", o desde el menu ⋮.
- **iPhone / iPad (Safari):** boton Compartir → "Agregar a pantalla de inicio". (iOS no
  soporta el banner automatico de instalacion, esto es una limitacion de Apple, no de la app.)
- Una vez instalada, se abre en su propia ventana, sin la barra del navegador
  (`display: standalone`).

## Que hace el Service Worker
- Cachea automaticamente la app y sus recursos (fuentes, Font Awesome, html2canvas, Chart.js)
  la primera vez que se usa con conexion.
- Despues de eso, la app **carga instantaneamente** aunque no haya internet, y todas las
  herramientas que ya tenias (pizarras, analisis, exportacion PDF con pdf-lib embebido,
  compartir, backups en localStorage) siguen funcionando igual, porque ya eran 100% del lado
  del cliente.
- Cuando subas una nueva version de `index.html` al servidor, los usuarios la reciben
  automaticamente: el Service Worker detecta el cambio, descarga la version nueva en segundo
  plano y la aplica la siguiente vez que abran o recarguen la app.

## Si en el futuro cambias `index.html`
No tienes que tocar nada mas: el Service Worker sirve `index.html` con estrategia
"red primero, cache como respaldo", asi que los cambios se reflejan solos. Si agregas
archivos nuevos que SI quieras que queden disponibles offline desde el primer uso (por
ejemplo, una imagen nueva), agrega su ruta a la lista `APP_SHELL_FILES` dentro de
`service-worker.js` y sube el numero `CACHE_VERSION` (por ejemplo de `'v1'` a `'v2'`) para
que el cache viejo se reemplace por el nuevo automaticamente.

## Verificacion rapida
Con Chrome DevTools → pestana **Application**:
- "Manifest" debe mostrar el nombre, iconos y `display: standalone` sin errores.
- "Service Workers" debe mostrar el worker como "activated and is running".
- Marca "Offline" en esa misma pestana y recarga: la app debe seguir cargando.
