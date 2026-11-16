// Idioma del juego (español / inglés).
//
// Cómo se usa en una pantalla:
//   import { useT } from '../i18n/idioma.js';
//   const t = useT();
//   <button>{t('menu.iniciar')}</button>
//   <p>{t('menu.completa', { mision: 'LRO' })}</p>      ← «Completa {mision} para desbloquearla.»
//
// Las claves viven en archivos por bloque: src/i18n/es/<bloque>.js y src/i18n/en/<bloque>.js
// (cada uno con `export default { 'bloque.clave': 'texto' }`). Se juntan solos con import.meta.glob,
// así cada tarea agrega su propio archivo y no choca con las demás.
// Si una clave no existe en inglés se usa la de español; si tampoco existe, se muestra `porDefecto` o la clave.
//
// Datos (misiones, piezas, cohetes): misionLocal / piezasLocales aplican la capa en inglés
// (lro.en.json, piezas.en.json…) encima de la original. Solo se reemplazan textos: números, ids y tipos no cambian.
import { useSyncExternalStore } from 'react';

export const IDIOMAS = ['es', 'en'];
export const CLAVE_IDIOMA = 'orbita2-idioma';

const juntar = (modulos) => Object.values(modulos).reduce((acc, m) => ({ ...acc, ...(m.default || m) }), {});
const DICCIONARIOS = {
  es: juntar(import.meta.glob('./es/*.js', { eager: true })),
  en: juntar(import.meta.glob('./en/*.js', { eager: true })),
};

const valido = (x) => (IDIOMAS.includes(x) ? x : null);

export function idiomaInicial() {
  // Fuera del navegador (pruebas en Node) siempre español: así las pruebas no dependen del idioma de cada máquina.
  if (typeof window === 'undefined') return 'es';
  try {
    const url = valido(new URLSearchParams(window.location.search).get('lang'));
    if (url) return url;
  } catch { /* sin window */ }
  try {
    const guardado = valido(localStorage.getItem(CLAVE_IDIOMA));
    if (guardado) return guardado;
  } catch { /* sin almacenamiento */ }
  // Por defecto, inglés (el juego se presenta a un jurado internacional); el jugador puede cambiar a español con ES/EN.
  return 'en';
}

let actual = idiomaInicial();
const oyentes = new Set();
try { document.documentElement.lang = actual; } catch { /* sin document */ }

export const idiomaActual = () => actual;

export function setIdioma(nuevo) {
  if (!valido(nuevo) || nuevo === actual) return;
  actual = nuevo;
  try { localStorage.setItem(CLAVE_IDIOMA, nuevo); } catch { /* sin almacenamiento */ }
  try { document.documentElement.lang = nuevo; } catch { /* sin document */ }
  oyentes.forEach((f) => f());
}

const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

/** Devuelve [idioma, setIdioma] y vuelve a pintar el componente cuando cambia. */
export function useIdioma() {
  const idioma = useSyncExternalStore(suscribir, idiomaActual, idiomaActual);
  return [idioma, setIdioma];
}

const rellenar = (texto, vars) => (vars ? texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : texto);

/** Traduce una clave al idioma indicado (o al actual). */
export function traducir(clave, vars, porDefecto, idioma = actual) {
  const texto = DICCIONARIOS[idioma]?.[clave] ?? DICCIONARIOS.es[clave] ?? porDefecto ?? clave;
  return rellenar(String(texto), vars);
}

/** Atajo fuera de React (motores, utilidades): usa el idioma actual. */
export const t = (clave, vars, porDefecto) => traducir(clave, vars, porDefecto);

/** Hook para componentes: devuelve t() y repinta al cambiar de idioma. */
export function useT() {
  const [idioma] = useIdioma();
  return (clave, vars, porDefecto) => traducir(clave, vars, porDefecto, idioma);
}

// ---------- Datos ----------

// Mezcla la capa traducida encima de la original: solo cambia textos (string sobre string).
// Los arreglos se mezclan por posición y los objetos por clave; lo que falte en la capa se queda como estaba.
export function mezclarTextos(base, capa) {
  if (capa == null) return base;
  if (typeof base === 'string') return typeof capa === 'string' ? capa : base;
  if (Array.isArray(base)) return Array.isArray(capa) ? base.map((b, i) => mezclarTextos(b, capa[i])) : base;
  if (base && typeof base === 'object') {
    if (!capa || typeof capa !== 'object' || Array.isArray(capa)) return base;
    const out = {};
    for (const k of Object.keys(base)) out[k] = mezclarTextos(base[k], capa[k]);
    return out;
  }
  return base;
}

const CAPAS_MISION = import.meta.glob('../datos/misiones/*.en.json', { eager: true, import: 'default' });
const CAPA_PIEZAS = Object.values(import.meta.glob('../datos/piezas.en.json', { eager: true, import: 'default' }))[0] || {};
const CAPA_COHETES = Object.values(import.meta.glob('../datos/cohetes.en.json', { eager: true, import: 'default' }))[0] || {};

/** Misión con sus textos en el idioma pedido (si existe su capa <id>.en.json). */
export function misionLocal(mision, idioma = actual) {
  if (idioma === 'es' || !mision) return mision;
  const capa = CAPAS_MISION[`../datos/misiones/${mision.id}.${idioma}.json`];
  return capa ? mezclarTextos(mision, capa) : mision;
}

// Las capas de piezas y cohetes van por id: { "<id>": { "nombre": "...", "dato": "..." } }.
const porId = (lista, capa) => lista.map((p) => (capa[p.id] ? mezclarTextos(p, capa[p.id]) : p));

export const piezasLocales = (piezas, idioma = actual) => (idioma === 'es' ? piezas : porId(piezas, CAPA_PIEZAS));
export const cohetesLocales = (cohetes, idioma = actual) => (idioma === 'es' ? cohetes : porId(cohetes, CAPA_COHETES));
