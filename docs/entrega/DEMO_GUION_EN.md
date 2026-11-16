# Órbita 2.0 — 30-Second Demo Script, Subtitles & 7-Slide Backup Deck (EN)

> **Compliance & Visual Rules (Mandatory)**
> - **NO NASA logos or national flags** anywhere (not in slides, video intros, overlays, thumbnails, or screenshots).
> - **NO people under 18 years old** in any video frame, voiceover cameo, or photo.
> - **Language:** All submission demo text, SRT subtitles, and slides MUST be in **English**. (A Spanish spoken voiceover script is included below in case narration is recorded in Spanish with English subtitles.)
> - **Build to record:** Capture all footage and screenshots on **version `-23` or later** (after merging the New Main Menu, Orbit selection, Difficulty levels, Quick simulation, Team mode, Design Review, and the 4-segment Post-Mission Report) using `?lang=en`.
> - **Planet textures:** Planet maps are licensed from **Solar System Scope** (CC BY 4.0). Do NOT claim the game uses NASA SVS CGI Moon Kit terrain or JPL Jupiter maps.
> - **AI assets:** Do not generate AI images of NASA branding; any AI-generated image must carry a visible watermark. Recording pure in-game 3D footage is strongly recommended.
> - **Base URLs:**
>   - Published: `https://mision.ja-war.com/orbita-2/`
>   - Local dev: `http://localhost:5173/`

---

## 1. 30-Second Demo Video Script (`0:00` – `0:30`)

Target total runtime: **30 seconds max** (pace ~75–85 words in English, ~2.6 words/sec).  
Placeholders in brackets (`[...]`) must be filled with verified team details before recording.

| Timestamp | Section (Space Apps Guide) | Spoken Narration (English) | On-Screen Action & Exact URL to Record |
|---|---|---|---|
| **0:00 – 0:02** | **Team, Challenge & Project Name** | "Hi, we're **[Team Name / Names]** for the NASA Space Apps **Space Mission Design** challenge—this is **Órbita 2.0**." | Open the **New Main Menu (`U1`)** in English, showing campaign missions (LRO, Juno, and upcoming destinations), 3D operator dialog, and direct mode buttons.<br>URL: `/?lang=en`<br>*(Overlay text: `Órbita 2.0 · [Team Name] · Space Mission Design`. No NASA logos, no flags, no minors.)* |
| **0:02 – 0:05** | **Problem & Spacecraft Design** | "Space missions are unforgiving trade-offs. In our 3D Hangar, choose orbits, balance resources, run quick simulations, and vote in 4-role teams." | 1. **3D Hangar** rotating the spacecraft and opening the **Orbit selection** chip (`B1`) as resource bars update.<br>URL: `/?modo=pruebas&lang=en`<br>2. Highlight **Quick simulation (`B5`)** button and **Team voting (`B4`)** interface. |
| **0:05 – 0:10** | **How It Works (Verification & Flight Loop)** | "Pass a NASA-style Design Review verifying each requirement, then fly launch, drone networks, 3D surface rendezvous, and orbit insertion." | Fast-cut gameplay montage (1–1.2 s each):<br>1. **Design Review checklist (`B9`)**: requirement verification before launch.<br>2. 3D Launch rings: `/?probar=lanzamiento&lang=en&mision=lro`<br>3. 3D Lunar drone rendezvous: `/?probar=encuentro&lang=en&mision=lro&drones=2&objetivo=tycho&semilla=7`<br>4. Juno orbit insertion: `/?probar=insercion&lang=en&mision=juno&semilla=7` |
| **0:10 – 0:20** | **How It Works with NASA Data & 4 Segments** | "Powered by real NASA data from **LRO** and **Juno**—masses, instruments, Deep Space Network downlink, and the 4 mission segments—our report explains 'Why did it turn out this way?'" | 1. **0:10–0:14:** Stage 07 Science Operations (mapping, spectrum, DSN downlink) on Juno or LRO:<br>`/?probar=operacion&lang=en&mision=juno&semilla=7&fase=1`<br>2. **0:14–0:20:** Stage 08 Extended Mission & disposal leading into the **Post-Mission Report (`B6`)** ("Why did it turn out this way?", 4 segments, and real NASA comparison):<br>`/?probar=extendida&lang=en&mision=lro&semilla=7` *(complete final disposal step to show the Report)* |
| **0:20 – 0:30** | **Future & Call to Action** | "Next: new missions like MAVEN, DART, and OSIRIS-REx, networked multiplayer, shareable design links, and leaderboards. Design, fly, and operate your mission today." | Quick pan of campaign roadmap on the main menu and clean end card with playable link: `https://mision.ja-war.com/orbita-2/?lang=en`<br>URL: `/?lang=en` *(end card over live menu backdrop; no NASA logos or flags)* |

