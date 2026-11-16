// Carga diferida del 3D: Three.js pesa ~250 KB comprimido. Así el menú abre rápido
// y cada escena 3D se descarga la primera vez que se necesita (luego queda en caché).
import { lazy, Suspense } from 'react';

const deEscenas = (nombre) => lazy(() => import('./Escenas.jsx').then((m) => ({ default: m[nombre] })));
const GarageL = deEscenas('Garage');
const JupiterMenuL = deEscenas('JupiterMenu');
const EscenaJupiterL = deEscenas('EscenaJupiter');
const ComparacionL = deEscenas('Comparacion');
const Lanzamiento3DL = lazy(() => import('./Lanzamiento3D.jsx'));
const Cabina3DL = lazy(() => import('./Cabina3D.jsx'));

function Cargando({ alto }) {
  return <div className="cargando-3d" style={{ height: alto }}><span>Cargando 3D…</span></div>;
}
const envolver = (C, alto) => function Perezoso(props) {
  return <Suspense fallback={<Cargando alto={props.alto || alto} />}><C {...props} /></Suspense>;
};

export const Garage = envolver(GarageL, 380);
export const JupiterMenu = envolver(JupiterMenuL, 320);
export const EscenaJupiter = envolver(EscenaJupiterL, 340);
export const Comparacion = envolver(ComparacionL, 300);
export const Lanzamiento3D = envolver(Lanzamiento3DL, 460);
export const Cabina3D = envolver(Cabina3DL, 470);
