# NASA resources used in Galactic Odyssey (Odisea Galáctica)

Inventory for the Space Apps 2026 submission form. Game: https://mision.ja-war.com/orbita-2/?lang=en · Code: https://github.com/Destswod-01/ORBITA

No NASA logos or insignia are used anywhere in the game. NASA imagery and models are used as educational content under NASA's media usage guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/) and are credited in the in-game "Options and credits" dialog (`src/i18n/{es,en}/creditos.js`). The game is not affiliated with or endorsed by NASA.

## A. Mission data (numbers, not files)

| Resource | NASA source (URL) | Where it is used | License / use |
|---|---|---|---|
| LRO mission facts (masses, 7 instruments, orbits 50 km circular vs 30x180 km, power, Ka/S band, cost) | https://science.nasa.gov/mission/lro/ · NSSDCA https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-031A · PDS https://pds.nasa.gov/data/pds3/releases/backup/2016/201604.lrolola/insthost.cat · NTRS https://ntrs.nasa.gov/api/citations/20080012685/downloads/20080012685.pdf | `src/datos/misiones/lro*.json`, `piezas*.json`, report "real mission vs. your design" | Public NASA data, cited. Unverified values are flagged in `docs/DATOS_LRO.md` |
| Juno mission facts (3,625 kg, Atlas V 551, 14 kW at Earth / ~400 W at Jupiter, titanium vault, 8 instruments + JunoCam, 53-day vs 14-day orbit, JOI, safe-mode events, end-of-mission decision) | https://www.jpl.nasa.gov/news/press_kits/juno/facts/ · /spacecraft/ · /science/ · https://science.nasa.gov/mission/juno/ · NSSDCA https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-040A · https://science.nasa.gov/missions/juno/nasas-juno-back-to-normal-operations-after-entering-safe-mode/ | `src/datos/misiones/juno*.json`, `piezas*.json`, stage 08 decision cards, report | Public NASA/JPL data, cited in `docs/DATOS_NASA.md` |
| LOLA, LROC, Diviner instrument descriptions (LRO) | https://science.nasa.gov/mission/lro/ | Science objectives, instrument parts, stage 07 mapping | Public NASA data |
| MOLA (Mars Orbiter Laser Altimeter) relief | https://pds-geosciences.wustl.edu/missions/mgs/mola.html | Mars normal map (see section C) | NASA/PDS public data |
| Atlas V performance (Isp, thrust, payload) | Wikipedia (secondary) for Atlas V, RD-180, Centaur; JPL press kit for Juno's launch | `src/datos/cohetes*.json`, rocket equation | Secondary source, flagged in `docs/DATOS_NASA.md` |
| Deep Space Network (Goldstone, Madrid, Canberra) | https://science.nasa.gov/learn/basics-of-space-flight/chapter14-1/ · https://www.nasa.gov/communicating-with-missions/ | Ground segment in the report, stage 07 downlink (DSN packets), launch reference link | Public NASA education content |
| Other missions (Artemis I, MAVEN, OSIRIS-REx, DART, New Horizons) for event cards / flavour | https://science.nasa.gov/mission/ (per mission) | `docs/DATOS_NASA.md` part 2 | Public NASA data, mostly cross-checked via Wikipedia (flagged) |

## B. Process and educational references (design inspiration, no files copied)

| Resource | URL | Used for |
|---|---|---|
| Design and Develop Science Missions (NASA SmallSat Institute, Mar 2025) | https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf | Need→Concept→Requirements→Design→Verify→Implement flow, 4 mission segments, design review |
| Mission Design Lab (NASA Goddard) | https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/ | Study levels used as difficulty names; disciplines (power, comms, ADCS, radiation, debris) |
| CubeSat 101 (NASA CSLI) | https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf | Phase durations for the Time resource; reviews |
| Concept Maturity Levels (JPL) | https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299 | Early-design framing |
| A Learning Game About Telescopes (NASA Webb) | https://science.nasa.gov/mission/webb/game-build-it-yourself/ | Greyed-out incompatible parts; comparison with the real mission |