### Recording Checklist for Video Editor
- Record at **1920×1080 (16:9)** or clean desktop viewport (`1366×768` scaled), **60 fps** if smooth, mute system notifications.
- Append `?lang=en` on every recording URL so all menus, parts, and HUD are in English.
- Keep **Stage 05 (`?probar=encuentro`)** crisp by setting `&objetivo=tycho&semilla=7` (Moon) or `&mision=juno&objetivo=pluma&semilla=7` (Io).

### Shortest Real Paths to Record the Post-Mission Report
Because the game does not have a standalone `?probar=informe` shortcut, use one of the two shortest routes verified in `src/App.jsx`:
1. **Direct Stage 08 Shortcut (Fastest — ~15 seconds):**
   - URL: `/?probar=extendida&lang=en&mision=lro&semilla=7`
   - Click to start the Extended Mission, proceed through the event cards, make the final disposal choice (e.g., lunar impact disposal), and click **View Report** (`ext-informe`).
   - This transitions directly into the **Post-Mission Report**, displaying the score medal, the *"Why did it turn out this way?"* cause-and-effect list, the **4 NASA mission segments** (Launch, Space, Ground DSN, Data User), the side-by-side comparison with the real NASA spacecraft, and the attempt comparison table (`Comparacion`).
2. **Beginner Campaign Run (Full organic walkthrough):**
   - URL: `/?lang=en`
   - On the New Main Menu (`U1`), click **Start Mission** on LRO → In the Briefing, select **Concept Development (Beginner)** difficulty. In Beginner mode, the Hangar highlights recommended parts with generous margins.
   - Test your configuration with **Quick simulation** (`SimulacionRapida`), click **Launch** → approve the **Design Review** (`RevisionDiseno`) checklist → complete the stages to reach the Report screen.

---

## 2. English Subtitles (`.srt`)

Valid SubRip (`.srt`) file timed strictly within `00:00:00,000` – `00:00:30,000`. Replace `[Team Name]` before uploading.

```srt
1
00:00:00,000 --> 00:00:02,000
Hi, we're [Team Name] for Space Mission Design—this is Órbita 2.0.

2
00:00:02,000 --> 00:00:05,000
In our 3D Hangar, pick orbits, balance resources, simulate, and vote in teams.

3
00:00:05,000 --> 00:00:10,000
Pass a NASA-style Design Review, then fly launch, drones, rendezvous, and orbit insertion.

4
00:00:10,000 --> 00:00:15,000
Built on real NASA LRO and Juno data, Deep Space Network comms, and science ops.

5
00:00:15,000 --> 00:00:20,000
Our 4-segment post-mission report explains why you succeeded or failed against NASA's real spacecraft.

6
00:00:20,000 --> 00:00:25,000
Next: MAVEN, DART, and OSIRIS-REx missions, networked multiplayer, design sharing, and leaderboards.

7
00:00:25,000 --> 00:00:30,000
Órbita 2.0: Design, Fly, and Operate Your Own Space Mission.
```

---

## 3. Versión hablada en español (si el video se narra en español con subtítulos en inglés)

> Usa esta locución si prefieres hablar en español manteniendo los **subtítulos `.srt` en inglés** activos en el video. Duración objetivo: **30 segundos exactos**.

- **0:00 – 0:02 (Equipo, reto y nombre):**  
  «Somos **[Nombre del equipo]** para el reto de diseño de misiones espaciales: esto es **Órbita 2.0**.»
