// Mapa del viaje (vista desde arriba del sistema solar). La nave avanza por la ruta real de Juno:
// sale más allá de Marte, vuelve a la Tierra para la honda gravitatoria y luego va a Júpiter.
// Escala con raíz cuadrada para que Júpiter quepa en pantalla.
const escala = (ua) => 52 * Math.sqrt(ua);
const punto = (ua, grados) => {
  const a = (grados * Math.PI) / 180;
  return [200 + escala(ua) * Math.cos(a), 150 + escala(ua) * Math.sin(a)];
};
// Posición de la nave en cada evento (distancia en UA, ángulo).
const RUTA = [[1, 200], [2.5, 300], [1, 40], [3.5, 150], [4.5, 205], [5.2, 230]];

// Viaje Tierra → Luna: la Tierra al centro, la órbita de la Luna y una trayectoria curva.
function MapaLuna({ paso, total }) {
  const p = paso < 0 ? 0 : Math.min(1, (paso + 1) / total);
  const t = (k) => {
    const a = (-150 + k * 200) * (Math.PI / 180);
    const r = 30 + k * 95;
    return [200 + r * Math.cos(a), 150 + r * Math.sin(a)];
  };
  const puntos = Array.from({ length: 21 }, (_, k) => t(k / 20));
  const hecho = puntos.slice(0, Math.max(1, Math.round(p * 20) + 1));
  const [nx, ny] = hecho[hecho.length - 1];
  const [lx, ly] = t(1);
  const linea = (pts) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
  return (
    <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="Mapa del viaje a la Luna">
      <circle cx="200" cy="150" r="125" fill="none" stroke="#b8bec9" strokeOpacity=".3" strokeDasharray="2 4" />
      <circle cx="200" cy="150" r="22" fill="#2b6fd6" />
      <circle cx="200" cy="150" r="26" fill="none" stroke="#9fd0ff" strokeOpacity=".5" className="onda-sol" />
      <text x="200" y="190" textAnchor="middle" fontSize="10" fill="#9ec9ff">Tierra</text>
      <circle cx={lx} cy={ly} r="9" fill="#b8b8b8" />
      <text x={lx + 12} y={ly + 4} fontSize="10" fill="#d8d8d8">Luna</text>
      <path d={linea(puntos)} fill="none" stroke="#ffffff" strokeOpacity=".15" strokeWidth="1.5" />
      <path d={linea(hecho)} fill="none" stroke="#ff7a1a" strokeWidth="2" strokeDasharray="4 3" className="ruta" />
      <g style={{ transform: `translate(${nx}px, ${ny}px)`, transition: 'transform 1.4s cubic-bezier(.4,0,.2,1)' }}>
        <circle r="10" fill="#ff7a1a" opacity=".25" className="onda-nave" />
        <polygon points="-5,-3 0,-6 5,-3 5,3 0,6 -5,3" fill="#fff" />
      </g>
    </svg>
  );
}

export default function MapaViaje({ paso, destino = 'jupiter', total = 6 }) {
  if (destino === 'luna') return <MapaLuna paso={paso} total={total} />;
  const hasta = Math.max(0, Math.min(paso, RUTA.length - 1));
  const puntos = [[1, 160], ...RUTA.slice(0, paso < 0 ? 0 : hasta + 1)].map(([d, g]) => punto(d, g));
  const [nx, ny] = puntos[puntos.length - 1];
  const ruta = puntos.map(([x, y], k) => (k === 0 ? `M${x} ${y}` : `L${x} ${y}`)).join(' ');
  const [jx, jy] = punto(5.2, 230);

  return (
    <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="Mapa del viaje a Júpiter">
      <circle cx="200" cy="150" r="13" fill="#ffd34d" />
      <circle cx="200" cy="150" r="22" fill="#ffd34d" opacity=".15" className="onda-sol" />
      {[[1, 'Tierra', '#4da3ff'], [1.52, 'Marte', '#d4623a'], [5.2, 'Júpiter', '#d9a066']].map(([d, n, c]) => (
        <circle key={n} cx="200" cy="150" r={escala(d)} fill="none" stroke={c} strokeOpacity=".35" strokeDasharray="2 4" />
      ))}
      <circle cx={punto(1, 40)[0]} cy={punto(1, 40)[1]} r="5" fill="#4da3ff" />
      <text x={punto(1, 40)[0] + 8} y={punto(1, 40)[1] + 4} fontSize="10" fill="#9ec9ff">Tierra</text>
      <circle cx={jx} cy={jy} r="9" fill="#d9a066" />
      <text x={jx + 12} y={jy + 4} fontSize="10" fill="#f0d2a8">Júpiter</text>
      {/* Ruta recorrida */}
      <path d={ruta} fill="none" stroke="#ff7a1a" strokeWidth="2" strokeDasharray="4 3" className="ruta" />
      {/* La nave: se desliza al siguiente punto */}
      <g style={{ transform: `translate(${nx}px, ${ny}px)`, transition: 'transform 1.4s cubic-bezier(.4,0,.2,1)' }}>
        <circle r="10" fill="#ff7a1a" opacity=".25" className="onda-nave" />
        <polygon points="-5,-3 0,-6 5,-3 5,3 0,6 -5,3" fill="#fff" />
        {[0, 120, 240].map((g) => <rect key={g} transform={`rotate(${g})`} x="5" y="-1.5" width="9" height="3" fill="#4d7fd6" />)}
      </g>
    </svg>
  );
}
