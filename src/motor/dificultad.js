// Niveles de dificultad (tareas B2 y B11). En pantalla se llaman Novato, Conocedor y Experto; los ids internos
// siguen siendo 'principiante', 'intermedio' y 'experto' para no romper partidas guardadas ni el resto del código.
// Se inspiran en los niveles de estudio del Mission Design Lab de NASA Goddard:
// «Concept Development» (novato), «Trade Study» (conocedor) y «Point Design» (experto).
//
// Intermedio = los números de la misión real, sin tocar nada.
// Principiante = misma misión con más margen. Cada palanca es un multiplicador sobre un campo de la misión:
//   presupuesto      → presupuesto_musd (más dinero para gastar)
//   capacidad        → capacidad_mult (el cohete levanta más)
//   dvRequerida      → dv_requerida_ms (menos Δv que reunir; <1 = más fácil)
//   ventanaInsercion → ventana_insercion_ms (la ventana de captura orbital es más ancha)
//   bateria          → bateria_wh (más batería para el viaje)
export const NIVELES = ['principiante', 'intermedio', 'experto'];
export const NIVEL_POR_DEFECTO = 'intermedio';

export const CONFIG_DIFICULTAD = {
  principiante: { presupuesto: 1.25, capacidad: 1.15, dvRequerida: 0.9, ventanaInsercion: 1.6, bateria: 1.3 },
  intermedio: { presupuesto: 1, capacidad: 1, dvRequerida: 1, ventanaInsercion: 1, bateria: 1 },
  // Experto: la nave real de NASA sigue cabiendo (la misión siempre se puede ganar); lo difícil está en los minijuegos.
  experto: { presupuesto: 0.95, capacidad: 1, dvRequerida: 1.05, ventanaInsercion: 0.75, bateria: 0.85 },
};

// Métricas de los minijuegos por nivel (B11). Cada etapa las aplica a sus propios números:
//   tolerancia → márgenes de acierto (anchos de aros, ventanas, radios de captura): >1 = más fácil
//   velocidad  → rapidez de lo que se mueve (obstáculos, desgaste, eventos): <1 = más lento y fácil
//   tiempo     → tiempo disponible para cada reto: >1 = más tiempo
export const MINIJUEGO = {
  principiante: { tolerancia: 1.35, velocidad: 0.8, tiempo: 1.25 },
  intermedio: { tolerancia: 1, velocidad: 1, tiempo: 1 },
  experto: { tolerancia: 0.75, velocidad: 1.2, tiempo: 0.85 },
};

/** Ajustes de minijuego para la misión (según mision.dificultad; sin dificultad = conocedor, los números de siempre). */
export const ajusteMinijuego = (mision) => MINIJUEGO[nivelValido(mision?.dificultad)];

export const nivelValido = (nivel) => (NIVELES.includes(nivel) ? nivel : NIVEL_POR_DEFECTO);

// Devuelve una misión NUEVA (la original no se modifica) con los multiplicadores del nivel aplicados.
export function misionConDificultad(mision, nivel) {
  const dificultad = nivelValido(nivel);
  const c = CONFIG_DIFICULTAD[dificultad];
  const por = (valor, k) => (valor == null ? valor : valor * c[k]);
  const salida = { ...mision, dificultad };
  salida.presupuesto_musd = por(mision.presupuesto_musd, 'presupuesto');
  salida.capacidad_mult = (mision.capacidad_mult ?? 1) * c.capacidad;
  salida.dv_requerida_ms = por(mision.dv_requerida_ms, 'dvRequerida');
  salida.ventana_insercion_ms = por(mision.ventana_insercion_ms, 'ventanaInsercion');
  salida.bateria_wh = por(mision.bateria_wh, 'bateria');
  return salida;
}
