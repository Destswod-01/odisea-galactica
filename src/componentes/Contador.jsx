// Número que cuenta desde 0 hasta su valor (para el puntaje final).
import { useEffect, useState } from 'react';

export default function Contador({ valor, ms = 1400 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(valor); return; }
    const t0 = performance.now();
    let id;
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - t0) / ms);
      setN(Math.round(valor * (1 - (1 - p) ** 3)));
      if (p < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, ms]);
  return <>{n}</>;
}
