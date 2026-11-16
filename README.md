# Odisea Galáctica (Galactic Odyssey)

**Design, fly and operate your own space mission.** A free, bilingual (English / Spanish) browser game for the NASA Space Apps Challenge 2026, challenge *Space Mission Design Game*.

- **Play (no install needed):** https://mision.ja-war.com/orbita-2/ — opens in English; use the ES/EN button to switch.
- **Challenge:** https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/
- This project is **not affiliated with or endorsed by NASA**. No NASA logos are used.

## What it is

Students pick a real-inspired science mission (the Moon with **LRO**, or Jupiter with **Juno**), answer its science question by building a spacecraft in a 3D hangar, and then fly it from launch to end of mission. Every choice is a trade-off: launch vehicle capacity vs. mass, budget, power vs. consumption, propellant and delta-v, downlink vs. data, radiation shielding, battery / flight computer / attitude control, development time, and the orbit itself.

The flow follows NASA's systems-engineering process (*Need → Concept → Requirements → Design → Verify → Implement*):

1. **Briefing** with science objectives, budget and difficulty (Novice, Knowledgeable, Expert).
2. **3D hangar** with live budgets, quick simulation and comparison of attempts. Beginner hints grey out incompatible parts.
3. **Design review** where each requirement is checked together with how it is verified.
4. **Eight mission stages** as mini-games: hangar, launch rings, early operations (LEOP), drone network, rendezvous, orbit insertion, science operations (with DSN downlink), extended mission and end-of-mission decision.
5. **Final report** that explains, cause by cause, *why* the mission worked or failed, shows the 4 mission segments (launch, space, ground/DSN, user) and compares the design with the real spacecraft.

Team mode (up to 4 roles: mission director, spacecraft engineering, science, communications and resources) works online through a small WebSocket room server (`servidor/`). A sandbox mode and a local leaderboard are included. Physics and rules live in pure, unit-tested engines (`src/motor/`).

## Run it

> **Do not open `index.html` by double-clicking.** It is the Vite source entry (it loads `src/main.jsx`), and browsers also block
> JavaScript modules on `file://`. To play, use the link above, or run the game locally with a dev/preview server as shown below.

Requires Node.js 20+.

```bash
npm ci
npm run dev      # development server
npm test         # unit tests (Vitest)
npm run build    # production build in dist/ (relative base, can be served from a sub-folder)
```

Then open the address printed by `npm run dev` (usually http://localhost:5173/). To try the production build: `npm run build && npm run preview`.

Optional online team rooms: `node servidor/sala.mjs` (see the header of that file).

URL shortcuts for testing a stage: `?probar=lanzamiento|leop|crucero|encuentro|insercion|operacion|extendida` with `&mision=lro` or `&mision=juno`, and `&lang=en|es`.

## NASA resources and credits

Full inventory with URLs, where each resource is used and its license: [`docs/entrega/RECURSOS_NASA.md`](docs/entrega/RECURSOS_NASA.md). Summary:

- Real mission data of LRO and Juno (NASA Science, JPL press kits, NSSDCA, PDS), Deep Space Network as the ground segment. Values and caveats: [`docs/DATOS_NASA.md`](docs/DATOS_NASA.md), [`docs/DATOS_LRO.md`](docs/DATOS_LRO.md).
- Process references: *Design and Develop Science Missions* (NASA SmallSat Institute), Mission Design Lab (NASA Goddard), *CubeSat 101* (NASA CSLI), Concept Maturity Levels (JPL), *A Learning Game About Telescopes* (NASA Webb).
- NASA 3D Resources models (LRO, Juno, DSN antenna) and NASA photos (LOLA/LRO, JunoCam, Blue Marble).
- Planet textures from Solar System Scope (CC BY 4.0), derived from NASA data.
- Open source: React, Vite, Three.js, React Three Fiber, drei (MIT); Draco (Apache 2.0). Fonts: Inter, JetBrains Mono, Saira Condensed (SIL OFL).

## Use of AI

Part of the code, texts, translations and some artwork were produced with the help of AI assistants (Claude, Codex, Gemini). The game idea, design and decisions are the team's, and changes were reviewed and tested by the team.

## Team

Eduardo, Cris, OIFP and Master6869 (names as they appear in the project history).

## Project history

This game did **not** start from zero at the hackathon. It grows from a previous project of the same team, *Órbita* ("Ventana de Lanzamiento"), a LRO/Juno mission game (hangar, launch, cruise, arrival, operation, report) that was **published on 8 Nov 2026**, before the hackathon days. The first commits in this repository are from **13 Nov 2026** and start from that published state ("Estado de producción de Órbita 2.0 antes del taller 3D"). Commit dates below are the real ones from the original repository's history (which has 236 commits: 9 on 13 Nov, 42 on 14 Nov, 185 on 15 Nov).

**Base before the hackathon (published 8 Nov, plus work on 13 Nov):**
- Original Órbita campaign with LRO and Juno, engines for mass, power, delta-v, data and score, 3D scenes, report.
- 13 Nov: interactive 3D hangar (workshop) with robot assembly, launch in first person with rings and touch controls, first LEOP phase.

**Built during the hackathon (14–15 Nov 2026), from the commit history:**
- 14 Nov: gravity-assist and cruise management (stage 4); ASTRION mother ship and mini-probe 3D models; drone network and the new rendezvous stage 05 (3D drone, terrain, photo grading); NASA-style planet landscapes; stage 06 orbit insertion with mini-probe; stage 07 science operations (mapping, spectrum, transmission); resources and metrics panel.
- 15 Nov, morning: stage 07 in 3D and stage 08 extended mission; delivery plan; **English/Spanish infrastructure and full translation**; **design review with requirements and verification**; **orbit choice and effects**; **difficulty levels** (later 3 levels); **battery, flight computer, attitude control and Time resource**; **sandbox mode**; **team mode with roles and voting**; **quick simulation and attempt comparison**; **"why it turned out this way" report with ground and user segments**; greyed-out incompatible parts with reasons.
- 15 Nov, afternoon and evening: **online team rooms** (WebSocket server), live spectators and rotating pilot per stage; design sharing by link and local leaderboard; directors and IO guide per role and difficulty; **NASA 3D models and real NASA photos** in the report and briefing; probe workshop; redesigned stage 07 (data-downlink block puzzle) and stage 08 (decision cards); economy and progression (rewards, earn money on Earth); full game reset; main menu redesign; English by default.

Exact commit list: `git log` of the original repository (https://github.com/Destswod-01/ORBITA, branch `hoy/r11`). This delivery repository was created from a snapshot of that branch (`sincronizar.sh` re-copies it) and therefore has a new, shorter git history.