- **0:02 – 0:05 (Problema, hangar 3D y equipo):**  
  «En nuestro hangar 3D eliges órbita, equilibras recursos, simulas al instante y votas en equipo.»
- **0:05 – 0:10 (Revisión de diseño y vuelo de etapas):**  
  «Supera una revisión de diseño estilo NASA y vuela lanzamiento, drones, encuentro 3D e inserción orbital.»
- **0:10 – 0:20 (Datos de la NASA, operaciones e informe de 4 segmentos):**  
  «Con datos reales de **LRO** y **Juno**, la Red del Espacio Profundo y los 4 segmentos de misión, nuestro informe explica por qué funcionó o falló tu nave frente a la de la NASA.»
- **0:20 – 0:30 (Futuro y cierre):**  
  «Lo que sigue: misiones MAVEN, DART y OSIRIS-REx, multijugador en red, compartir diseños y tablas de clasificación. Diseña, vuela y opera tu misión en **Órbita 2.0**.»

---

## 4. Alternativa: 7 diapositivas (Backup Pitch Deck — English)

> Use this 7-slide deck if submitting slides instead of (or alongside) the 30-second video.  
> **Strict visual rules:** NO NASA logos, NO flags, NO minors under 18. Any AI-generated graphic must show a watermark; prefer clean in-game screenshots captured with `?lang=en`.

### Slide 1 · Title
- **Slide Text (EN):**
  - **Órbita 2.0**
  - *Design, Fly and Operate Your Own Space Mission*
  - Team: **[Team Name / Member Names]**
  - Challenge: **Space Mission Design** (NASA Space Apps Challenge 2026)
  - Live playable web app (desktop & mobile): `https://mision.ja-war.com/orbita-2/?lang=en`
- **Screenshot to place:** New Main Menu (`U1`) showing campaign mission column (LRO, Juno, and upcoming missions), 3D operator dialog, play/sandbox buttons, and clean backdrop.
  - Capture URL: `/?lang=en`

### Slide 2 · Intro
- **Slide Text (EN):**
  - **What is Órbita 2.0?**
  - A browser-based 3D space mission simulator—playable on desktop and mobile—where you engineer a science spacecraft and experience its entire lifecycle end to end.
  - Choose real-inspired missions: **the Moon (LRO)** or **Jupiter (Juno)**, with upcoming missions previewed on the campaign map.
  - Built for learners and collaborative teams with two difficulty tiers (*Concept Development* / Beginner and *Trade Study* / Intermediate) plus solo or 4-role team play (Mission Director, Spacecraft Engineering, Science, Comms & Resources) with team voting.
- **Screenshot to place:** Mission Briefing screen for LRO or Juno showing science questions, difficulty selector, and 4-role team setup.
  - Capture URL: `/?lang=en` → click **Start Mission (LRO)** to capture Briefing.

### Slide 3 · Problem
- **Slide Text (EN):**
  - **Why Space Mission Design Is Hard to Grasp**
  - Real mission engineering is not picking "the best part"—it is managing ruthless **coupled trade-offs**.
  - Bigger instruments demand more power, mass, and downlink bandwidth; Jupiter receives **~25× less sunlight** than Earth and intense radiation; orbit selection changes coverage, thermal exposure, communications, and fuel lifetime.
  - Most games skip engineering consequences—or hide why real probes look and fly the way they do.
- **Screenshot to place:** 3D Hangar showing resource bars (mass vs. launcher capacity, budget, power, Δv, downlink vs. data generated) and orbit selection chip with active trade-off feedback.
  - Capture URL: `/?modo=pruebas&lang=en` (toggle orbit chip or heavy payload to show trade-off feedback).

### Slide 4 · How to Play
- **Slide Text (EN):**
  - **Design, Verify, Fly, Compare**
  - **1. Engineer in the 3D Hangar:** Choose orbit (e.g., LRO 50 km circular vs. 30×180 km elliptical; Juno 53-day vs. 14-day Jovian), select launcher, propulsion, power, antenna, shielding, battery, computer, and instruments. Run instant outcome tests with **Quick Simulation** (`B5`).
  - **2. Team Voting & Design Review:** In team mode, 4 roles negotiate and vote (`B4`). Then pass a NASA-style **Design Review** (`B9`) verifying each requirement against its verification method before launch.
  - **3. Fly 8 Mission Stages:** Launch → Early Operations (LEOP) → Drone Network → 3D Surface Rendezvous → Orbit Insertion → 3-Phase Science Ops → Extended Mission & Disposal.
