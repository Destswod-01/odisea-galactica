import { useT } from '../i18n/idioma.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SISTEMAS_LEOP, configurarLeop, crearLeop, pasoLeop, pulsoLeop, limiteRespuesta, aplicarLeop } from '../motor/leop.js';
import VistaSonda from '../componentes/VistaSonda.jsx';
import DialogoIO from '../componentes/DialogoIO.jsx';
import { sonidos } from '../sonido.js';
import { useEspejo } from '../red/espejo.js';
import './leop.css';
function IconoSistema({ sistema }) {
  return <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{sistema === 0 ? <><rect x="32" y="23" width="16" height="34" rx="4"/><path d="M10 25h18v30H10zM52 25h18v30H52zM19 25v30m42-30v30M10 35h18m24 0h18M10 45h18m24 0h18M28 40h4m16 0h4M40 16v7m0 34v7"/></> : sistema === 1 ? <><path d="M18 23c-7 26 15 45 39 33L18 23Zm19 26-7 18m-8 0h30M40 38l14-16"/><circle cx="56" cy="20" r="3"/><path d="M60 9a15 15 0 0 1 12 15M59 1a24 24 0 0 1 21 25"/></> : <><circle cx="40" cy="40" r="23" strokeDasharray="4 6"/><path d="m40 17 6 17 17 6-17 6-6 17-6-17-17-6 17-6Z"/><path d="M12 8v12M6 14h12m49 48v12m-6-6h12"/></>}</svg>;
}
export default function Leop({ mision, diseno, estetica, estado, setEstado, alTerminar, alHangar }) {
  const t = useT();
  const cfg = useMemo(() => configurarLeop(mision), [mision]);
  const [juego, setJuego] = useState(() => crearLeop(cfg, Math.random, estado));
  const { espectador, espectadorRef } = useEspejo({ fase: 'leop', s: juego, setS: setJuego });
  const aplicado = useRef(false), sonidoAnterior = useRef(null), reloj = useRef(0);
  const enviar = useCallback(a => { if (a.tipo === 'pulsar') sonidos.leop(a.sistema); setJuego(s => pasoLeop(s, a, cfg)); }, [cfg]);
  const sistemas = SISTEMAS_LEOP.map((s, i) => i === 0 && diseno.energia === 'rtg' ? { ...s, nombre: t('e03.Leop.check_rtg'), corto: 'RTG', detalle: t('e03.Leop.check_the_generator_s_power_it') } : { ...s, nombre: t(`e03.sistema.${s.id}.nombre`), corto: t(`e03.sistema.${s.id}.corto`), detalle: t(`e03.sistema.${s.id}.detalle`) });
  const pulso = pulsoLeop(juego, cfg), activo = juego.fase === 'muestra' ? pulso : juego.fase === 'entrada' && juego.tiempo < .35 ? juego.ultimo : juego.fase === 'automatico' ? Math.min(2, Math.floor(juego.tiempo)) : null;
  const enJuego = ['automatico', 'muestra', 'entrada'].includes(juego.fase);
  useEffect(() => {
    if (!enJuego || espectador) return;
    let anterior = performance.now();
    const id = setInterval(() => { const ahora = performance.now(); enviar({ tipo: 'tiempo', dt: (ahora - anterior) / 1000 }); anterior = ahora; reloj.current += .08; }, 80);
    return () => clearInterval(id);
  }, [enJuego, espectador, enviar]);
  useEffect(() => { if (juego.fase === 'muestra' && activo !== null && activo !== sonidoAnterior.current) sonidos.leop(activo); sonidoAnterior.current = activo; }, [activo, juego.fase]);
  useEffect(() => { if (['perdida', 'falloauto'].includes(juego.fase)) sonidos.fallo(); if (juego.fase === 'exito') sonidos.exito(); }, [juego.fase]);
  useEffect(() => {
    if (espectador) return undefined;
    const tecla = e => { if (e.repeat || e.target.matches?.('input,select,textarea')) return;
      if (['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code) && juego.fase === 'entrada') { e.preventDefault(); enviar({ tipo: 'pulsar', sistema: Number(e.code.at(-1)) - 1 }); }
      if (['Escape', 'KeyP'].includes(e.code) && enJuego) { e.preventDefault(); enviar({ tipo: 'pausar' }); }
    };
    const pausar = () => { if (!espectadorRef.current) enviar({ tipo: 'pausar' }); }, ocultar = () => { if (document.hidden) pausar(); };
    window.addEventListener('keydown', tecla); window.addEventListener('blur', pausar); document.addEventListener('visibilitychange', ocultar);
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('blur', pausar); document.removeEventListener('visibilitychange', ocultar); };
  }, [enJuego, espectador, espectadorRef, juego.fase, enviar]);
  const continuar = () => { if (juego.fase !== 'exito' || aplicado.current) return; aplicado.current = true; setEstado(e => aplicarLeop(e, juego)); alTerminar(); };
  const manual = () => enviar({ tipo: 'manual' });
  return <section className={`leop leop-${juego.fase}`} data-fase={juego.fase} data-ronda={juego.ronda} data-rondas={juego.rondas} data-pulso={pulso ?? ''} data-entrada={juego.indice} data-bateria={juego.bateria} aria-label={t('e03.Leop.leop_deployment_and_manual_recovery')}>
    <header className="leop-header"><div><span>{t('e03.Leop.03_deployment_and_link')}</span><h1>{t('e03.Leop.wake_up_your_probe')}<em>LEOP</em></h1></div><button disabled={!enJuego} onClick={() => enviar({ tipo: 'pausar' })} aria-label={t('e03.Leop.pause_sequence')}>Ⅱ</button></header>
    <div className="leop-cuerpo"><div className="leop-visor"><VistaSonda {...{ diseno, estetica, reloj, activa: activo }} activados={juego.activados} perdido={['perdida', 'falloauto'].includes(juego.fase)} /><div className="leop-estado-enlace"><i />{['perdida', 'falloauto'].includes(juego.fase) ? t('e03.Leop.recovery_required') : juego.fase === 'exito' ? t('e03.Leop.stable_link') : t('e03.Leop.onboard_sequencer')}</div><div className="leop-sistemas">{sistemas.map((s, i) => <span key={s.id} className={juego.activados.includes(i) ? 'verificado' : ''}><b>{juego.activados.includes(i) ? '✓' : '○'}</b>{s.corto}</span>)}</div></div>
    <div className="leop-consola"><div className="leop-indicadores"><div><span>{t('e03.Leop.battery')}</span><strong>{Math.round(juego.bateria / juego.bateriaMax * 100)}<small>%</small></strong></div><div><span>{t('e03.Leop.recovery')}</span><strong>{juego.intentos ? juego.ronda + 1 : '—'}<small>{juego.intentos ? ` / ${juego.rondas}` : ''}</small></strong></div><div><span>{t('e03.Leop.attempts')}</span><strong>{juego.intentos}</strong></div></div>
    {juego.fase === 'listo' && <><DialogoIO titulo={t('e03.Leop.first_let_the_spacecraft_try')} accion={t('e03.Leop.start_automatic_deployment')} alSeguir={() => enviar({ tipo: 'empezar' })}><p>{t('e03.Leop.the_computer_deploys_the_systems_and')}</p><p>{t('e03.Leop.if_it_fails_i_will_guide')}<b>{t('e03.Leop.1_battery')}</b>.</p></DialogoIO><details className="leop-nota"><summary>{t('e03.Leop.rules_of_this_simulation')}</summary><p>{t('e03.Leop.automatic_failure')}{Math.round(cfg.falloAutomatico * 100)}{t('e03.Leop.recovery_101')}{cfg.minimoRondas}–{cfg.rondas}{t('e03.Leop.stages_these_are_game_rules_not')}</p></details></>}
    {juego.fase === 'automatico' && <DialogoIO titulo={t('e03.Leop.automatic_sequence_in_progress')}><p>{sistemas[Math.min(2, Math.floor(juego.tiempo))].nombre}{t('e03.Leop.i_am_checking_telemetry')}</p><div className="leop-auto-progreso"><i style={{ width: `${Math.min(100, juego.tiempo / 4 * 100)}%` }} /></div></DialogoIO>}
    {juego.fase === 'falloauto' && <DialogoIO alerta titulo={t('e03.Leop.automatic_deployment_failed')} accion={t('e03.Leop.start_manual_recovery')} alSeguir={manual}><p>{t('e03.Leop.we_did_not_receive_all_confirmations')}<b>{juego.rondas}{t('e03.Leop.stages')}</b>.</p><p>{t('e03.Leop.watch_the_lights_and_repeat_their')}<b>1, 2, 3</b>{t('e03.Leop.or_by_tapping_the_controls_each')}<b>{t('e03.Leop.2_battery')}</b>{t('e03.Leop.it_uses_no_fuel')}</p></DialogoIO>}
    {juego.fase === 'confirmada' && <DialogoIO alerta titulo={t('e03.Leop.it_has_not_worked_yet_let')} accion={t('e03.Leop.continue_recovery')} alSeguir={manual}><p><b>{t('e03.Leop.you_repeated_the_sequence_correctly')}</b>{t('e03.Leop.the_system_has_not_confirmed_full')}</p><p>{t('e03.Leop.next_stage')}{juego.ronda + 2}{t('e03.Leop.of')}{juego.rondas}{t('e03.Leop.cost_2_battery_time_is_paused')}</p></DialogoIO>}
    {['muestra', 'entrada', 'pausa'].includes(juego.fase) && <><div className="leop-mensaje" role="status"><span>{juego.fase === 'entrada' ? t('e03.Leop.your_turn_repeat') : t('e03.Leop.watch_remember')}</span><h2>{juego.fase === 'entrada' ? t('e03.Leop.repeat_the_order_of_the_lights') : pulso === null ? t('e03.Leop.watch_the_sequence') : sistemas[pulso].nombre}</h2></div><div className="leop-pasos">{Array.from({ length: juego.ronda + 3 }, (_, i) => <i key={i} className={juego.fase === 'entrada' && i < juego.indice ? 'hecho' : ''} />)}</div><div className="leop-temporizador"><div style={{ width: `${juego.fase === 'entrada' ? juego.restante / limiteRespuesta(cfg, juego.ronda) * 100 : 100}%` }} /></div></>}
    {juego.fase !== 'exito' && <div className="leop-botones">{sistemas.map((s, i) => <button key={s.id} data-sistema={i} style={{ '--sistema': s.color }} className={activo === i ? 'encendido' : ''} disabled={juego.fase !== 'entrada'} onClick={() => enviar({ tipo: 'pulsar', sistema: i })}><kbd>0{i + 1}</kbd><span className="leop-icono"><IconoSistema sistema={i} /></span><strong>{s.corto}</strong><small>{[t('e03.Leop.power'), t('e03.Leop.communications'), t('e03.Leop.attitude')][i]}</small><span className="leop-led" /></button>)}</div>}
    {juego.fase === 'entrada' && <p className="leop-instruccion">{juego.restante.toFixed(1)}{t('e03.Leop.s_for_the_next_command_keys')}</p>}
    {juego.fase === 'perdida' && <DialogoIO alerta titulo={t('e03.Leop.the_link_needs_another_attempt')} accion={t('e03.Leop.retry_this_stage')} alSeguir={manual}><p>{juego.motivo === 'tiempo' ? t('e03.Leop.response_time_ran_out') : t('e03.Leop.that_command_does_not_match_the')}{t('e03.Leop.we_will_repeat_this_stage_without')}</p><p>{t('e03.Leop.new_attempt_2_battery_the_energy')}</p></DialogoIO>}
    {juego.fase === 'sinenergia' && <DialogoIO alerta titulo={t('e03.Leop.not_enough_power_for_another_attempt')} accion={t('e03.Leop.return_to_hangar')} alSeguir={alHangar}><p>{t('e03.Leop.we_need_to_review_the_equipment')}</p></DialogoIO>}
    {juego.fase === 'exito' && <DialogoIO titulo={juego.falloAutomatico ? t('e03.Leop.recovery_complete') : t('e03.Leop.automatic_deployment_complete')} accion={t('e03.Leop.continue_to_cruise')} alSeguir={continuar}><p>{juego.falloAutomatico ? t('e03.Leop.your_commands_recovered_all_systems') : t('e03.Leop.the_spacecraft_handled_it_on_its')}{t('e03.Leop.power_antenna_and_attitude_confirmed')}</p><p>{t('e03.Leop.total_used')}{Math.round(juego.gastado)}{t('e03.Leop.wh_fuel_preserved')}</p></DialogoIO>}
    </div></div>{juego.fase === 'pausa' && <div className="leop-pausa-overlay"><div><h2>{t('e03.Leop.sequence_paused')}</h2><p>{t('e03.Leop.your_position_and_resources_are_preserved')}</p><button className="primario" onClick={() => enviar({ tipo: 'reanudar' })}>{t('e03.Leop.resume_sequence')}</button></div></div>}
  </section>;
}
