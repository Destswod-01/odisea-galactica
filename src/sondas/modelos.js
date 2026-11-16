import * as T from 'three';

// Metros, eje Y vertical. Cada fábrica entrega geometría independiente y pivotes nombrados.
export function crearSonda(tipo = 'M1') {
  if (!['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'].includes(tipo)) throw new Error(`Sonda desconocida: ${tipo}`);
  const root = new T.Group(); root.name = `ASTRION-${tipo}`;
  const pivotes = [];
  const mat = (color, metalness = .65, roughness = .38) => new T.MeshStandardMaterial({ color, metalness, roughness });
  const plata = mat('#b7c4d0'), oscuro = mat('#182431'), oro = mat('#bb8740'), azul = mat('#12396f', .5, .22);
  const luz = new T.MeshStandardMaterial({ color: '#75e3ff', emissive: '#27baff', emissiveIntensity: 2 });
  const tela = mat('#e0caaa', .05, .8); tela.side = T.DoubleSide;
  const naranja = mat('#ce7935', .05, .8); naranja.side = T.DoubleSide;
  function mesh(parent, name, geometry, material, p = [0, 0, 0]) {
    const m = new T.Mesh(geometry, material); m.name = name; m.position.set(...p); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (p, n, s, m, pos) => mesh(p, n, new T.BoxGeometry(...s), m, pos);
  const cyl = (p, n, r, h, m, pos, r2 = r, segments = 16) => mesh(p, n, new T.CylinderGeometry(r, r2, h, segments), m, pos);
  function bar(parent, name, a, b, radius, material) {
    const v = new T.Vector3(...a), w = new T.Vector3(...b), d = w.clone().sub(v);
    const m = cyl(parent, name, radius, d.length(), material, v.add(w).multiplyScalar(.5).toArray(), radius, 8);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
  }
  function panel(parent, name, w, h, pos) {
    const g = new T.Group(); g.name = name; g.position.set(...pos); parent.add(g);
    box(g, 'marco_titanio', [w, .025, h], oro);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 6; z++) {
      box(g, `celda_${x}_${z}`, [w / 4 - .009, .008, h / 6 - .009], azul, [-w / 2 + (x + .5) * w / 4, .018, -h / 2 + (z + .5) * h / 6]);
    }
    return g;
  }
  if (tipo === 'M1') {
    box(root, 'bus_orbital', [.42, .5, .42], oscuro);
    for (const x of [-.22, .22]) for (const z of [-.22, .22]) {
      box(root, 'larguero', [.025, .54, .025], oro, [x, 0, z]);
      for (const y of [-.26, .26]) mesh(root, 'tornillo', new T.SphereGeometry(.018, 8, 6), plata, [x, y, z]);
    }
    for (const y of [-.24, .24]) box(root, 'placa_terminal', [.44, .025, .44], plata, [0, y, 0]);
    const frente = panel(root, 'panel_frontal', .36, .44, [0, 0, .224]); frente.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const pivot = new T.Group(); pivot.name = `bisagra_panel_${side}`; pivot.position.set(side * .23, .21, 0); root.add(pivot);
      panel(pivot, 'ala_solar', .48, .56, [side * .25, 0, 0]);
      pivotes.push({ pivot, axis: 'z', closed: -side * Math.PI / 2, open: side * .08 });
    }
    bar(root, 'mastil_antena', [.12, .26, -.12], [.12, .73, -.12], .009, plata);
    mesh(root, 'baliza', new T.SphereGeometry(.022, 12, 8), luz, [.12, .74, -.12]);
    const sensor = cyl(root, 'sensor_campo', .065, .06, oro, [0, -.11, -.24]); sensor.rotation.x = Math.PI / 2;
    for (const x of [-.16, .16]) bar(root, 'antena_dipolo', [x, -.2, 0], [x * 2.4, -.55, 0], .004, plata);
  } else if (tipo === 'M2') {
    cyl(root, 'chasis_octogonal', .34, .19, oscuro, [0, 0, 0], .34, 8);
    cyl(root, 'cubierta_superior', .35, .035, plata, [0, .11, 0], .35, 8);
    cyl(root, 'anillo_inferior', .35, .025, oro, [0, -.1, 0], .35, 8);
    cyl(root, 'modulo_central', .18, .1, oro, [0, .17, 0]);
    for (let i = 0; i < 4; i++) {
      const giro = new T.Group(); giro.rotation.y = Math.PI / 4 + i * Math.PI / 2; root.add(giro);
      const pivot = new T.Group(); pivot.name = `bisagra_pata_${i}`; pivot.position.x = .28; giro.add(pivot);
      cyl(pivot, 'rotula', .055, .09, oro);
      bar(pivot, 'brazo_titanio', [0, 0, 0], [.14, -.14, 0], .034, plata);
      bar(pivot, 'amortiguador', [.14, -.14, 0], [.25, -.39, 0], .022, oscuro);
      bar(pivot, 'piston', [.17, -.21, 0], [.25, -.39, 0], .011, luz);
      cyl(pivot, 'pie_aterrizaje', .087, .028, plata, [.26, -.41, 0]);
      pivotes.push({ pivot, axis: 'z', closed: 1.8, open: 0 });
    }
    bar(root, 'mastil_camara', [0, .2, 0], [0, .64, 0], .021, plata);
    box(root, 'cabezal_optico', [.16, .115, .12], oscuro, [0, .65, 0]);
    const ojo = cyl(root, 'lente_camara', .039, .018, luz, [0, .65, .07]); ojo.rotation.x = Math.PI / 2;
    box(root, 'espectrometro', [.12, .09, .07], oro, [0, -.015, .34]);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box(root, 'radiador', [.06, .025, .09], oscuro, [.25 * Math.cos(a), .14, .25 * Math.sin(a)]);
    }
  } else if (tipo === 'M4') {
    mesh(root, 'nucleo_saltador', new T.SphereGeometry(.24, 24, 16), oscuro);
    cyl(root, 'banda_instrumental', .246, .1, oro);
    for (let i = 0; i < 3; i++) {
      const aro = mesh(root, `jaula_protectora_${i}`, new T.TorusGeometry(.34, .014, 8, 48), plata);
      aro.rotation.y = i * Math.PI / 3;
      const giro = new T.Group(); giro.name = `soporte_radial_${i}`; giro.rotation.y = i * Math.PI * 2 / 3; root.add(giro);
      const pivot = new T.Group(); pivot.name = `bisagra_salto_${i}`; pivot.position.set(.25, -.1, 0); giro.add(pivot);
      bar(pivot, 'brazo_resorte', [0, 0, 0], [.21, -.24, 0], .022, plata);
      bar(pivot, 'actuador_salto', [.03, -.01, .04], [.18, -.19, .04], .014, oro);
      cyl(pivot, 'apoyo_antirrebote', .065, .035, oscuro, [.21, -.26, 0]);
      pivotes.push({ pivot, axis: 'z', closed: -1.65, open: 0 });
      const nozzle = cyl(giro, 'micropropulsor', .035, .09, oscuro, [.26, .07, 0], .058);
      nozzle.rotation.z = Math.PI / 2;
      cyl(giro, 'deposito_propulsor', .045, .12, plata, [.13, .25, 0]);
    }
    const ojo = cyl(root, 'camara_navegacion', .055, .04, luz, [0, .03, .245]); ojo.rotation.x = Math.PI / 2;
    cyl(root, 'sensor_superior', .07, .045, azul, [0, .255, 0]);
    bar(root, 'antena_flexible', [0, .27, 0], [.06, .49, 0], .005, plata);
  } else if (tipo === 'M5') {
    box(root, 'chasis_rover', [.44, .16, .66], oscuro);
    box(root, 'cubierta_blindada', [.46, .025, .64], plata, [0, .095, 0]);
    box(root, 'bateria_inferior', [.32, .08, .4], oro, [0, -.105, -.04]);
    for (const z of [-.34, .34]) bar(root, 'parachoques', [-.24, -.02, z], [.24, -.02, z], .022, plata);
    const goma = mat('#10151c', .05, .86);
    for (const side of [-1, 1]) {
      const tren = new T.Group(); tren.name = `tren_lateral_${side}`; root.add(tren);
      pivotes.push({ pivot: tren, position: true, axis: 'x', closed: side * .285, open: side * .38 });
      bar(tren, 'larguero_suspension', [0, -.06, -.25], [0, -.06, .25], .022, oro);
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * .27;
        bar(tren, 'guia_telescopica', [-side * .18, -.06, z], [0, -.06, z], .012, plata);
        bar(tren, 'brazo_suspension', [0, -.06, z - .035], [0, -.17, z], .018, plata);
        const rueda = new T.Group(); rueda.name = `rueda_${side}_${i}`; rueda.position.set(0, -.17, z); tren.add(rueda);
        cyl(rueda, 'neumatico', .115, .085, goma, [0, 0, 0], .115, 24).rotation.z = Math.PI / 2;
        cyl(rueda, 'buje_motor', .062, .095, plata).rotation.z = Math.PI / 2;
        cyl(rueda, 'tapa_buje', .028, .1, oro).rotation.z = Math.PI / 2;
        for (let j = 0; j < 16; j++) {
          const a = j * Math.PI / 8;
          const taco = box(rueda, 'taco_traccion', [.09, .013, .025], goma, [0, .116 * Math.cos(a), .116 * Math.sin(a)]);
          taco.rotation.x = a;
        }
      }
      const foco = new T.Group(); foco.name = `foco_orientable_${side}`; foco.position.set(side * .16, .12, .29); root.add(foco);
      box(foco, 'carcasa_foco', [.105, .07, .075], oscuro);
      box(foco, 'lente_foco', [.08, .045, .008], luz, [0, 0, .042]);
      pivotes.push({ pivot: foco, axis: 'y', closed: 0, open: side * .28 });
    }
    const mastil = new T.Group(); mastil.name = 'bisagra_mastil_m5'; mastil.position.set(0, .13, -.04); root.add(mastil);
    cyl(mastil, 'articulacion_mastil', .04, .08, oro).rotation.z = Math.PI / 2;
    bar(mastil, 'mastil_vision', [0, 0, 0], [0, .3, 0], .018, plata);
    box(mastil, 'cabezal_estereo', [.19, .09, .09], oscuro, [0, .32, 0]);
    for (const x of [-.055, .055]) {
      cyl(mastil, 'camara_estereo', .026, .018, azul, [x, .32, .052]).rotation.x = Math.PI / 2;
      mesh(mastil, 'aro_optico', new T.TorusGeometry(.028, .004, 6, 16), oro, [x, .32, .062]);
    }
    cyl(mastil, 'sensor_lidar', .052, .045, luz, [0, .395, 0]);
    pivotes.push({ pivot: mastil, axis: 'x', closed: -Math.PI / 2, open: 0 });
    for (let i = 0; i < 5; i++) box(root, 'aleta_radiador', [.17, .018, .012], oscuro, [0, .12, .12 + i * .03]);
    bar(root, 'antena_rover', [.17, .11, -.27], [.17, .3, -.3], .005, plata);
  } else if (tipo === 'M6') {
    cyl(root, 'torre_perforadora', .2, .46, oscuro, [0, .12, 0], .23, 12);
    for (const y of [-.1, .34]) cyl(root, 'collar_estructural', .24, .045, oro, [0, y, 0], .24, 12);
    for (let i = 0; i < 3; i++) {
      const giro = new T.Group(); giro.rotation.y = i * Math.PI * 2 / 3; root.add(giro);
      box(giro, 'blindaje_vertical', [.045, .32, .15], plata, [.21, .12, 0]);
      const pivot = new T.Group(); pivot.name = `bisagra_anclaje_${i}`; pivot.position.set(.22, .05, 0); giro.add(pivot);
      bar(pivot, 'pata_anclaje', [0, 0, 0], [.28, -.47, 0], .027, plata);
      bar(pivot, 'cilindro_hidraulico', [0, -.07, .045], [.22, -.34, .045], .019, oro);
      cyl(pivot, 'zapata_anclaje', .09, .035, oscuro, [.28, -.48, 0]);
      cyl(pivot, 'garra_anclaje', .025, .095, plata, [.28, -.54, 0], 0);
      pivotes.push({ pivot, axis: 'z', closed: -.7, open: 0 });
    }
    const taladro = new T.Group(); taladro.name = 'carro_taladro'; root.add(taladro);
    cyl(taladro, 'eje_broca', .035, .34, plata, [0, -.17, 0]);
    const espiral = Array.from({ length: 145 }, (_, i) => {
      const a = i / 144 * Math.PI * 12;
      return new T.Vector3(.065 * Math.cos(a), -.025 - i / 144 * .3, .065 * Math.sin(a));
    });
    mesh(taladro, 'helice_corte', new T.TubeGeometry(new T.CatmullRomCurve3(espiral), 144, .012, 6, false), oro);
    cyl(taladro, 'punta_broca', .045, .09, plata, [0, -.38, 0], 0);
    pivotes.push({ pivot: taladro, position: true, axis: 'y', closed: .19, open: -.18 });
    cyl(root, 'motor_taladro', .12, .12, plata, [0, .42, 0]);
    box(root, 'deposito_muestras', [.17, .19, .14], oro, [0, .08, .28]);
    box(root, 'ventana_muestras', [.1, .08, .015], azul, [0, .1, .36]);
    const ojo = cyl(root, 'camara_muestreo', .035, .025, luz, [0, .28, .225]); ojo.rotation.x = Math.PI / 2;
  } else if (tipo === 'M7') {
    cyl(root, 'nucleo_hexagonal', .25, .36, oscuro, [0, 0, 0], .25, 6);
    for (const y of [-.19, .19]) cyl(root, 'tapa_hexagonal', .27, .035, oro, [0, y, 0], .27, 6);
    for (const side of [-1, 1]) {
      const pivot = new T.Group(); pivot.name = `bisagra_rele_${side}`; pivot.position.set(side * .25, -.13, 0); root.add(pivot);
      bar(pivot, 'brazo_panel', [0, 0, 0], [side * .16, 0, 0], .016, plata);
      panel(pivot, 'ala_rele', .61, .4, [side * .45, 0, 0]);
      pivotes.push({ pivot, axis: 'z', closed: side * Math.PI / 2, open: 0 });
    }
    bar(root, 'mastil_rele', [0, .2, 0], [0, .46, 0], .026, plata);
    const antena = new T.Group(); antena.name = 'antena_parabolica'; antena.position.y = .46; antena.rotation.x = .3; root.add(antena);
    cyl(antena, 'buje_reflector', .075, .05, oro);
    // Doce pétalos parabólicos con bisagras individuales en el borde del buje.
    for (let i = 0; i < 12; i++) {
      const sector = new T.Group(); sector.rotation.y = i * Math.PI / 6; antena.add(sector);
      const pivot = new T.Group(); pivot.name = `petalo_reflector_${i}`; pivot.position.x = .07; sector.add(pivot);
      const vertices = [], indices = [];
      for (let r = 0; r <= 8; r++) for (let a = 0; a <= 4; a++) {
        const radius = .07 + r / 8 * .37, theta = (a / 4 - .5) * (Math.PI / 6 - .015);
        vertices.push(radius * Math.cos(theta) - .07, (radius * radius - .07 * .07) * .85, radius * Math.sin(theta));
      }
      for (let r = 0; r < 8; r++) for (let a = 0; a < 4; a++) { const j = r * 5 + a; indices.push(j, j + 1, j + 5, j + 1, j + 6, j + 5); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
      const reflector = plata.clone(); reflector.side = T.DoubleSide;
      mesh(pivot, 'superficie_reflectora', geo, reflector);
      const costilla = Array.from({ length: 9 }, (_, j) => { const r = .07 + j / 8 * .37; return new T.Vector3(r - .07, (r * r - .0049) * .85, 0); });
      mesh(pivot, 'costilla_reflector', new T.TubeGeometry(new T.CatmullRomCurve3(costilla), 8, .005, 4, false), oro);
      pivotes.push({ pivot, axis: 'z', closed: 1.35, open: 0 });
    }
    bar(antena, 'soporte_receptor', [0, 0, 0], [0, .33, 0], .011, oscuro);
    mesh(antena, 'receptor_radio', new T.SphereGeometry(.035, 12, 8), luz, [0, .33, 0]);
    box(root, 'procesador_enlace', [.15, .12, .06], plata, [0, 0, .23]);
  } else if (tipo === 'M8') {
    const estacion = new T.Group(); estacion.name = 'estacion_superficie_m8'; root.add(estacion);
    mesh(estacion, 'anillo_guia', new T.TorusGeometry(.18, .025, 8, 40), oro, [0, .32, 0]).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const giro = new T.Group(); giro.rotation.y = Math.PI / 6 + i * Math.PI * 2 / 3; estacion.add(giro);
      const pata = new T.Group(); pata.name = `bisagra_hielo_${i}`; pata.position.set(.18, .32, 0); giro.add(pata);
      bar(pata, 'soporte_estacion', [0, 0, 0], [.23, -.27, 0], .018, plata);
      cyl(pata, 'zapata_hielo', .075, .025, oscuro, [.23, -.285, 0]);
      cyl(pata, 'anclaje_hielo', .015, .06, oro, [.23, -.32, 0], 0);
      pivotes.push({ pivot: pata, axis: 'z', closed: -.65, open: 0 });
    }
    box(estacion, 'unidad_energia', [.19, .15, .25], oscuro, [.3, .37, 0]);
    box(estacion, 'tapa_energia', [.2, .025, .26], plata, [.3, .46, 0]);
    bar(estacion, 'soporte_energia', [.16, .32, 0], [.3, .32, 0], .018, plata);
    for (let i = 0; i < 5; i++) box(estacion, 'radiador_energia', [.015, .1, .2], oro, [.23 + i * .035, .39, 0]);
    bar(estacion, 'antena_enlace', [.34, .48, -.08], [.34, .78, -.08], .006, plata);
    mesh(estacion, 'baliza_enlace', new T.SphereGeometry(.018, 12, 8), luz, [.34, .79, -.08]);
    for (const z of [-.13, .13]) bar(estacion, 'soporte_carrete', [-.15, .32, z], [-.3, .5, z], .018, plata);
    const carrete = new T.Group(); carrete.name = 'carrete_m8'; carrete.position.set(-.3, .5, 0); estacion.add(carrete);
    cyl(carrete, 'bobina_cable', .115, .2, oscuro).rotation.x = Math.PI / 2;
    for (const z of [-.11, .11]) cyl(carrete, 'disco_carrete', .14, .02, oro, [0, 0, z]).rotation.x = Math.PI / 2;
    for (let i = 0; i < 9; i++) mesh(carrete, 'vuelta_cable', new T.TorusGeometry(.118, .004, 4, 32), plata, [0, 0, -.09 + i * .0225]);
    box(carrete, 'marca_giro', [.08, .012, .012], plata, [.07, 0, .125]);
    pivotes.push({ pivot: carrete, axis: 'z', closed: 0, open: -Math.PI * 2 });
    bar(estacion, 'brazo_polea', [-.17, .32, 0], [0, .62, 0], .012, plata);
    mesh(estacion, 'polea_guia', new T.TorusGeometry(.027, .007, 6, 20), oro, [0, .62, 0]);
    bar(estacion, 'cable_alimentacion', [-.3, .62, 0], [0, .62, 0], .004, oscuro);
    const capsula = new T.Group(); capsula.name = 'capsula_termica_m8'; root.add(capsula);
    cyl(capsula, 'cuerpo_criosonda', .095, .4, plata);
    for (const y of [-.18, .18]) cyl(capsula, 'collar_aislante', .102, .035, oscuro, [0, y, 0]);
    cyl(capsula, 'conector_umbilical', .03, .08, oro, [0, .2, 0]);
    cyl(capsula, 'punta_termica', .095, .14, oro, [0, -.27, 0], 0, 24);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      bar(capsula, 'nervadura_capsula', [.098 * Math.cos(a), -.14, .098 * Math.sin(a)], [.098 * Math.cos(a), .14, .098 * Math.sin(a)], .006, oro);
    }
    box(capsula, 'ventana_instrumental', [.035, .09, .012], azul, [0, 0, .096]);
    mesh(capsula, 'indicador_temperatura', new T.SphereGeometry(.012, 8, 6), luz, [0, .1, .098]);
    pivotes.push({ pivot: capsula, position: true, axis: 'y', closed: .05, open: -.5 });
    const cable = cyl(root, 'cable_descenso_m8', .004, 1, oscuro);
    // Conserva la unión entre la guía fija y el conector móvil de la cápsula.
    pivotes.push({ actualizar(f) { const extremo = T.MathUtils.lerp(.05, -.5, f) + .24; cable.scale.y = .62 - extremo; cable.position.y = (.62 + extremo) / 2; } });
  } else if (tipo === 'M3') {
    mesh(root, 'capsula_presurizada', new T.SphereGeometry(.17, 24, 16), plata, [0, -.65, 0]);
    cyl(root, 'banda_ecuatorial', .172, .08, oro, [0, -.65, 0]);
    const ojo = cyl(root, 'puerto_sensor', .06, .025, oscuro, [0, -.65, .16]); ojo.rotation.x = Math.PI / 2;
    bar(root, 'antena_telemetria', [.1, -.66, 0], [.38, -.54, 0], .004, plata);
    cyl(root, 'contenedor_paracaidas', .085, .08, oscuro, [0, -.46, 0]);
    const canopy = new T.Group(); canopy.name = 'paracaidas_desplegable'; root.add(canopy);
    for (let i = 0; i < 16; i++) {
      const start = i * Math.PI * 2 / 16;
      const geo = new T.SphereGeometry(.72, 6, 12, start, Math.PI * 2 / 16, .07, Math.PI / 2 - .07);
      mesh(canopy, `gajo_${i}`, geo, i % 2 ? tela : naranja, [0, .6, 0]);
      const x = Math.cos(start) * .72, z = -Math.sin(start) * .72;
      bar(canopy, `suspension_${i}`, [x, .6, z], [0, -.4, 0], .0025, plata);
      const points = Array.from({ length: 17 }, (_, j) => {
        const t = .07 + j / 16 * (Math.PI / 2 - .07);
        return new T.Vector3(-.724 * Math.sin(t) * Math.cos(start), .6 + .724 * Math.cos(t), .724 * Math.sin(t) * Math.sin(start));
      });
      mesh(canopy, `costura_${i}`, new T.TubeGeometry(new T.CatmullRomCurve3(points), 16, .002, 4, false), tela);
    }
    pivotes.push({ canopy });
  }
  root.userData = { unidades: 'metros', concepto: true, modelo: tipo };
  function desplegar(t) {
    const f = T.MathUtils.clamp(t, 0, 1);
    for (const p of pivotes) {
      if (p.actualizar) { p.actualizar(f); continue; }
      if (p.canopy) { p.canopy.scale.set(.04 + f * .96, .04 + f * .96, .04 + f * .96); p.canopy.position.y = -.43 * (1 - f); p.canopy.visible = f > .01; }
      else (p.position ? p.pivot.position : p.pivot.rotation)[p.axis] = T.MathUtils.lerp(p.closed, p.open, f);
    }
  }
  desplegar(1);
  return { objeto: root, desplegar, liberar() { const gs = new Set(), ms = new Set(); root.traverse(o => { if (o.geometry) gs.add(o.geometry); if (o.material) ms.add(o.material); }); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); } };
}