- **Screenshot to place:** Split collage of active gameplay shots:
  - 3D Hangar with Orbit Chooser & Quick Simulation: `/?modo=pruebas&lang=en`
  - Design Review checklist: pass verification before launch
  - 3-Phase Science Operations: `/?probar=operacion&lang=en&mision=lro&semilla=7&fase=1`

### Slide 5 · NASA Data
- **Slide Text (EN):**
  - **Grounded in Official NASA Data & Systems Engineering Frameworks**
  - **Mission Parameters (LRO & Juno):** Spacecraft dry and wet masses, Atlas V 401 & 551 launcher capacities, solar irradiance at 1 AU vs. 5.2 AU, RTG radioactive decay, titanium radiation vault shielding, real orbital options, and real extended-mission events and disposal decisions (e.g., Jovian atmospheric entry for planetary protection).
  - **Systems Engineering Process:** Structured around NASA's *Design and Develop Science Missions* (4 mission segments: launch, space, Deep Space Network ground, and data user), NASA Goddard's *Mission Design Lab* study levels, JPL's *Concept Maturity Levels*, and *CubeSat 101* development timelines.
  - **Ground Segment:** NASA Deep Space Network (Goldstone, Madrid, Canberra) ground passes, scheduling, and downlink bandwidth constraints.
  - **Planet Textures Credit:** Planet maps licensed from Solar System Scope (CC BY 4.0) with custom three.js shader rendering.
- **Screenshot to place:** Juno Orbit Insertion or Science Operations around Jupiter showing spacecraft & planet with Deep Space Network communication parameters.
  - Capture URL: `/?probar=insercion&lang=en&mision=juno&semilla=7` or `/?probar=operacion&lang=en&mision=juno&semilla=7&fase=2`

### Slide 6 · What the Player Learns
- **Slide Text (EN):**
  - **Fail Fast, Understand Why, Compare with Reality**
  - Players discover *why* NASA built Juno with 9-meter solar wings and a titanium radiation vault—and *why* downlink limits can bottleneck science data.
  - The **Post-Mission Report** explains *"Why did it turn out this way?"* line by line with cause-and-effect breakdowns, tracks the **4 NASA mission segments** (launch, space, Deep Space Network ground, data user), displays the attempt comparison table, and scores your design side by side against the real NASA spacecraft.
  - Players can redesign in seconds and compare their last 5 attempts to learn iteratively.
- **Screenshot to place:** Final Mission Report showing mission score, "Why did it turn out this way?" cause-and-effect list, 4 mission segments, and real NASA comparison.
  - Capture URL: `/?probar=extendida&lang=en&mision=lro&semilla=7` → complete the disposal choice and click "View Report" to land on the Mission Report screen.

### Slide 7 · Future
- **Slide Text (EN):**
  - **Roadmap: What's Next for Órbita 2.0**
  - **New NASA Missions:** Playable campaign expansion with **MAVEN** (Mars atmospheric evolution), **DART** (planetary defense kinetic impactor), and **OSIRIS-REx** (asteroid sample return).
  - **Networked Multiplayer:** Online multiplayer across separate devices (expanding beyond local shared-device team play).
  - **Community Sharing & Competition:** Share custom spacecraft designs via encoded URL parameters (`?diseno=...`) and compete on global classroom & challenge leaderboards.
  - **Deeper Engineering:** Spacecraft reliability degradation modeling and high-fidelity planetary surface animations.
  - Play now: `https://mision.ja-war.com/orbita-2/?lang=en`
- **Screenshot to place:** Campaign menu showing upcoming missions (MAVEN, DART, OSIRIS-REx) or clean 3D Hangar view.
  - Capture URL: `/?lang=en` (or `/?modo=pruebas&lang=en`)
