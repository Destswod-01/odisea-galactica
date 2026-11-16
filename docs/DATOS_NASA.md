# Datos NASA verificables para el juego de diseño de misiones

Fecha de la investigación: 2026-11-05. Formato: valor — fuente. "NO VERIFICADO" = no hallado en fuente confiable.
Abreviaturas de fuente: **[JPL-F]** https://www.jpl.nasa.gov/news/press_kits/juno/facts/ · **[JPL-S]** https://www.jpl.nasa.gov/news/press_kits/juno/spacecraft/ · **[JPL-C]** https://www.jpl.nasa.gov/news/press_kits/juno/science/ · **[NASA-J]** https://science.nasa.gov/mission/juno/ · **[WP-J]** https://en.wikipedia.org/wiki/Juno_(spacecraft) · **[NSSDC-J]** https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-040A

## PARTE 1 — Juno

### Lanzamiento
| Dato | Valor | Fuente |
|---|---|---|
| Fecha | 5 ago 2011, 12:25 EDT (16:25 UTC) | [JPL-F], [NASA-J] |
| Cohete | Atlas V 551 (AV-029); altura 60 m; masa total con nave 573 910 kg | [JPL-F]; AV-029 en [WP-J] |
| Sitio | Pad SLC-41, Cabo Cañaveral | [JPL-F] |
| Masa al lanzamiento | 3 625 kg | [JPL-F] |
| Masa seca | 1 593 kg | [JPL-F] |
| Propelente | 1 280 kg combustible (hidracina) + 752 kg oxidante = 2 032 kg (1 232 kg disponibles al llegar a Júpiter) | [JPL-F] |
| Dimensiones cuerpo | 3,5 m alto x 3,5 m diámetro | [JPL-F] |
| Motor principal | Leros-1b, 645 N, hidracina/N2O4 | [JPL-S] |

### Trayectoria
| Dato | Valor | Fuente |
|---|---|---|
| Asistencia gravitatoria Tierra | 9 oct 2013; altitud mínima 500 km (311 mi) | [JPL-F] |
| Ganancia de velocidad en el flyby | más de 3,9 km/s | [WP-J] (secundaria) |
| Llegada / JOI | 4 jul 2016 (hora Pacífico; 5 jul UTC) | [JPL-F], [WP-J] |
| Duración encendido JOI | 35 min nominal (2 102 s) | [JPL-F], [WP-J] |
| Delta-v del JOI | ~542 m/s | [WP-J] (JPL no lo declara; secundaria) |
| Propelente gastado en JOI | ~447 kg (241 kg hidracina + 206 kg oxidante) | [JPL-F] |
| Distancia Tierra–Júpiter al JOI | 869 millones km; luz 48 min 19 s | [JPL-F] |
| Distancia recorrida lanzamiento→JOI | 2 800 millones km | [JPL-F] |
| Distancia Sol–Júpiter | "unas 5 veces" la de la Tierra (≈5,2 UA, valor astronómico general, no extraído de la página) | [JPL-S] |
| Luz solar en Júpiter vs Tierra | ~25 veces menos (≈4 %) | [JPL-S] |
| Velocidad relativa a la Tierra en JOI | 57,9 km/s | [JPL-F] |
| Aproximación mínima a las nubes | ~2 600 millas (~4 200 km) | [JPL-F] |

### Energía
| Dato | Valor | Fuente |
|---|---|---|
| Alas / paneles | 3 alas, 11 paneles (la tercera ala termina en la pluma del magnetómetro) | [JPL-S] |
| Celdas | 18 698 | [JPL-F] |
| Área | ~60 m² (cada ala 9 m x 2,65 m) | [JPL-F] |
| Potencia en la Tierra | ~14 kW | [JPL-F] (NSSDC dice 18 kW; ver dudas) |
| Potencia en Júpiter | ~400 W (≈486 W a la llegada, bajando a ~420 W) | [JPL-F]; paréntesis [WP-J] |
| Envergadura | >20 m desplegada | [JPL-S] |
| Baterías | 2 de iones de litio, 55 Ah | [JPL-S] |
| Giro | 1 rpm crucero, 2 rpm ciencia, 5 rpm en encendidos | [JPL-S] |

