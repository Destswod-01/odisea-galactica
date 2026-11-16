// Barra de recursos fija arriba, como en un videojuego: lo que el jugador tiene para gastar.
// Cambia según la fase: en el hangar, presupuesto y márgenes; en vuelo, batería, salud y Δv.
import { useT } from '../i18n/idioma.js';
import './recursos-etapa.css';

// Número de etapa de cada fase (la campaña tiene 8). La operación clásica cuenta como la 07.
const ETAPA = { hangar: 1, lanzamiento: 2, leop: 3, crucero: 4, encuentro: 5, insercion: 6, operacion: 7, operacion_clasica: 7, extendida: 8 };
const ID_ETAPA = ['hangar', 'lanzamiento', 'leop', 'crucero', 'encuentro', 'insercion', 'operacion', 'extendida'];
function Etapa({ fase }) {
  const t = useT(), n = ETAPA[fase];
  if (!n) return null;
  const nombre = t(`etapa.n.${ID_ETAPA[n - 1]}`);
  return (
    <div className="recurso etapa-chip" aria-label={t('etapa.aria', { n, nombre })}>
      <strong className="etapa-num">{t('etapa.corto')} {String(n).padStart(2, '0')}/08</strong>
      <span className="nombre">{nombre}</span>
      <span className="etapa-barra" aria-hidden="true">{ID_ETAPA.map((id, i) => <i key={id} className={i + 1 < n ? 'hecha' : i + 1 === n ? 'actual' : ''} />)}</span>
    </div>
  );
}
const fmt = (n) => Math.round(n).toLocaleString('es-MX');

function Recurso({ icono, nombre, valor, mal, ayuda }) {
  return (
    <div className={`recurso ${mal ? 'mal' : ''}`} title={ayuda}>
      {icono.startsWith('/') || icono.startsWith('./') ? <img src={icono} alt="" /> : <span className="icono" aria-hidden="true">{icono}</span>}
      <span className="nombre">{nombre}</span>
      <strong>{valor}</strong>
    </div>
  );
}

export default function Recursos({ fase, progreso, mision, resumen, estado }) {
  const t = useT();
  const fondos = <Recurso icono="./img/icono-fondos.webp" nombre={t('recursos.fondosAgencia')} valor={`${fmt(progreso.fondos)} M`} ayuda={t('recursos.fondosAyuda')} />;
  let resto = null;

  if (fase === 'hangar') {
    const b = resumen.barras;
    resto = (
      <>
        <Recurso icono="./img/icono-fondos.webp" nombre={t('recursos.presupuesto')} valor={`${fmt(b.costo.limite - b.costo.valor)} M`} mal={!b.costo.ok} ayuda={t('recursos.presupuestoAyuda')} />
        <Recurso icono="./img/icono-masa.webp" nombre={t('recursos.cargaLibre')} valor={resumen.barras.masa.limite ? `${fmt(b.masa.limite - b.masa.valor)} kg` : t('recursos.eligeCohete')} mal={!b.masa.ok && !!b.masa.limite} ayuda={t('recursos.cargaAyuda')} />
        <Recurso icono="./img/icono-energia.webp" nombre={t('recursos.energiaEn', { destino: mision.destino.nombre })} valor={`${b.energia.valor - b.energia.limite >= 0 ? '+' : ''}${fmt(b.energia.valor - b.energia.limite)} W`} mal={!b.energia.ok} ayuda={t('recursos.energiaAyuda')} />
        <Recurso icono="./img/icono-dv.webp" nombre="Δv" valor={`${b.dv.valor - b.dv.limite >= 0 ? '+' : ''}${fmt(b.dv.valor - b.dv.limite)} m/s`} mal={!b.dv.ok} ayuda={t('recursos.dvAyuda')} />
        <Recurso icono="./img/icono-datos.webp" nombre={t('recursos.datos')} valor={t('recursos.enviados', { n: Math.round(resumen.factorDatos * 100) })} mal={resumen.factorDatos < 1} ayuda={t('recursos.datosAyuda')} />
      </>
    );
  } else if (estado && ['lanzamiento', 'crucero', 'llegada', 'encuentro', 'insercion', 'operacion', 'extendida', 'operacion_clasica'].includes(fase)) {
    resto = (
      <>
        <Recurso icono="./img/icono-bateria.webp" nombre={t('recursos.bateria')} valor={`${Math.round((estado.bateria / estado.bateriaMax) * 100)} %`} mal={estado.bateria / estado.bateriaMax < 0.3} />
        <Recurso icono="./img/icono-salud.webp" nombre={t('recursos.salud')} valor={`${Math.round(estado.salud)} %`} mal={estado.salud < 30} ayuda={t('recursos.saludAyuda')} />
        <Recurso icono="./img/icono-dv.webp" nombre="Δv" valor={`${fmt(estado.dvRestante)} m/s`} mal={estado.dvRestante < 0} ayuda={t('recursos.dvVueloAyuda')} />
        <Recurso icono="⚠️" nombre={t('recursos.modosSeguros')} valor={estado.modosSeguros} mal={estado.modosSeguros > 0} />
        {estado.orbitas > 0 && <Recurso icono="🛰️" nombre={t('recursos.orbitas')} valor={`${estado.orbitas}/${estado.orbitasMeta}`} />}
        {estado.orbitas > 0 && <Recurso icono="./img/icono-ciencia.webp" nombre={t('recursos.ciencia')} valor={`${Math.round(Math.min(1, estado.ciencia) * 100)} %`} />}
      </>
    );
  }
  return <div className="recursos" role="status" aria-label={t('recursos.ariaBarra')}><Etapa fase={fase} />{fondos}{resto}</div>;
}
