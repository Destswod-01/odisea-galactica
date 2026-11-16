# Dirección visual — Órbita 2.0

Se conserva el nombre Ventana de Lanzamiento y el recorrido original de LRO y Juno. Órbita 2.0 es el nombre de la copia.

La capa futuro.css sustituye tema.css. Los modelos de presentación usan NaveEstudio, Estudio y PlanetasHD; los cálculos y la progresión originales permanecen en motor/ y estado/. Las representaciones visuales son educativas, no planos de ingeniería ni escala de vuelo real.

Texturas planetarias: Solar System Scope, https://www.solarsystemscope.com/textures/ — licencia Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/. Archivos 2K de Júpiter, Luna, Marte, Tierra diurna y nubes, incluidos localmente sin modificar. Se utilizan como mapas de materiales y como fondo de observación científica, con iluminación y recorte. El menú contiene atribución visible.

Las ilustraciones, sonidos y datos preexistentes del proyecto se conservan. El nuevo trabajo incluye interfaz, geometría de la sonda, luces de estudio, detalles del lanzador y cabina, y controles alternativos accesibles de cabina.


## C2 · Modelos 3D y fotos reales de NASA (15 nov 2026, de la rama `feat/nodriza-astrion-x` de Erick)
- `public/modelos_nasa/lro_nasa.glb` (0,6 MB), `juno_nasa.glb` (1,1 MB) y `antena_dsn_nasa.glb` (2,1 MB): NASA 3D Resources, dominio público. Se ven en el informe (`PanelNasa3D`).
- `public/nasa/moon_lola_topo.jpg` (LOLA/LRO, NASA/GSFC/ASU), `moon_south_pole.jpg` (LRO), `jupiter_great_red_spot.jpg` y `jupiter_polar_cyclones.jpg` (JunoCam, NASA/JPL-Caltech/SwRI), `earth_blue_marble.jpg` (NASA): fondo de las tarjetas de objetivos del briefing (`src/datos/fotosObjetivo.js`).
- Sin logos de NASA. Total agregado: ~4,7 MB, todo con carga diferida.
