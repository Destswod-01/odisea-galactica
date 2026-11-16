// Requisitos de la misión y su verificación (recurso NASA «Design and Develop Science Missions»):
// cada requisito se define junto con CÓMO se verifica. Motor puro: solo lee el resumen de la nave.
export const UMBRAL_COBERTURA = 0.6; // cada objetivo científico debe quedar cubierto al menos en este porcentaje

export function requisitos(mision, resumen) {
  const b = resumen.barras;
  const lista = [
    { id: 'masa', clave: 'requisitos.masa', verificacion: 'requisitos.verifMasa', cumple: b.masa.ok, valor: b.masa.valor, limite: b.masa.limite },
    { id: 'costo', clave: 'requisitos.costo', verificacion: 'requisitos.verifCosto', cumple: b.costo.ok, valor: b.costo.valor, limite: b.costo.limite },
    { id: 'energia', clave: 'requisitos.energia', verificacion: 'requisitos.verifEnergia', cumple: b.energia.ok, valor: b.energia.valor, limite: b.energia.limite },
    { id: 'dv', clave: 'requisitos.dv', verificacion: 'requisitos.verifDv', cumple: b.dv.ok, valor: b.dv.valor, limite: b.dv.limite },
    { id: 'datos', clave: 'requisitos.datos', verificacion: 'requisitos.verifDatos', cumple: b.datos.ok, valor: b.datos.valor, limite: b.datos.limite },
  ];
  // B3: el desarrollo tiene que caber en el plazo de la misión (solo si la misión trae `plazo_meses`).
  if (b.tiempo && b.tiempo.limite != null) lista.push({ id: 'tiempo', clave: 'requisitos.tiempo', verificacion: 'requisitos.verifTiempo', cumple: b.tiempo.ok, valor: b.tiempo.valor, limite: b.tiempo.limite });
  for (const o of resumen.ciencia.porObjetivo) {
    lista.push({
      id: `objetivo-${o.id}`, clave: 'requisitos.objetivo', verificacion: 'requisitos.verifObjetivo',
      cumple: o.cobertura >= UMBRAL_COBERTURA, valor: Math.round(o.cobertura * 100), limite: Math.round(UMBRAL_COBERTURA * 100),
      objetivo: o.nombre,
    });
  }
  return lista.map((r) => {
    const unidad = r.id === 'masa' ? 'kg' : r.id === 'costo' ? 'M USD' : r.id === 'energia' ? 'W' : r.id === 'dv' ? 'm/s' : r.id === 'datos' ? 'Mbit/día' : r.id === 'tiempo' ? 'meses' : '%';
    const valor = Math.round(r.valor), limite = Math.round(r.limite);
    return { ...r, valor, limite, vars: { valor, limite, unidad, objetivo: r.objetivo || '' } };
  });
}

export function resumenRequisitos(lista) {
  return { cumplidos: lista.filter((r) => r.cumple).length, total: lista.length };
}
