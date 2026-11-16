# Datos LRO (Lunar Reconnaissance Orbiter) para el juego

Investigado el 2026-11-06. Fuentes: NSSDCA = https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-031A ; NASA = https://science.nasa.gov/mission/lro/ ; WIKI = https://en.wikipedia.org/wiki/Lunar_Reconnaissance_Orbiter (respaldo) ; PDS = https://pds.nasa.gov/data/pds3/releases/backup/2016/201604.lrolola/insthost.cat ; NTRS = https://ntrs.nasa.gov/api/citations/20080012685/downloads/20080012685.pdf

## Lanzamiento
- Fecha: 18 jun 2009, 21:32 UTC. Fuente: NSSDCA (y WIKI).
- Cohete: Atlas V 401 (ULA), Cabo Cañaveral SLC-41. Fuente: NSSDCA / WIKI.
- Lanzamiento compartido con LCROSS: SI. Fuente: WIKI.

## Masa
- Lanzamiento (con propelente): 1.846 kg. Fuente: NSSDCA, PDS. (WIKI dice 1.916 kg: discrepancia, ver Dudas.)
- Seca: < 949 kg. Fuente: NSSDCA, PDS. (WIKI: 1.018 kg.)
- Propelente (hidracina): ~894 kg (PDS); 882 kg (NTRS). Fuente: PDS, NTRS. Aproximado.
- Carga útil científica: ~92 kg. Fuente: NSSDCA.

## Viaje y captura lunar
- Duración del viaje: ~4,5 días. Fuente: WIKI.
- Inserción en órbita lunar (LOI): 23 jun 2009. Fuente: WIKI.
- Delta-v de LOI: NO VERIFICADO. Dato relacionado: capacidad total de hidracina ~1.300 m/s (PDS); el primer encendido LOI-1 quema ~50 % del combustible total y la captura dura ~40 min (NTRS).

## Órbita
- Órbita inicial: elíptica de 5 h, periselenio ~100 km, luego circular ~50 km (mapeo desde 15 sep 2009; fase de exploración 30–70 km polar, 1 año). Fuente: NSSDCA, WIKI.
- Cambio posterior: desde sep 2010 órbita elíptica "cuasi-congelada" ~30 x 180 km. Fuente: NSSDCA. Motivo: conservar combustible (WIKI: "fuel-conserving"). En 2015 el periselenio se bajó a ~20 km sobre el polo sur (WIKI).

## Energía
- Paneles solares: 10,7 m². Fuente: NSSDCA.
- Potencia: ~1.850 W fin de vida; promedio ~800 W por órbita. Fuente: NSSDCA.
- Batería: ion-litio, 80 A·h. Fuente: NSSDCA.
- Consumo de la carga útil: ~125 W. Fuente: NSSDCA.

## Comunicaciones
- Banda S: subida de comandos y bajada de baja tasa. Fuente: NSSDCA.
- Banda Ka: bajada de alta tasa 100–300 Mbps (100 Mbps con transmisor de 40 W y antena de alta ganancia según PDS/NTRS). Fuente: NSSDCA, NTRS.
- Registradores: dos de 100 GB. Fuente: NTRS.
- Volumen total enviado: >192 TB hasta mar 2011 (WIKI). Cifra actual NASA: NO VERIFICADO.

## Instrumentos (7)
Fuente: NSSDCA, WIKI.
| Instrumento | Mide | Relación |
|---|---|---|
| LROC | Cámaras angular estrecha (~0,5 m/píxel a 50 km) y ancha (100 m/píxel, 7 colores) | Mapa de superficie, sitios de aterrizaje |
| LOLA | Altímetro láser: topografía global | Mapa 3D, pendientes, hielo polar |
| Diviner | Radiómetro: temperatura superficial | Trampas frías / hielo en polos |
| LAMP | Mapeador UV lejano | Hielo en cráteres en sombra permanente |
| LEND | Neutrones | Hidrógeno/agua bajo la superficie, radiación |
| CRaTER | Telescopio de rayos cósmicos (plástico equivalente a tejido) | Radiación para astronautas |
| Mini-RF | Radar de apertura sintética (demo tecnológica) | Búsqueda de hielo, terreno |

## Costo
- LRO: US$504 millones; LRO+LCROSS: US$583 millones (LCROSS 79 M). Fuente: WIKI.
- NSSDCA indica ~US$460 millones (discrepancia, ver Dudas).

## Datos curiosos
1. LROC fotografió los sitios de aterrizaje de Apolo a ~0,5 m/píxel: se ven etapas de descenso y huellas del rover. Fuente: WIKI.
2. Diviner midió ~25 K (-250 °C) en el cráter Hermite, la temperatura más baja medida en el sistema solar (2009). Fuente: Space.com https://space.com/7311-moon-craters-coldest-place-solar-system.html y SVS https://svs.gsfc.nasa.gov/10595 (cifra exacta varía, ~25 K).
3. LRO encontró en 2019 el sitio de impacto del módulo indio Vikram; ~1,6 millones de nombres viajan en un chip a bordo. Fuente: WIKI.

## Eventos de juego (reales)
1. Unidad de medición inercial (MIMU): apagada en 2018 por degradación; en 2020 se probó software que usa star trackers en su lugar. Fuente: WIKI.
2. Evasión de colisión: 18 oct 2021 el orbitador indio Chandrayaan-2 maniobró para evitar un cruce cercano con LRO previsto el 20 oct 2021. Fuente: WIKI.
   (Extra: 4 ene 2011 anomalía del transmisor de Mini-RF, WIKI.)
- Modo seguro (safe mode): NO VERIFICADO.

## Tabla resumen
| Dato | Valor | Estado |
|---|---|---|
| Lanzamiento | 18-jun-2009, Atlas V 401, con LCROSS | Verificado |
| Masa lanzamiento / seca | 1.846 / <949 kg | Verificado (discrepancia WIKI) |
| Propelente | ~894 kg | Aproximado |
| Viaje / LOI | ~4,5 d / 23-jun-2009 | Verificado (WIKI) |
| Delta-v LOI | - | NO VERIFICADO |
| Órbita | 50 km circ. -> 30x180 km | Verificado |
| Paneles / potencia / batería | 10,7 m² / 1.850 W / 80 A·h | Verificado |
| Ka / S | 100–300 Mbps / baja tasa | Verificado |
| Datos totales | >192 TB (2011) | Parcial |
| Costo | 504 M (o ~460 M) | Discrepante |

## Dudas
- Masa: WIKI 1.916/1.018 kg vs NSSDCA/PDS 1.846/<949 kg; se recomienda usar la de NSSDCA/PDS.
- Costo: 504 M (WIKI) vs ~460 M (NSSDCA).
- Delta-v de LOI y modo seguro no encontrados.
- Volumen total actualizado de datos no encontrado en páginas NASA.
- Temperatura mínima: ~25 K, fuentes secundarias (Space.com/SVS), no página de misión.
- NSSDCA dice "Kennedy Space Center" y Cabo Cañaveral a la vez; es la misma zona (SLC-41).
