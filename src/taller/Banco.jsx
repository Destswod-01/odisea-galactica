// Banco de pruebas del taller: ?banco=<Archivo> muestra el `Demo` de ese módulo con órbita libre.
// Ejemplos: ?banco=Cuarto · ?banco=Maquina · ?banco=Brazo · ?banco=Operador · ?banco=piezas3d
// Opcional: &calidad=alta|media|baja
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { lazy, Suspense, useMemo } from 'react';

// Vite resuelve estos módulos al vuelo: uno que todavía no existe simplemente no aparece en la lista.
const MODULOS = { ...import.meta.glob('./*.jsx'), ...import.meta.glob('../tres/piezas3d.jsx') };
const nombreDe = (ruta) => ruta.split('/').pop().replace('.jsx', '');

export default function Banco({ modulo, calidad = 'alta' }) {
  const disponibles = Object.keys(MODULOS).map(nombreDe).filter((n) => n !== 'Banco');
  const ruta = Object.keys(MODULOS).find((r) => nombreDe(r) === modulo);
  const Demo = useMemo(() => (ruta ? lazy(() => MODULOS[ruta]().then((m) => ({
    default: m.Demo || (() => <mesh><boxGeometry /><meshNormalMaterial /></mesh>),
  }))) : null), [ruta]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060a10', color: '#edf4fa', font: '13px Inter, sans-serif' }}>
      <div style={{ position: 'absolute', zIndex: 2, top: 10, left: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>Banco de pruebas</strong>
        {disponibles.map((n) => (
          <a key={n} href={`?banco=${n}&calidad=${calidad}`} style={{ color: n === modulo ? '#9be9ee' : '#95a8ba' }}>{n}</a>
        ))}
        <span style={{ color: '#95a8ba' }}>· calidad: {['alta', 'media', 'baja'].map((c) => (
          <a key={c} href={`?banco=${modulo}&calidad=${c}`} style={{ color: c === calidad ? '#9be9ee' : '#95a8ba', marginLeft: 6 }}>{c}</a>
        ))}</span>
      </div>
      {!Demo ? (
        <p style={{ padding: '60px 14px' }}>No existe el módulo «{modulo}». Disponibles: {disponibles.join(', ') || 'ninguno todavía'}.</p>
      ) : (
        <Canvas shadows={calidad !== 'baja'} dpr={calidad === 'alta' ? [1, 2] : calidad === 'media' ? [1, 1.5] : 1}
          camera={{ position: [17, 15.5, 19], fov: 34 }} gl={{ antialias: true }}>
          <color attach="background" args={['#0a1119']} />
          <Suspense fallback={null}>
            <Demo calidad={calidad} />
          </Suspense>
          <OrbitControls makeDefault target={[0, 1.4, 0]} />
        </Canvas>
      )}
    </div>
  );
}
