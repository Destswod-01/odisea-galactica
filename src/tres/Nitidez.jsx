import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Renderizar a la densidad de pantalla, con supersampling moderado en monitores
// normales. El presupuesto limita la carga en alta resolución, nunca estira CSS.
export default function Nitidez({ calidad = 'media', revision = '', alResolver }) {
  const { gl, scene, size } = useThree();
  useLayoutEffect(() => {
    const nativo = window.devicePixelRatio || 1;
    const deseado = calidad === 'alta' ? 2.5 : calidad === 'baja' ? Math.min(1.5, nativo) : 2;
    const presupuesto = calidad === 'alta' ? 9000000 : calidad === 'baja' ? 3000000 : 6500000;
    // Mantener el valor en la prop del Canvas: su configure() se ejecuta al
    // cambiar el zoom y sobrescribiría una modificación imperativa del store.
    alResolver(Math.max(1, Math.min(deseado, Math.sqrt(presupuesto / Math.max(1, size.width * size.height)))));
    const aniso = Math.min(calidad === 'baja' ? 4 : 16, gl.capabilities.getMaxAnisotropy());
    scene.traverse(obj => {
      const mats = obj.material ? Array.isArray(obj.material) ? obj.material : [obj.material] : [];
      for (const m of mats) for (const t of [m.map, m.normalMap, m.roughnessMap]) {
        if (t && t.anisotropy !== aniso) { t.anisotropy = aniso; t.needsUpdate = true; }
      }
    });
  }, [gl, scene, size.width, size.height, alResolver, calidad, revision]);
  return null;
}