### Bóveda de radiación
- Material: titanio — [JPL-S]. Espesor: ~1 cm por cara, 8 caras — [JPL-S]. Masa: ~18 kg por cara, ~200 kg total — [JPL-S]; la página NASA Juno dice ~180 kg (400 lb) — [NASA-J].
- Reducción de radiación: factor ~800 — [WP-J].

### Instrumentos (8 científicos + JunoCam) — [JPL-C]
Masa y potencia de cada instrumento: **NO VERIFICADO** (no aparecen en las páginas oficiales consultadas).
| Instrumento | Qué mide |
|---|---|
| MWR (Radiómetro de microondas) | Emisión de microondas de la atmósfera, hasta ~1 000 bar; 6 antenas, 0,6–22 GHz |
| Gravity Science (GS) | Campo gravitatorio, por efecto Doppler en bandas X y Ka |
| MAG (Magnetómetro) | Campo magnético 3D; 2 magnetómetros fluxgate + 4 cámaras de estrellas |
| JADE | Electrones e iones de baja energía que producen auroras |
| JEDI | Electrones e iones de alta energía en el campo magnético |
| JIRAM (Italia/ASI) | Imágenes/espectros infrarrojos de auroras y atmósfera (50–70 km bajo las nubes) |
| UVS | Imágenes/espectros ultravioleta de auroras (~68–210 nm) |
| Waves | Ondas de radio y plasma en la magnetosfera |
| JunoCam | Cámara de luz visible para divulgación (hasta 25 km/píxel); no es instrumento científico |

Nota: NASA Juno lista además la Unidad de Referencia Estelar (SRU) — [NASA-J]; el NSSDC menciona ASC y SHM por separado — [NSSDC-J].

### Comunicaciones
- Antena de alta ganancia: 2,5 m, reflector dual, banda X (datos) y Ka (solo portadora/gravedad) — PDS: https://pds.nasa.gov/data/pds3/releases/latest/2024/202402-juno/zzold/HOST.CAT (hallado en resultados de búsqueda; no abierto directamente, tratar con cautela).
- Tasa de datos mínima de diseño: 18 kbps a 6,46 UA con antena DSN de 34 m (12 kbps en pasos de gravedad) — misma fuente PDS. Tasa pico: **NO VERIFICADO**.
- Computadora RAD750, 100 Mbps de rendimiento de instrumentos — [JPL-S] (Wikipedia dice ~50 Mbit/s).
- Retardo de luz Tierra–Júpiter al JOI: 48 min 19 s — [JPL-F].

### Periodo orbital 53 d vs 14 d
- Órbita de captura: ~53,5 días; plan: maniobra de reducción de periodo (PRM) a órbita científica de 14 días — [WP-J].
- 14 oct 2016: la telemetría mostró que dos válvulas de retención de helio abrían lentamente; la PRM del 19 oct se pospuso — https://spaceflightnow.com/2017/02/21/nasas-juno-spacecraft-to-remain-in-current-orbit-around-jupiter/ y [WP-J].
- 17 feb 2017: se decide quedarse en 53 días: un encendido fallido podía dejar la nave a medio camino entre órbitas — misma fuente. Consecuencia: menos pasos cercanos, pero menos radiación acumulada.

### Costo
- Total: 1 130 millones USD (desarrollo, instrumentos, lanzamiento, operaciones, 78 meses) — [JPL-F]. Propuesta original ~700 M USD (año fiscal 2003) — [WP-J].

