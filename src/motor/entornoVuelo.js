export const ANGULO_ASCENSO = Math.PI / 3;
export const RADIO_TIERRA_ESCENA = 500;

export function posicionAscenso(x, y, distancia) {
  return [
    x,
    5 + y * Math.cos(ANGULO_ASCENSO) + distancia * Math.sin(ANGULO_ASCENSO),
    y * Math.sin(ANGULO_ASCENSO) - distancia * Math.cos(ANGULO_ASCENSO),
  ];
}

export function progresoSeparacion(segundos) {
  return Math.max(0, Math.min(1, (segundos - 1) / 4.5));
}

// Secuencia cinemática paso a paso en órbita ecuatorial terrestre:
// cada paso acerca la cámara a la parte de la nave que se despliega, muestra el progreso (0% -> 100%)
// y al final dispara la sonda hacia el planeta destino. Los textos viven en i18n: `e02.Despegue.paso.<id>.*`
// (con variante `Rtg` en `titulo`, `instruccion`, `boton`, `msgIniciando` y `msgDetectando` del paso de energía).
export const PASOS_DESPLIEGUE_SONDA = [
  { id: 'cofia4', paso: 1, icono: '🔓' },
  { id: 'expulsar', paso: 2, icono: '🚀' },
  { id: 'paneles', paso: 3, icono: '☀️', rtg: true },
  { id: 'antena', paso: 4, icono: '📡' },
  { id: 'propulsores', paso: 5, icono: '🔥' },
];
