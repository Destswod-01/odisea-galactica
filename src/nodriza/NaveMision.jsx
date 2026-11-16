import catalogo from '../datos/nodrizas.json';
import Nodriza3D from './Nodriza3D.jsx';
import NaveEstudio from '../tres/NaveEstudio.jsx';

// El manifiesto del taller acompaña a la misma nave durante separación y órbita.
export default function NaveMision({ diseno, despliegue = 1, motor = false, girar = false, ...props }) {
  const modelo = catalogo.modelos.find(n => n.id === diseno.nodriza);
  if (!modelo) return <NaveEstudio {...props} {...{ diseno, despliegue, motor, girar }} />;
  const { estetica: _estetica, orientacionAntena: _antena, rastreadores: _rastreadores, ...grupo } = props;
  return <group {...grupo}><Nodriza3D modelo={modelo.id} configuracion3D={modelo.configuracion_3d} colorCasco={modelo.casco} colorAcento={modelo.acento} desplegado={despliegue} propulsionActiva={motor} bahiaAbierta={false} girar={girar} scale={.55} /></group>;
}