### Eventos reales de operación (útiles para el juego)
- 18–19 oct 2016: modo seguro ~13 h antes del perijove 2; sin datos científicos en ese paso. Salió el 24 oct — [WP-J]; https://www.seradata.com/nasa-juno-mission-suffers-safe-mode-control-drop-out
- 4 abr 2025 (perijove 71): modo seguro dos veces (1 h antes y 45 min después del perijove); reinició la computadora, apagó funciones no esenciales, apuntó la antena a la Tierra; probable causa: radiación — https://science.nasa.gov/missions/juno/nasas-juno-back-to-normal-operations-after-entering-safe-mode/ . NASA cuenta 4 entradas inesperadas a modo seguro desde 2016, con recuperación total cada vez — misma fuente.
- Válvulas de helio y cancelación de la PRM (arriba).

### Fin de misión / extensión
- Plan original: fin 20 feb 2018 (deorbit) — [JPL-F]. Extendida a jul 2021, luego a sep 2025 — [WP-J], [NASA-J].
- Después de sep 2025: **NO VERIFICADO**. Wikipedia dice Extended Mission 2 desde oct 2025 hasta sep 2028; no hallé confirmación NASA. Prensa: el presupuesto FY2026 pedía cancelarla; el Congreso asignó fondos a ciencia planetaria.

## PARTE 2 — Otras misiones

### Artemis I (https://en.wikipedia.org/wiki/Artemis_I)
- Cohete: SLS Block 1 (2 propulsores de 5 segmentos, núcleo con 4 RS-25D, ICPS con 1 RL10B-2); empuje al despegue ~39 000 kN.
- Lanzamiento: 16 nov 2022, 06:47 UTC, LC-39B, KSC. Duración 25 d 10 h 52 min. Amerizaje 11 dic 2022.
- Distancia máxima de la Tierra: 432 210 km (récord para nave diseñada para humanos). Cercanías a la Luna ~130 km.
- Energía: paneles solares del módulo de servicio de Orion (potencia NO VERIFICADO).
- Costo: ~4 100 M USD por lanzamiento (informe OIG IG-22-003, nov 2021), vía https://spacepolicyonline.com/news/nasa-ig-skeptical-of-major-sls-cost-savings-from-services-contract/ (secundaria).
- Masa de Orion: NO VERIFICADO.
- Incidentes: scrubs del 29 ago (sensor del motor 3 + fuga de hidrógeno) y 3 sep 2022 (fuga de hidrógeno); huracanes Ian y Nicole; el escudo térmico perdió material (AVCOAT) por gas atrapado en la reentrada con rebote; anomalía eléctrica en Orion resuelta antes del 5 dic.

