export default {
  'tutorial.jugador': "Pilot",
  'tutorial.preparando': "Preparing flight view…",
  'tutorial.pendientes': "See what’s blocking launch",
  'tutorial.avisos': "Design advisories",
  'tutorial.noMostrar': "Don’t show tips again",
  'tutorial.reactivar': "Show Director & IO mission tips",
  'tutorial.desactivar': "Hide Director & IO mission tips",
  'tutorial.pistaEtiqueta': "Rookie hint",
  'tutorial.siguientePista': "Next hint ›",
  'tutorial.cerrarIO': "Close IO tip",
  'tutorial.abrirIO': "Open IO tip",
  'tutorial.ioNombre': "IO · Assistant",
  'tutorial.saludoEquipo': "{nombre}, {rol}: ",
  'tutorial.tuRolAviso': "Your online role ({rol}): watch your station while {dueno} leads this stage.",

  // Briefing & Hangar
  'tutorial.briefing.io1': "Read the briefing slides with ‹ › or arrow keys and flip all 3 objective cards to see what sensors NASA needs.",
  'tutorial.briefing.io2': "Exact hint: pick Rookie difficulty if you want more frequent guidance and wider tolerances during flight.",
  'tutorial.hangar.titulo': "Build your spacecraft in the hangar",
  'tutorial.hangar.1': "{nombre}, let’s start with the launch vehicle. On real NASA missions, total wet mass can never exceed the rocket’s capacity to the transfer orbit. Pick a launcher with safe margin at Rocket.",
  'tutorial.hangar.2': "At Fuel, select propellant for trajectory corrections and orbit insertion (delta-v). At Shielding, decide how much radiation protection your electronics need.",
  'tutorial.hangar.3': "At Power, choose solar arrays (weaker far from the Sun) or an RTG (steady power like Juno/Voyager). In Systems, configure battery, flight computer, and attitude control.",
  'tutorial.hangar.4': "At Science, install sensors for your mission objectives; your Antenna downlinks data through NASA’s Deep Space Network (DSN). If the antenna is undersized, data will be lost.",
  'tutorial.hangar.5': "At Orbit, balance science coverage against propellant cost, and in Style customize your spacecraft name, colors, and mission patch before flight.",
  'tutorial.hangar.6': "Before heading to the pad, check what’s blocking launch: mass, budget, development schedule, power, delta-v, and NASA mission requirements.",
  'tutorial.hangar.pista': "Install Rocket, Fuel, Power, Antenna, Shielding, and Science first. Use Quick simulation in the bottom-left corner to check your estimated score before launch.",
  'tutorial.hangar.respuesta': "Copy, Director. I’ll check the rocket’s capacity, install the components, and clear the launch blockers before heading to the pad.",
  'tutorial.hangar.accion': "Enter the hangar",

  // Design review
  'tutorial.revision.titulo': "Design Review (CDR)",
  'tutorial.revision.1': "{nombre}, before authorizing a real launch, NASA verifies every engineering requirement by test or analysis. If anything fails here, you can return to the hangar at zero penalty.",
  'tutorial.revision.pista': "Verify mass, power, delta-v, and antenna downlink are green; if science or data fails, return to the hangar to adjust instruments or antenna size.",
  'tutorial.revision.io1': "Check how many requirements show ✓ before authorizing liftoff.",

  // 02 Launch & separation
  'tutorial.lanzamiento.titulo': "Launch into space",
  'tutorial.lanzamiento.1': "{nombre}, during real ascent the launcher flies a narrow guidance corridor to beat gravity and atmospheric pressure (Max-Q) without wasting propellant. Clear at least {minimo} of {total} rings.",
  'tutorial.lanzamiento.2': "Follow the countdown and steer the rocket with WASD, the arrow keys or the on-screen controls. Q/E (or the thrust control) lower and raise thrust: cut it to 65% at Max-Q. SPACE separates the stages when the alert lights up, and C changes the camera. P or Esc pauses.",
  'tutorial.lanzamiento.pista': "Exact hint: short taps of WASD/arrows, thrust at 65% while the Max-Q alert lasts, separate each stage as soon as the prompt appears, and remember you need {minimo} of {total} rings.",
  'tutorial.lanzamiento.respuesta': "Copy, Director. I’ll keep the reticle centered and tell the team when we complete the ascent.",
  'tutorial.lanzamiento.accion': "Start launch",
  'tutorial.lanzamiento.ventana': "What is a launch window?",
  'tutorial.lanzamiento.ventanaTexto': "It’s the period when the destination’s position favors the trajectory. The window is already set in this exercise, so you can practice guidance with virtual rings and compressed time.",
  'tutorial.lanzamiento.io1': "Center the reticle inside each ring and release controls once aligned.",
  'tutorial.lanzamiento.io2': "If you miss a ring, line up the next one: each miss costs 12 m/s of delta-v after passing.",

  'tutorial.separacion.titulo': "Probe separation",
  'tutorial.separacion.1': "{nombre}, we are in orbit. In real flight, pyrotechnic bolts and springs release the probe, then panels, antenna and thrusters deploy. Run the five steps one by one.",
  'tutorial.separacion.pista': "Press each step's button (or SPACE) and wait for it to reach 100% before the next one.",
  'tutorial.separacion.respuesta': "Copy, Director. I will run the deployment sequence step by step.",
  'tutorial.separacion.accion': "Start deployment",

  // 03 LEOP
  'tutorial.leop.titulo': "Probe commissioning (LEOP)",
  'tutorial.leop.1': "{nombre}, right after separation the spacecraft enters LEOP: it deploys arrays and antennas and locks its star tracker to orient itself and talk to Earth.",
  'tutorial.leop.pista': "If automatic commissioning trips, memorize the exact order of the 3 indicator lights and repeat it using keys 1, 2, and 3 (or the buttons).",
  'tutorial.leop.respuesta': "Copy, Director. I’ll monitor the sequence and recover the link if needed.",
  'tutorial.leop.accion': "Prepare for commissioning",
  'tutorial.leop.io1': "Watch the 3-light sequence closely if any subsystem needs manual recovery.",
  'tutorial.leop.io2': "Press keys 1, 2, and 3 quickly to restore the Earth link.",

  // 04 Drone network
  'tutorial.crucero.titulo': "Drone deployment",
  'tutorial.crucero.1': "{nombre}, like secondary CubeSats or multi-point relays, each drone needs an exact release angle and impulse to enter orbit without colliding.",
  'tutorial.crucero.pista': "Wait until the impulse meter enters the green band, aim at an open green ring, and press Space to release the drone.",
  'tutorial.crucero.respuesta': "Copy, Director. I’ll check the bay and the trajectory before each launch.",
  'tutorial.crucero.accion': "Open the drone bay",
  'tutorial.crucero.io1': "Release with Space as soon as the impulse indicator enters green.",
  'tutorial.crucero.io2': "Steer clear of drones already in orbit while aiming for empty rings.",

  // Approach
  'tutorial.llegada.titulo': "Orbital approach",
  'tutorial.llegada.1': "{nombre}, NASA performs an orbit insertion burn near closest approach (periapsis) so the destination’s gravity captures the spacecraft.",
  'tutorial.llegada.pista': "Hold Space near closest approach and release the instant the orange orbit reaches the green capture ring.",
  'tutorial.llegada.respuesta': "Copy, Director. I’ll watch the projected orbit while braking.",
  'tutorial.llegada.accion': "Prepare for approach",
  'tutorial.llegada.io1': "Hold Space at periapsis until the orange orbit sits in the green ring.",
  'tutorial.llegada.io2': "Over- or under-burning wastes scarce propellant.",

  // 05 Encounter
  'tutorial.encuentro.titulo': "Close-range reconnaissance",
  'tutorial.encuentro.1': "{nombre}, just like Dawn or OSIRIS-REx flybys, you must close the range safely and frame the target before firing the science camera.",
  'tutorial.encuentro.pista': "Use the minimap to reach the requested target, frame it in the viewfinder, and press Space (or Photo) when the indicator turns green.",
  'tutorial.encuentro.respuesta': "Copy, Director. I’ll locate and frame the target before taking the shot.",
  'tutorial.encuentro.accion': "Prepare for reconnaissance",
  'tutorial.encuentro.io1': "Follow the minimap to the target and trigger the camera with Space.",
  'tutorial.encuentro.io2': "Complete all photo requests safely to build score combos.",

  // 06 Insertion / Minisat
  'tutorial.insercion.titulo': "Insertion and minisat observation",
  'tutorial.insercion.1': "{nombre}, in low orbit the minisat dodges rocky debris and catches brief observation windows to record valid scientific frames.",
  'tutorial.insercion.pista': "Dodge sideways with A/D or arrows while tracking the object, then press Space (once per object) as soon as the green capture ring opens.",
  'tutorial.insercion.respuesta': "Copy, Director. I’ll track the target and capture it as soon as the green ring appears.",
  'tutorial.insercion.accion': "Prepare the minisat",
  'tutorial.insercion.io1': "Dodge with A/D or arrows; tap Space once when the green ring appears.",
  'tutorial.insercion.io2': "Don’t hold Space down: each scientific photo requires a fresh press.",

  // 07 Data downlink (Block Blast DSN)
  'tutorial.operacion.titulo': "Data downlink",
  'tutorial.operacion.1': "{nombre}, your instruments fill the onboard memory, and you can only drain it when NASA’s Deep Space Network (Goldstone, Madrid, Canberra) receives complete lines.",
  'tutorial.operacion.pista': "It’s Tetris: fit the pieces on the 10×20 board and every complete line downlinks to Earth. In a team, each piece is handled by a different player, in turns. If a new piece doesn’t fit, the memory overflows.",
  'tutorial.operacion.respuesta': "Copy, Director. I’ll fit the packets and clear lines before the memory fills up.",
  'tutorial.operacion.accion': "Start data downlink",
  'tutorial.operacion.io1': "Move with ← →, rotate with ↑ or X, soft drop with ↓ and hard drop with Space. On a phone, use the buttons below.",
  'tutorial.operacion.io2': "Clearing several lines at once multiplies the downlink. Check the box beside the board: it shows the next piece and whose turn it is.",

  // Classic operation
  'tutorial.operacion_clasica.titulo': "Science passes",
  'tutorial.operacion_clasica.1': "{nombre}, during fast orbital passes sensors collect science that must be downlinked during Earth visibility windows.",
  'tutorial.operacion_clasica.pista': "Press the matching sensor number when a target crosses the reticle and transmit during green segments before storage fills.",
  'tutorial.operacion_clasica.respuesta': "Copy, Director. I’ll watch for targets and keep room for their data.",
  'tutorial.operacion_clasica.accion': "Prepare science passes",
  'tutorial.operacion_clasica.io1': "Trigger the matching sensor over each target and downlink on green segments.",
  'tutorial.operacion_clasica.io2': "Watch buffer capacity so new observations aren’t dropped.",

  // 08 Mission decisions (Reigns)
  'tutorial.extendida.titulo': "Mission decisions",
  'tutorial.extendida.1': "{nombre}, during extended operations each year brings a real mission card (eclipse, solar storm, micrometeoroid, or budget review) leading up to end-of-life spacecraft disposal.",
  'tutorial.extendida.pista': "Swipe the card left or right (or press ← →): indicator dots above Energy, Thermal, Fuel, and Science preview which meters each choice will move.",
  'tutorial.extendida.respuesta': "Copy, Director. I’ll weigh each decision against the probe’s remaining margins.",
  'tutorial.extendida.accion': "Open decision deck",
  'tutorial.extendida.io1': "Balance Energy, Thermal, Fuel, and Science so no critical bar drops to 0%.",
  'tutorial.extendida.io2': "At end-of-life, pick safe disposal (e.g., plunging Juno into Jupiter to protect Europa).",

  // Final report
  'tutorial.informe.titulo': "Mission debrief",
  'tutorial.informe.exito': "{nombre}, mission evaluated: review NASA’s 4 segments below (launch, spacecraft, DSN ground, and science users) and compare your build against the real probe.",
  'tutorial.informe.perdida': "{nombre}, the mission was lost before completion: check which resource failed first in the cause-and-effect log so you can fix it in the hangar.",
  'tutorial.informe.pista': "Compare your mass, power, and antenna downlink with the real spacecraft to earn Gold or JPL Level on your next run.",
  'tutorial.informe.io1': "Check “Why did it turn out this way?” and “Compare attempts” before returning to the hangar.",
  'tutorial.informe.io2': "If downlink dropped below 100%, upgrade your antenna or trim instruments in the hangar.",
};
