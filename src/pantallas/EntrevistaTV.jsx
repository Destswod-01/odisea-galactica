import { useRef, useState } from 'react';
import { useT } from '../i18n/idioma.js';
import { calcularPagoEntrevista, seleccionarPreguntas, TOTAL_ENTREVISTA } from '../motor/entrevista.js';
import './entrevista-tv.css';

export default function EntrevistaTV({ alTerminar, alSalir }) {
  const t = useT();
  const [preguntas] = useState(seleccionarPreguntas);
  const [escena, setEscena] = useState('entrada');
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState([]);
  const [elegida, setElegida] = useState(null);
  const bloqueada = useRef(false);
  const cobrado = useRef(false);
  const pregunta = preguntas[indice];
  const premio = calcularPagoEntrevista(respuestas);
  const acertadas = respuestas.filter((r, i) => r.opcion === preguntas[i].correcta).length;
  const responder = (opcion) => {
    if (bloqueada.current) return;
    bloqueada.current = true;
    setElegida(opcion);
    setRespuestas(r => [...r, { preguntaId: pregunta.id, opcion }]);
  };
  const siguiente = () => {
    if (indice === TOTAL_ENTREVISTA - 1) { setEscena('resultado'); return; }
    setIndice(i => i + 1); setElegida(null); bloqueada.current = false;
  };
  const cobrar = () => {
    if (cobrado.current || respuestas.length !== TOTAL_ENTREVISTA) return;
    cobrado.current = true;
    alTerminar({ tipo: 'entrevista', respuestas });
  };
  return <section className="entrevista-tv" aria-label={t('entrevista.aria')}>
    <header className="entrevista-tv-cabecera"><span className="entrevista-tv-directo">● {t('entrevista.canal')}</span><button onClick={alSalir}>{t('entrevista.salir')}</button></header>
    <div className="entrevista-tv-estudio">
      <div className="entrevista-tv-planeta" aria-hidden="true">☾</div>
      {escena === 'entrada' && <div className="entrevista-tv-tarjeta"><p className="entrevista-tv-ceja">{t('entrevista.presentadora')}</p><h1>{t('entrevista.titulo')}</h1><p>{t('entrevista.intro')}</p><button className="entrevista-tv-principal" onClick={() => setEscena('preguntas')}>{t('entrevista.empezar')}</button></div>}
      {escena === 'preguntas' && <div className="entrevista-tv-tarjeta">
        <div className="entrevista-tv-marcador"><span>{t('entrevista.progreso', { n: indice + 1, total: TOTAL_ENTREVISTA })}</span><strong>{t('entrevista.premio', { n: premio })}</strong></div>
        <progress value={respuestas.length} max={TOTAL_ENTREVISTA} aria-label={t('entrevista.progreso', { n: respuestas.length, total: TOTAL_ENTREVISTA })} />
        <p className="entrevista-tv-ceja">{t('entrevista.presentadora')}</p>
        <h2>{t(`entrevista.${pregunta.id}.pregunta`)}</h2>
        <div className="entrevista-tv-opciones">{Array.from({ length: pregunta.opciones }, (_, i) => <button key={`${pregunta.id}-${i}`} disabled={elegida !== null} className={elegida !== null && i === pregunta.correcta ? 'correcta' : elegida === i ? 'incorrecta' : ''} onClick={() => responder(i)}><span aria-hidden="true">{String.fromCharCode(65 + i)}</span>{t(`entrevista.${pregunta.id}.opcion.${i}`)}</button>)}</div>
        {elegida !== null && <div className="entrevista-tv-respuesta" role="status"><strong>{t(elegida === pregunta.correcta ? 'entrevista.bien' : 'entrevista.mal')}</strong><p>{t(`entrevista.${pregunta.id}.explicacion`)}</p><button className="entrevista-tv-principal" onClick={siguiente}>{t(indice === TOTAL_ENTREVISTA - 1 ? 'entrevista.verResultado' : 'entrevista.siguiente')}</button></div>}
      </div>}
      {escena === 'resultado' && <div className="entrevista-tv-tarjeta entrevista-tv-final"><p className="entrevista-tv-ceja">{t('entrevista.canal')}</p><h1>{t('entrevista.fin')}</h1><p>{t('entrevista.resumen', { n: acertadas, total: TOTAL_ENTREVISTA })}</p><strong className="entrevista-tv-premio">{t('entrevista.ganado', { n: premio })}</strong><p>{t('entrevista.nota')}</p><button className="entrevista-tv-principal" onClick={cobrar}>{t('entrevista.cobrar')}</button></div>}
    </div>
  </section>;
}