### MAVEN (elegida sobre MRO por mejores datos; https://en.wikipedia.org/wiki/MAVEN)
- Cohete: Atlas V 401, 18 nov 2013, SLC-41.
- Masa: 2 454 kg lanzamiento, 809 kg seca (~1 640 kg propelente).
- Energía: solar, 1 135 W.
- Costo: 582,5 M USD (366,8 desarrollo + 187 lanzamiento + 35 misión primaria).
- Inserción orbital marciana: 22 sep 2014. Delta-v del MOI: NO VERIFICADO.
- Órbita: inicial ~6 200 x 150 km; tras aerofrenado (2019) ~4 500 x 130 km, inclinación 75°, periodo 3,6 h.
- Incidentes: fallos de IMU 2021–22, solución con modo "solo estelar" (mayo 2022); 6 dic 2025 pérdida de contacto, la nave giraba de forma inesperada (confirmado por prensa: https://www.space.com/space-exploration/launches-spacecraft/nasas-loses-contact-with-maven-mars-orbiter-on-the-far-side-of-the-red-planet). Fin de misión declarado el 3 jun 2026: solo en Wikipedia, NO VERIFICADO en NASA.

### OSIRIS-REx (https://en.wikipedia.org/wiki/OSIRIS-REx)
- Cohete: Atlas V 411, 8 sep 2016, SLC-41. Masa 2 110 kg (880 seca, ~1 230 kg hidracina).
- Energía: solar, 1 226–3 000 W (según distancia al Sol).
- Costo: ~800 M USD sin lanzamiento (+183,5 M del Atlas V).
- Fechas: flyby Tierra 22 sep 2017; llegada a Bennu 3 dic 2018; recogida de muestra (TAG) 20 oct 2020; salida 10 may 2021; cápsula 24 sep 2023 (Utah). Muestra: 121,6 g.
- Delta-v: primera maniobra de espacio profundo 28 dic 2016, 431 m/s con 354 kg de combustible.
- Incidentes: rocas atascaron la tapa del recolector y se perdieron partículas (muestra guardada antes de lo previsto); sujetadores dañados retrasaron la apertura hasta 13 ene 2024; el paracaídas drogue no se desplegó por un error de cableado, el principal sí.
- Extensión OSIRIS-APEX a Apophis, llegada abr 2029; propuesto cancelar en FY2026, salvado por el Congreso.

### DART (https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test)
- Cohete: Falcon 9 Block 5, 24 nov 2021, Vandenberg SLC-4E. Masa 610 kg (~500 kg al impacto).
- Energía: paneles de ~22 m² para el propulsor iónico NEXT-C (~3,5 kW); el "6,6 kW" del infobox es dudoso.
- Costo: ~330 M USD.
- Impacto: 26 sep 2022, 23:14 UTC, a ~6,6 km/s contra Dimorphos. Cambio de periodo: ~32 min (umbral de éxito 73 s); beta = 3,6.
- Delta-v: NO VERIFICADO.
- Incidentes: el propulsor iónico en modo reset consumió ~100 A en vez de 25 A y se dejó de usar (se usó hidracina, ~50 kg); navegación autónoma SMART Nav en las últimas horas; LICIACube se separó 15 días antes para fotografiar.

### New Horizons (https://en.wikipedia.org/wiki/New_Horizons)
- Cohete: Atlas V 551 + etapa Star 48B, 19 ene 2006. Masa 478 kg (401 seca). Velocidad de salida ~16,26 km/s.
- Energía: RTG, 245,7 W al lanzamiento, ~202 W en Plutón (2015), ~190 W en 2019.
- Costo: ~700 M USD (2001–2016).
- Fechas: Júpiter 28 feb 2007 (+~4 km/s); Plutón 14 jul 2015 a 12 500 km; Arrokoth 1 ene 2019 a ~3 500 km.
- Datos: ~1 kbit/s por transmisor desde Plutón vs 38 kbit/s en Júpiter; latencia ~4,5 h.
- Incidentes: 19 mar 2007 error de memoria no corregible, modo seguro, recuperación en 2 días; 4 jul 2015 (diez días antes de Plutón) modo seguro por sobrecarga de comandos de ciencia, recuperada en 2 días.

## PARTE 3 — Mecánica de cohetes (Atlas V 551)
Fuentes: https://en.wikipedia.org/wiki/Atlas_V , https://en.wikipedia.org/wiki/RD-180 , https://en.wikipedia.org/wiki/Centaur_(rocket_stage) (secundarias).

| Etapa | Isp | Empuje | Masa seca | Propelente | Combustión |
|---|---|---|---|---|---|
| 1.ª etapa Atlas V (CCB, 1 RD-180, RP-1/LOX) | 311 s (nivel del mar), 338 s (vacío) | 3 827 kN SL / 4 152 kN vacío | 21 054 kg | 284 089 kg | 253 s |
| Centaur III (1 RL10, LH2/LOX) | ~450 s | ~99 kN | 2 247–2 316 kg | 20 830 kg | 842 s |
| 5 SRB (551), AJ-60A | 279 s | 1 688 kN c/u | 46 697 kg brutos c/u | 42 630 kg c/u | 94 s |

Carga útil Atlas V 551: ~18 800 kg a LEO, ~8 900 kg a GTO. Masa de despegue general ~590 000 kg (JPL da 573 910 kg para Juno).

## Tabla resumen
| Misión | Cohete | Masa lanz. | Energía | Costo | Dato clave |
|---|---|---|---|---|---|
| Juno | Atlas V 551 | 3 625 kg | Solar 14 kW Tierra / ~400 W Júpiter | 1 130 M USD | JOI 35 min, ~542 m/s; órbita 53 d |
| Artemis I | SLS Block 1 | NO VERIFICADO | Solar (Orion/ESM) | ~4 100 M USD/lanzamiento | 25,4 días; 432 210 km |
| MAVEN | Atlas V 401 | 2 454 kg | Solar 1 135 W | 582,5 M USD | Órbita 4 500 x 130 km |
| OSIRIS-REx | Atlas V 411 | 2 110 kg | Solar 1 226–3 000 W | ~800 M USD | Muestra 121,6 g |
| DART | Falcon 9 | 610 kg | Solar ~22 m², NEXT-C | ~330 M USD | Periodo −32 min |
| New Horizons | Atlas V 551 + Star 48B | 478 kg | RTG 245,7 W | ~700 M USD | 16,26 km/s de salida |

## Dudas / datos contradictorios
- Potencia solar de Juno en la Tierra: 14 kW (JPL) vs 18 kW (NSSDC) vs 12–14 kW (Wikipedia). Se usa JPL.
- Masa de la bóveda: ~200 kg (JPL) vs ~180 kg (NASA Juno); otras fuentes 150 kg. Espesor: 1 cm vs "media pulgada" (Google Arts).
- NSSDC da masa 1 500 kg para Juno; no coincide con 1 593 kg seca ni 3 625 kg total; usar JPL.
- Área de paneles: JPL dice "más de 650 ft²" y "60 m²" (inconsistente, 60 m² ≈ 646 ft²); Wikipedia 50 m² de celdas activas.
- Rendimiento de instrumentos: 100 Mbps (JPL) vs 50 Mbit/s (Wikipedia).
- Fecha del modo seguro de 2016: 18 vs 19 oct (huso horario).
- Delta-v del JOI (542 m/s) viene de Wikipedia, no de NASA; un artículo de Astronomy.com habla de 350 m/s en 22 min para otra maniobra: no usar.
- Wikipedia menciona la cancelación de una quema el 11 dic 2016; los hechos: pospuesta en oct 2016, decisión final feb 2017.
- Estado de Juno tras sep 2025 y de MAVEN en 2026: dependen de fuentes secundarias.
- Gran parte de la Parte 2 y 3 viene de Wikipedia (respaldo); no se abrieron las páginas NASA de esas misiones.

## Recursos del reto usados en el juego (15 nov 2026)

Se citan en el diálogo «Opciones y créditos» del menú y en el formulario de la entrega.
- **Design and Develop Science Missions**, de NASA SmallSat Institute (marzo 2025). De aquí salen los 4 segmentos de una misión (lanzamiento, espacio, tierra y usuario) y el proceso *necesidad → concepto → requisitos → diseño → construir y verificar → implementar* (tareas B6 y B9). https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
- **Mission Design Lab**, de NASA Goddard. De aquí salen los niveles de estudio (Concept Development y Trade Study) para la dificultad y las disciplinas que revisa: potencia, comunicaciones, control de orientación, radiación y basura orbital. https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
- **CubeSat 101**, de NASA CSLI. De aquí salen los tiempos de cada fase, para el recurso Tiempo (tarea B3), y las revisiones de factibilidad y de preparación. https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf
- **Concept Maturity Levels**, del JPL. Los CML 1–4 son la etapa temprana del diseño. https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299
- **A Learning Game About Telescopes**, de NASA/Webb. Es referencia de diseño: las opciones incompatibles salen en gris y al final se compara con la misión real. https://science.nasa.gov/mission/webb/game-build-it-yourself/
- **Deep Space Network** (Goldstone, Madrid y Canberra) es el segmento de tierra que aparece en el informe.
