// Operación científica: una decisión de la misión y luego las pasadas científicas (minijuego)
// contra la radiación. La ciencia sale de lo que realmente observas y envías a la Tierra.
import { useState } from 'react';
import { aplicarEfectos, bloqueOrbitas } from '../motor/mision.js';
import Jupiter from '../componentes/Jupiter.jsx';
import { EscenaJupiter } from '../tres/perezoso.jsx';
import { soportaWebGL } from '../tres/webgl.js';
import Pasada from '../componentes/Pasada.jsx';

export default function Operacion({ mision, piezas, diseno, estetica, estado, setEstado, setExtras, alTerminar, concepto, resumen }) {
  const valvula = mision.eventos.find((ev) => ev.tipo === 'decision_final');
  const [decidido, setDecidido] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [jugando, setJugando] = useState(false);
  const [arrastre, setArrastre] = useState([]); // datos que quedaron en el búfer para la siguiente pasada
  const instrumentos = piezas.filter((p) => diseno.instrumentos.includes(p.id) && estado.encendidos.includes(p.id));
  const numero = Math.floor(estado.orbitas / mision.orbitas_por_bloque) + 1;
  const totalPasadas = Math.ceil(estado.orbitasMeta / mision.orbitas_por_bloque);
  const terminado = estado.perdida || estado.orbitas >= estado.orbitasMeta;

  const decidir = (o) => {
    let n;
    if (o.efectos.riesgo) {
      const fallo = Math.random() < o.efectos.riesgo;
      n = fallo
        ? aplicarEfectos(estado, { salud: -20, modo_seguro: 1 }, o.resultado_mal, 'mal')
        : aplicarEfectos(estado, { orbitas_extra: o.efectos.orbitas_extra }, o.resultado_ok, 'bien');
    } else {
      n = aplicarEfectos(estado, {}, o.resultado, 'bien');
      if (o.real) setExtras((x) => ({ ...x, coincidenciasReales: x.coincidenciasReales + 1 }));
    }
    setEstado(n);
    setDecidido(true);
  };

  const orbitar = (aciertos, detalle = null) => {
    const r = bloqueOrbitas(estado, diseno, piezas, mision, aciertos);
    setEstado(r.estado);
    setUltimo({ ...r, detalle });
  };
  const alFinPasada = (r) => {
    setJugando(false);
    setArrastre(r.arrastre);
    orbitar(r.aciertos, r);
  };
  const automatico = () => orbitar(Object.fromEntries(mision.objetivos.map((o) => [o.id, 0.5])), { automatico: true });

  const finalizar = (desorbitar) => {
    if (desorbitar) {
      setExtras((x) => ({ ...x, desorbito: true }));
      setEstado((e) => aplicarEfectos(e, {}, mision.final_texto, 'bien'));
    }
    alTerminar();
  };

  return (
    <div className="panel">
      {concepto('operacion')}
      {jugando ? (
        <Pasada mision={mision} instrumentos={instrumentos} factorDatos={resumen.factorDatos} numero={numero} total={totalPasadas}
          arrastre={arrastre} alTerminar={alFinPasada} />
      ) : soportaWebGL() ? (
        <div className="lienzo-marco"><EscenaJupiter destino={mision.destino.id} diseno={diseno} estetica={estetica} resultado={estado.multDosis > 1 ? 'baja' : 'captura'} alto={260} /></div>
      ) : (
      <div className="escena-orbita">
        <Jupiter tam={180} auroras />
        <div className="orbitador" style={{ animationDuration: `${Math.max(2, 6 - estado.orbitas * 0.3)}s` }}>
          <span className={`punto-nave ${estado.salud < 30 ? 'danada' : ''}`} />
        </div>
      </div>
      )}
      <h2>En órbita de {mision.destino.nombre}</h2>
      {!decidido ? (
        <>
          <h3>{valvula.titulo}</h3>
          <p className="directora">{valvula.texto}</p>
          <div className="acciones">
            {valvula.opciones.map((o) => <button key={o.texto} onClick={() => decidir(o)}>{o.texto}</button>)}
          </div>
        </>
      ) : (
        <>
          <p className={estado.decisiones.at(-1).tipo}>{estado.decisiones.at(-1).texto}</p>
          <p>Ciencia acumulada: <strong>{Math.round(Math.min(1, estado.ciencia) * 100)} %</strong></p>
          {ultimo && (
            <p className="tenue">
              {ultimo.detalle?.automatico ? 'Piloto automático: ' : ultimo.detalle ? `Observaste ${ultimo.detalle.observados} de ${ultimo.detalle.total} objetivos${ultimo.detalle.perdidos ? ` (${ultimo.detalle.perdidos} perdidos por búfer lleno)` : ''}. ` : ''}
              +{Math.round(ultimo.ganancia * 100)} % de ciencia enviada a la Tierra, −{Math.round(ultimo.dosis)} de salud por radiación.
            </p>
          )}
          {!terminado && !jugando && (
            <div className="concepto" style={{ marginTop: 8 }}>
              <span className="concepto-icono" aria-hidden="true">🛰️</span>
              <div>
                <h3>Pasada {numero} de {totalPasadas}: cómo se juega</h3>
                <p>El suelo pasa bajo la nave. Cuando un objetivo entre en la <strong>MIRA</strong>, pulsa el instrumento que sirve para él (teclas <kbd className="tecla">1</kbd> <kbd className="tecla">2</kbd>… o tocando el botón). Los datos llenan el búfer y solo se envían a la Tierra en los tramos verdes de arriba: si el búfer se llena, se pierden. Solo cuenta la ciencia que llega a la Tierra.</p>
              </div>
            </div>
          )}
          {estado.salud < 30 && !estado.perdida && <p className="aviso">La electrónica está dañada: los instrumentos fallan seguido.</p>}
          <div className="acciones">
            {!terminado && !jugando && <button className="primario" onClick={() => setJugando(true)}>Iniciar pasada {numero}</button>}
            {!terminado && !jugando && <button onClick={automatico}>Piloto automático (rinde 50 %)</button>}
            {!estado.perdida && !jugando && <button onClick={() => finalizar(true)}>{mision.final_boton}</button>}
            {estado.perdida && <button className="primario" onClick={() => finalizar(false)}>Ver el informe</button>}
          </div>
        </>
      )}
    </div>
  );
}