## C. Files shipped in the game (`public/`)

| File | NASA source | Where used | License / use |
|---|---|---|---|
| `modelos_nasa/lro_nasa.glb`, `juno_nasa.glb`, `antena_dsn_nasa.glb` | NASA 3D Resources (https://science.nasa.gov/3d-resources/) | Report "NASA 3D" panel (`PanelNasa3D.jsx`, `NaveRealNasa.jsx`), Draco-compressed | NASA 3D Resources: public domain / NASA media guidelines |
| `nasa/moon_lola_topo.jpg` | LOLA / LRO, NASA/GSFC/ASU (https://svs.gsfc.nasa.gov/) | Briefing objective card background (`src/datos/fotosObjetivo.js`) | NASA media guidelines; credited |
| `nasa/moon_south_pole.jpg` | LRO, NASA/GSFC/ASU | Briefing card (water/ice) | idem |
| `nasa/jupiter_great_red_spot.jpg`, `jupiter_polar_cyclones.jpg` | JunoCam, NASA/JPL-Caltech/SwRI/MSSS (https://photojournal.jpl.nasa.gov/) | Briefing cards (interior, atmosphere, magnetosphere) | NASA/JPL image use policy; credited |
| `nasa/earth_blue_marble.jpg` | NASA Blue Marble (https://visibleearth.nasa.gov/) | Briefing card (radiation) | NASA media guidelines |
| `texturas/earth_daymap.jpg`, `earth_clouds.jpg`, `earth_normal_2048.jpg`, `earth_specular_2048.jpg`, `earth_lights_2048.png`, `moon.jpg`, `mars.jpg`, `jupiter.jpg` | Solar System Scope 2K maps (https://www.solarsystemscope.com/textures/), derived from NASA data | 3D planets (`src/tres/PlanetasHD.jsx`, `src/paisajes/PlanetasNasaHD.jsx`) | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); credited in game |
| `texturas/planetas/luna_normal_lola.jpg` | Lunar relief from LOLA (NASA/GSFC) | Moon normal map (`PlanetasHD.jsx:228`) | NASA data; exact origin to be confirmed by the file's author |
| `texturas/planetas/marte_hd.jpg`, `marte_normal_mola.jpg` | Mars imagery / MOLA (NASA/JPL/USGS) | Mars (`PlanetasHD.jsx:409-410`) | NASA data; origin to be confirmed |
| `texturas/planetas/` others (caronte, ceres, encelado, io, jwst_carina, luna_hd, mercurio, neptuno, pluton, saturno, saturno_anillos, titan_sup, urano, venus_*) | Presumably NASA missions (New Horizons, Dawn, Cassini, Galileo, Messenger, Magellan; JWST: NASA/ESA/CSA/STScI) | **Not referenced by the code** | Provenance undocumented; they are excluded from the clean delivery repo |
| `draco/*` | Google Draco decoder (not NASA) | Decodes the NASA GLB models | Apache 2.0 |

## D. Derived / third-party channels

- Solar System Scope textures (CC BY 4.0) derive from NASA public data.
- `src/datos/paisajesNasa.json` (`fuente_nasa` fields) cites: NASA Visible Earth / Suomi NPP; NASA SVS CGI Moon Kit (LROC + LOLA); NASA/USGS Mars Global Surveyor; NASA/JPL/SwRI JunoCam; NASA/JPL Galileo & Europa Clipper; NASA/JPL Cassini & OSIRIS-REx.
- Procedural textures (Europa, Saturn rings, asteroid rock) are generated in code.

## E. Not NASA (for completeness)

React, Vite, Three.js, React Three Fiber, drei (MIT); fonts Inter, JetBrains Mono, Saira Condensed (SIL OFL, loaded from Google Fonts); sounds synthesized with the Web Audio API (no samples). UI images (`public/img/*.webp`) and 3D probe models were made by the team with AI assistance; none contains NASA branding.
