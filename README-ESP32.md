# Build estático (SPA) para el ESP32

El proyecto tiene **dos builds**:

| Comando | Salida | Uso |
| --- | --- | --- |
| `bun run build` | `dist/` + worker | Hosting de Lovable (SSR). No tocar. |
| `bun run build:spa` | `dist-spa/` | **Archivos estáticos para el ESP32** (HTML + JS + CSS, sin servidor). |

## Generar

```bash
bun run build:spa
```

Resultado en `dist-spa/`:

```
index.html      <- único HTML de la app (shell de la SPA)
404.html        <- copia de index.html (fallback para servidores que usan esa convención)
assets/*.js     <- bundle de la app + router
assets/*.css    <- estilos (Tailwind compilado)
favicon.ico, robots.txt
```

No hay SSR, ni Nitro, ni funciones de servidor: todo el ruteo lo hace
TanStack Router en el navegador. Los assets se referencian con rutas
absolutas (`/assets/...`), así que el fallback funciona en cualquier
profundidad de ruta.

## Requisito del servidor estático del ESP32: fallback SPA

Como el ruteo es del lado del cliente, el ESP32 debe **responder
`index.html` para cualquier path que no exista como archivo**. Así
`/docente`, `/estudiante`, `/parametros`, `/informe` e `/historial`
funcionan al recargar o al entrar directo.

### Ejemplo con ESPAsyncWebServer + LittleFS

```cpp
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>

AsyncWebServer server(80);

void setup() {
  LittleFS.begin();

  // Sirve archivos reales de /assets, index.html, favicon, etc.
  server.serveStatic("/", LittleFS, "/")
        .setDefaultFile("index.html")
        .setCacheControl("max-age=31536000");  // los assets tienen hash en el nombre

  // Fallback SPA: cualquier otra ruta devuelve el index.html
  server.onNotFound([](AsyncWebServerRequest *req) {
    if (req->method() == HTTP_GET) {
      req->send(LittleFS, "/index.html", "text/html");
    } else {
      req->send(404);
    }
  });

  server.begin();
}
```

> Ojo: `index.html` conviene servirlo **sin** cache larga (o con
> `no-cache`) para que una actualización se vea enseguida; los archivos de
> `assets/` sí pueden cachearse porque llevan hash en el nombre.

### Subir los archivos

1. Copiar el contenido de `dist-spa/` a la carpeta `data/` del proyecto
   Arduino/PlatformIO.
2. Subir el filesystem (`pio run -t uploadfs` o el plugin "ESP32 Sketch
   Data Upload").

### Tamaño / gzip

El bundle ronda ~1.5 MB sin comprimir. Si la partición SPIFFS/LittleFS
queda justa, se pueden pre-comprimir los archivos y servirlos con
`Content-Encoding: gzip`:

```bash
cd dist-spa && find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -exec gzip -9 -k {} \;
```

`serveStatic` de ESPAsyncWebServer detecta automáticamente el `.gz`
correspondiente.

## WebSocket

El panel sigue conectándose a `ws://192.168.10.1:81` (configurable en la
app). Al servirse desde el propio ESP32 no hay problema de CORS ni de
contenido mixto, porque la página se sirve por HTTP en la LAN del robot.
