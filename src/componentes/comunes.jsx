// Componentes pequeños reutilizados en varias pantallas.
import { useT } from '../i18n/idioma.js';
const fmt = (n) => Math.round(n).toLocaleString('es-MX');

// Barra de presupuesto. Si recibe `previo` (cómo quedaría con la pieza bajo el cursor),
// muestra el cambio: así el jugador ve las consecuencias antes de decidir.
export function Barra({ nombre, valor, limite, ok, soloAviso, unidad, invertida, previo }) {
  const t = useT();
  const pct = limite ? valor / limite : invertida ? 1 : 0;
  const color = (esOk) => (esOk ? 'var(--ok)' : soloAviso ? 'var(--aviso)' : 'var(--mal)');
  const cambio = previo ? Math.round(previo.valor - valor) : 0;
  const cambioLimite = previo ? Math.round(previo.limite - limite) : 0;
  const pctPrevio = previo && previo.limite ? previo.valor / previo.limite : 0;
  return (
    <div className="barra">
      <div className="etiqueta">
        <span>{nombre}</span>
        <span style={{ color: color(ok) }}>
          {fmt(valor)} / {fmt(limite)} {unidad}
          {previo && (cambio !== 0 || cambioLimite !== 0) && (
            <strong style={{ color: color(previo.ok), marginLeft: 6 }}>
              {cambio !== 0 && `${cambio > 0 ? '+' : ''}${fmt(cambio)}`}
              {cambioLimite !== 0 && ` (${t('hangar.limite')} ${cambioLimite > 0 ? '+' : ''}${fmt(cambioLimite)})`}
            </strong>
          )}
        </span>
      </div>
      <div className="riel">
        {previo && <div className="relleno fantasma" style={{ width: `${Math.min(100, pctPrevio * 100)}%`, background: color(previo.ok) }} />}
        <div className="relleno" style={{ width: `${Math.min(100, pct * 100)}%`, background: color(ok) }} />
      </div>
    </div>
  );
}

export function Estado({ e }) {
  const t = useT();
  return (
    <div className="cabecera">
      <span>{t('recursos.bateria')} {Math.round((e.bateria / e.bateriaMax) * 100)} %</span>
      <span>{t('recursos.salud')} {Math.round(e.salud)} %</span>
      <span>Δv {Math.round(e.dvRestante)} m/s</span>
      <span>{t('recursos.modosSeguros')} {e.modosSeguros}</span>
      {e.orbitas > 0 && <span>{t('recursos.orbitas')} {e.orbitas}/{e.orbitasMeta}</span>}
    </div>
  );
}
