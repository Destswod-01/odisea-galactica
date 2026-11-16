// Contenido basado en los objetivos y conceptos de datos/misiones/lro.json.
export const PREGUNTAS_ENTREVISTA = [
  {
    "id": "destino",
    "correcta": 0,
    "opciones": 3
  },
  {
    "id": "mapa",
    "correcta": 1,
    "opciones": 3
  },
  {
    "id": "hielo",
    "correcta": 2,
    "opciones": 3
  },
  {
    "id": "radiacion",
    "correcta": 0,
    "opciones": 3
  },
  {
    "id": "solar",
    "correcta": 1,
    "opciones": 3
  },
  {
    "id": "antena",
    "correcta": 2,
    "opciones": 3
  },
  {
    "id": "deltav",
    "correcta": 1,
    "opciones": 3
  },
  {
    "id": "frenar",
    "correcta": 0,
    "opciones": 3
  },
  {
    "id": "instrumentos",
    "correcta": 2,
    "opciones": 3
  },
  {
    "id": "cohete",
    "correcta": 0,
    "opciones": 3
  },
  {
    "id": "orbita",
    "correcta": 1,
    "opciones": 3
  },
  {
    "id": "bateria",
    "correcta": 2,
    "opciones": 3
  }
];
export const TOTAL_ENTREVISTA = 8;
export const PAGO_ACIERTO = 10;
export const DESCUENTO_ERROR = 5;

export function seleccionarPreguntas(azar = Math.random) {
  const preguntas = [...PREGUNTAS_ENTREVISTA];
  for (let i = preguntas.length - 1; i > 0; i--) {
    const valor = azar();
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(valor) ? valor : 0) * (i + 1))));
    [preguntas[i], preguntas[j]] = [preguntas[j], preguntas[i]];
  }
  return preguntas.slice(0, TOTAL_ENTREVISTA);
}

// No se aceptan preguntas repetidas ni respuestas fuera del banco.
// Los errores solo descuentan del premio de esta entrevista, nunca de la campaña.
export function calcularPagoEntrevista(respuestas) {
  if (!Array.isArray(respuestas) || respuestas.length > TOTAL_ENTREVISTA) return 0;
  const vistas = new Set();
  let saldo = 0;
  for (const respuesta of respuestas) {
    const p = PREGUNTAS_ENTREVISTA.find(p => p.id === respuesta?.preguntaId);
    if (!p || vistas.has(p.id) || !Number.isInteger(respuesta.opcion) || respuesta.opcion < 0 || respuesta.opcion >= p.opciones) return 0;
    vistas.add(p.id);
    saldo += respuesta.opcion === p.correcta ? PAGO_ACIERTO : -DESCUENTO_ERROR;
  }
  return Math.max(0, saldo);
}
