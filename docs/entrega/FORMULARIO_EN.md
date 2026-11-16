# Project submission form (English) · NASA Space Apps 2026

> Text to paste field by field into the team's **Project** tab on spaceappschallenge.org.
> Updated 15 Nov 2026 with version 2026.11.15-23 + the new main menu.
> Before pasting, put the real team name and members where it says `[…]`.

---

## Project Name

Odisea Galáctica (Galactic Odyssey): Design, Fly and Operate Your Own Space Mission

## High-Level Project Summary

Odisea Galáctica is a free browser game (desktop and mobile, in English and Spanish) where students design a real-inspired science mission and then live it from concept to end of mission.

Players pick a mission: the Moon with LRO or Jupiter with Juno. They answer its science question by building a spacecraft in a 3D hangar. Every choice is a trade-off:
- launch vehicle capacity vs. spacecraft mass;
- budget;
- power generated vs. consumed;
- propellant and delta-v;
- antenna downlink vs. instrument data;
- radiation shielding;
- battery, flight computer and attitude control;
- development time vs. deadline;
- and the orbit itself, which changes coverage, communications, fuel, lifetime and radiation.

Before launch, a NASA-style **design review** checks every requirement and how it is verified. Then the mission is flown through seven mini-game stages: launch, early operations, drone network, rendezvous, orbit insertion, science operations, and extended mission with an end-of-mission decision.

The final report explains **why** the mission succeeded or failed, line by line, cause → effect. It shows the four segments of a NASA mission (launch, space, ground with the Deep Space Network, and user). It also compares the player's design with what NASA really did.

Teams of up to 4 players share one device, each with a role:
- mission director;
- spacecraft engineering;
- science;
- communications & resources.

They negotiate conflicts and vote on the design before launch, and they get a coordination bonus. Three difficulty levels (Novice, Knowledgeable and Expert), a sandbox mode, a quick simulation and an attempt comparison let players redesign and try again, which is how real mission teams learn.

## Link to Project Demo

[link to the 30-second video with English subtitles, or to the ≤7-slide deck — public, no login]

## Link to Final Project

https://mision.ja-war.com/orbita-2/?lang=en

(Source code: https://github.com/Destswod-01/ORBITA)

## Detailed Project Description

**What it does**

Odisea Galáctica turns the systems-engineering process NASA uses for science missions into a game. It follows the process from the NASA resource *Design and Develop Science Missions*: Need & goals → Concept → Requirements → Design → Build & verify → Implement.

1. **Need & goals (briefing).** A flight director presents the mission's science question, its weighted objectives and its budget. The player chooses a difficulty, inspired by the study levels of NASA Goddard's Mission Design Lab:
   - *Concept Development* (Beginner): more margin, plus hints that grey out parts that don't fit and recommend the best ones, like NASA's telescope-building game.
   - *Trade Study* (Intermediate): the real mission numbers.
2. **Design (3D hangar).** The player picks:
   - launch vehicle, propellant tank, power source (solar or RTG), antenna, shielding and instruments;
   - battery, flight computer and attitude control, each in a simple or advanced version;
   - one of three orbits per mission, all based on real options (for example LRO's 50 km circular vs. 30×180 km elliptical orbit, or Juno's 53-day vs. 14-day orbit).

   Live budgets show mass vs. rocket capacity, cost, power, delta-v, data vs. downlink, and development months vs. deadline. A quick simulation estimates the outcome in seconds, without playing.
3. **Verify (design review).** Each requirement is listed together with how it is verified, as in a real review. Examples: mass ≤ capacity, checked with the mass budget; data ≤ downlink, checked with the link budget. In team mode, each role first evaluates the design from its own area and the team votes.
4. **Implement (the mission).** Seven stages turn each phase into a short mini-game:
   - launch through rings;
   - deployment and link (LEOP);
   - a drone observation network;
   - rendezvous with photographic tasks;
   - orbit insertion with a mini-probe;
   - science operations (mapping, spectrum and downlink);
   - an extended mission where the player keeps the probe alive with power, heaters, pointing and orbit corrections, and decision cards based on real events.

   It ends with the end-of-mission choice, for example Juno's deorbit into Jupiter to protect Europa (planetary protection).
5. **Report.** The report shows:
   - the score (science, budget, health, execution, NASA-like decisions);
   - a cause → effect analysis of every resource;
   - the 4 mission segments;
   - a part-by-part comparison with the real spacecraft;
   - a table to compare attempts.

**How it works.** All the physics and rules live in pure, unit-tested engines (509 automated tests): rocket equation for delta-v, solar power falling with distance, RTG decay, link capacity, radiation dose and orbit effects. The real NASA designs of LRO and Juno must remain viable, and every trap must fail for its real reason.

**Benefits.** Students experience the whole mission as one connected system instead of isolated topics: every decision has a consequence elsewhere, and there is rarely a single right answer. Because the report explains *why*, failing is a way to learn. The game runs in any browser, on phones too, and works in two languages.

**Tools.** React 19, Vite, Three.js / React Three Fiber (3D), Vitest. Hosted as a static site.

## Use of Super Intelligence (SI)

We used AI assistants (Claude, Codex and Gemini) to help write and debug code, to translate the interface into English, and to draft texts. The game idea, the game design, the mission choices and the final decisions are the team's own, and every change was reviewed and tested by the team. No AI-generated image uses NASA branding, and the game credits its AI use in its «Info» screen.

## NASA Data

- **Real mission data of LRO and Juno**, from NASA Science mission pages and JPL press kits:
  - masses, instruments, launch vehicles (Atlas V 401 and 551);
  - power, orbits, propellant, costs;
  - extended-mission and end-of-mission decisions.
- **Design and Develop Science Missions** (NASA Small Spacecraft Systems Virtual Institute, 2025): the four mission segments and the design process used in the design review and the report.
- **NASA Goddard Mission Design Lab:** study levels used for the difficulty levels, and the subsystem disciplines used for the hangar.
- **CubeSat 101** (NASA CubeSat Launch Initiative): phase durations used for the development-time resource.
- **Concept Maturity Levels** (NASA JPL).
- **A Learning Game About Telescopes** (NASA Webb): design reference for compatibility hints and the comparison with real missions.
- **NASA Deep Space Network** (Goldstone, Madrid and Canberra) as the ground segment.

## Space Agency Partner Data and Other References

- **Full NASA resource inventory** (mission data, 3D models, photos, textures, with URLs and license): `docs/entrega/RECURSOS_NASA.md` in the repository.
- NASA 3D Resources models of LRO, Juno and a Deep Space Network antenna (public domain / NASA media guidelines), shown in the final report.
- Real NASA photos: LOLA/LRO Moon topography and south pole (NASA/GSFC/ASU), JunoCam images of Jupiter (NASA/JPL-Caltech/SwRI/MSSS), Blue Marble (NASA).
- Planet textures: Solar System Scope 2K maps (CC BY 4.0), derived from NASA data; Moon (LOLA) and Mars (MOLA) relief maps from NASA.
- Libraries: React, Vite, Three.js, React Three Fiber, drei (MIT); Draco decoder (Apache 2.0). Fonts: Inter, JetBrains Mono, Saira Condensed (SIL OFL).
- Our sources, with values and links, are listed in `docs/DATOS_NASA.md` and `docs/DATOS_LRO.md`. Values we could not verify are marked as such.
- Limits: the physics are simplified educational models, not flight-grade. The leaderboard is local to the device. No NASA logos are used; the game is not affiliated with or endorsed by NASA.
