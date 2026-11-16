export default {
  'tutorial.jugador': "Piloto",
  'tutorial.preparando': "Preparando visor…",
  'tutorial.pendientes': "Ver qué falta para lanzar",
  'tutorial.avisos': "Avisos de diseño",
  'tutorial.noMostrar': "No mostrar más consejos",
  'tutorial.reactivar': "Mostrar consejos de la directora e IO",
  'tutorial.desactivar': "Ocultar consejos de la directora e IO",
  'tutorial.pistaEtiqueta': "Pista de Novato",
  'tutorial.siguientePista': "Otra pista ›",
  'tutorial.cerrarIO': "Cerrar aviso de IO",
  'tutorial.abrirIO': "Abrir consejo de IO",
  'tutorial.ioNombre': "IO · Asistente",
  'tutorial.saludoEquipo': "{nombre}, {rol}: ",
  'tutorial.tuRolAviso': "Tu rol en red ({rol}): vigila tu área mientras {dueno} dirige esta fase.",

  // Briefing y Hangar
  'tutorial.briefing.io1': "Lee las páginas con ‹ › o las flechas y voltea las 3 tarjetas de objetivos para ver qué sensores exige NASA.",
  'tutorial.briefing.io2': "Pista exacta: en LRO o Juno elige Novato si quieres guías más frecuentes y márgenes de vuelo más amplios.",
  'tutorial.hangar.titulo': "Arma tu nave en el hangar",
  'tutorial.hangar.1': "{nombre}, empecemos por el lanzador. En NASA, la masa total nunca debe superar la capacidad del cohete en órbita de transferencia. En la estación Cohete, elige un lanzador con margen suficiente.",
  'tutorial.hangar.2': "En Combustible eliges el propelente para corregir la trayectoria y frenar al llegar (Δv). En Blindaje proteges la electrónica contra radiación real del espacio profundo.",
  'tutorial.hangar.3': "En Energía eliges paneles solares (pierden fuerza lejos del Sol) o RTG (constante como en Juno/Voyager). En Sistemas van batería, computadora y control de orientación.",
  'tutorial.hangar.4': "En Ciencia instalas instrumentos que generan datos; la Antena los baja a través de la Red de Espacio Profundo (DSN). Si la antena es pequeña, perderás parte de la ciencia.",
  'tutorial.hangar.5': "En Órbita decides la altura científica contra el consumo de combustible, y en Estilo personalizas tu nave y parche antes del vuelo.",
  'tutorial.hangar.6': "Antes de salir a la plataforma, revisa qué falta para lanzar: masa, presupuesto, tiempo de desarrollo, energía, Δv y requisitos de NASA.",
  'tutorial.hangar.pista': "Empieza instalando Cohete, Combustible, Energía, Antena, Blindaje e Instrumentos. Usa «Simulación rápida» abajo a la izquierda para comprobar el puntaje antes de lanzar.",
  'tutorial.hangar.respuesta': "Recibido, directora. Voy a revisar la capacidad del cohete, instalar los componentes y resolver los pendientes antes de salir a la plataforma.",
  'tutorial.hangar.accion': "Entrar al hangar",

  // Revisión de diseño (proceso NASA antes de lanzar)
  'tutorial.revision.titulo': "Revisión de diseño (CDR)",
  'tutorial.revision.1': "{nombre}, antes de autorizar un lanzamiento real, NASA verifica cada requisito técnico con una prueba o análisis independiente. Si algo falla aquí, aún puedes volver al hangar sin costo.",
  'tutorial.revision.pista': "Asegúrate de tener en verde masa, energía, Δv y enlace de antena; si falla un requisito de ciencia o datos, vuelve al hangar y ajusta sensores o antena.",
  'tutorial.revision.io1': "Verifica cuántos requisitos están en ✓ antes de autorizar el despegue.",

  // 02 Lanzamiento y separación
  'tutorial.lanzamiento.titulo': "Despega hacia el espacio",
  'tutorial.lanzamiento.1': "{nombre}, durante el ascenso real el vehículo sigue un corredor estrecho para vencer la gravedad y la atmósfera (Max-Q) sin gastar propelente extra. Supera al menos {minimo} de {total} aros.",
  'tutorial.lanzamiento.2': "Sigue la cuenta regresiva y guía el cohete con WASD, las flechas o los controles táctiles. Q/E (o el control de empuje) bajan y suben el empuje: redúcelo al 65% en Max-Q. ESPACIO separa las etapas cuando se enciende la alerta, y C cambia la cámara. P o Esc pausan.",
  'tutorial.lanzamiento.pista': "Pista exacta: toques cortos de WASD/flechas, empuje al 65% mientras dure la alerta de Max-Q, separa cada etapa en cuanto aparezca el aviso y recuerda que necesitas {minimo} de {total} aros.",
  'tutorial.lanzamiento.respuesta': "Recibido, directora. Voy a mantener la mira centrada y a avisarle al equipo cuando completemos el ascenso.",
  'tutorial.lanzamiento.accion': "Iniciar lanzamiento",
  'tutorial.lanzamiento.ventana': "¿Qué es una ventana de lanzamiento?",
  'tutorial.lanzamiento.ventanaTexto': "Es el periodo en que la posición del destino favorece la trayectoria. En esta práctica ya está elegida y entrenamos el guiado con aros virtuales y tiempos comprimidos.",
  'tutorial.lanzamiento.io1': "Centra la mira verde en cada aro y suelta las teclas al alinear.",
  'tutorial.lanzamiento.io2': "Si fallas un aro, sigue al próximo: cada desvío cuesta 12 m/s de Δv al aprobar.",

  'tutorial.separacion.titulo': "Separación de la sonda",
  'tutorial.separacion.1': "{nombre}, ya estamos en órbita. En vuelo real, los pernos pirotécnicos y los resortes liberan la sonda y después se despliegan paneles, antena y propulsores. Ejecuta los cinco pasos uno por uno.",
  'tutorial.separacion.pista': "Pulsa el botón de cada paso (o ESPACIO) y espera a que llegue al 100% antes del siguiente.",
  'tutorial.separacion.respuesta': "Recibido, directora. Voy a ejecutar la secuencia de despliegue paso a paso.",
  'tutorial.separacion.accion': "Iniciar el despliegue",

  // 03 LEOP
  'tutorial.leop.titulo': "Puesta en marcha de la sonda (LEOP)",
  'tutorial.leop.1': "{nombre}, tras separarse del cohete la sonda entra en LEOP: despliega paneles y antena y calibra el rastreador estelar para orientarse y hablar con la Tierra.",
  'tutorial.leop.pista': "Si el encendido automático falla, memoriza el orden exacto de las 3 luces y repítelo con las teclas 1, 2 y 3 (o los botones en pantalla).",
  'tutorial.leop.respuesta': "Recibido, directora. Vigilaré la secuencia y recuperaré el enlace si hace falta.",
  'tutorial.leop.accion': "Preparar la puesta en marcha",
  'tutorial.leop.io1': "Atento al orden de las 3 luces si algún subsistema pide reinicio.",
  'tutorial.leop.io2': "Usa teclas 1, 2 y 3 para responder rápido sin perder el enlace.",

  // 04 Red de drones
  'tutorial.crucero.titulo': "Despliegue de drones",
  'tutorial.crucero.1': "{nombre}, igual que misiones multipunto o CubeSats secundarios, cada dron requiere un ángulo preciso y el impulso justo para quedar en órbita sin colisionar.",
  'tutorial.crucero.pista': "Espera a que la barra de impulso entre en la zona verde, apunta hacia el aro verde vacío y pulsa ESPACIO para soltar el dron.",
  'tutorial.crucero.respuesta': "Recibido, directora. Revisaré la bahía y la trayectoria antes de cada lanzamiento.",
  'tutorial.crucero.accion': "Abrir la bahía",
  'tutorial.crucero.io1': "Suelta el dron con ESPACIO cuando el indicador cruce la franja verde.",
  'tutorial.crucero.io2': "Evita chocar con drones ya desplegados buscando el siguiente aro libre.",

  // Llegada
  'tutorial.llegada.titulo': "Aproximación orbital",
  'tutorial.llegada.1': "{nombre}, en NASA el encendido de inserción en periapsis frena la sonda para que la gravedad del planeta o luna la capture en lugar de seguir de largo.",
  'tutorial.llegada.pista': "Mantén ESPACIO cerca del punto más cercano y suelta justo cuando la órbita naranja entre al anillo verde.",
  'tutorial.llegada.respuesta': "Recibido, directora. Voy a vigilar la órbita prevista mientras freno.",
  'tutorial.llegada.accion': "Preparar aproximación",
  'tutorial.llegada.io1': "Frena con ESPACIO en el periapsis hasta alinear la órbita con el anillo verde.",
  'tutorial.llegada.io2': "Si frenas de más o muy poco, perderás margen de combustible.",

  // 05 Encuentro
  'tutorial.encuentro.titulo': "Reconocimiento de cerca",
  'tutorial.encuentro.1': "{nombre}, como en los sobrevuelos de Dawn o OSIRIS-REx, debes acercarte lo justo y encuadrar el objetivo antes de disparar la cámara científica de alta resolución.",
  'tutorial.encuentro.pista': "Usa el minimapa para acercarte al objetivo pedido, encuádralo en el visor y pulsa ESPACIO (o «Foto») cuando el indicador esté en verde.",
  'tutorial.encuentro.respuesta': "Recibido, directora. Voy a localizar el objetivo y encuadrarlo antes de tomar la foto.",
  'tutorial.encuentro.accion': "Preparar reconocimiento",
  'tutorial.encuentro.io1': "Sigue el minimapa hasta el blanco y abre la cámara con ESPACIO.",
  'tutorial.encuentro.io2': "Completa todos los encargos manteniendo distancia segura para lograr combos.",

  // 06 Inserción / Minisonda
  'tutorial.insercion.titulo': "Inserción y observación con minisonda",
  'tutorial.insercion.1': "{nombre}, en órbita baja la sonda esquiva fragmentos rocosos y aprovecha ventanas breves de visibilidad para capturar imágenes científicas válidas.",
  'tutorial.insercion.pista': "Esquiva lateralmente con A/D o flechas sin soltar la vista del objeto y pulsa ESPACIO (una vez por objeto) apenas se abra el aro verde de captura.",
  'tutorial.insercion.respuesta': "Recibido, directora. Voy a seguir el objetivo y capturarlo en cuanto aparezca el aro verde.",
  'tutorial.insercion.accion': "Preparar minisonda",
  'tutorial.insercion.io1': "Esquiva con A/D o flechas; pulsa ESPACIO una vez cuando veas el aro verde.",
  'tutorial.insercion.io2': "No dejes ESPACIO presionado: cada fotografía científica requiere una pulsación nueva.",

  // 07 Bajada de datos (Tetris DSN)
  'tutorial.operacion.titulo': "Bajada de datos",
  'tutorial.operacion.1': "{nombre}, los instrumentos llenan la memoria de a bordo y solo puedes vaciarla cuando la Red de Espacio Profundo (Goldstone, Madrid y Canberra) recibe líneas completas.",
  'tutorial.operacion.pista': "Es Tetris: encaja las piezas en el tablero de 10×20 y cada línea completa se descarga a Tierra. En equipo, cada pieza la maneja un jugador distinto, por turnos. Si una pieza nueva no cabe, la memoria se desborda.",
  'tutorial.operacion.respuesta': "Recibido, directora. Voy a encajar los paquetes y bajar líneas antes de llenar la memoria.",
  'tutorial.operacion.accion': "Iniciar bajada de datos",
  'tutorial.operacion.io1': "Mueve con ← →, rota con ↑ o X, baja con ↓ y deja caer de golpe con Espacio. En el celular usa los botones de abajo.",
  'tutorial.operacion.io2': "Bajar varias líneas a la vez multiplica el envío. Mira el recuadro de al lado: ahí está la pieza siguiente y a quién le toca.",

  // Operación clásica
  'tutorial.operacion_clasica.titulo': "Pasadas científicas",
  'tutorial.operacion_clasica.1': "{nombre}, en pasadas orbitales rápidas los sensores recogen ciencia que debes bajar en las ventanas de visibilidad hacia la Tierra.",
  'tutorial.operacion_clasica.pista': "Pulsa el número del sensor cuando el objetivo cruce la mira y transmite en los tramos verdes antes de llenar la memoria.",
  'tutorial.operacion_clasica.respuesta': "Recibido, directora. Voy a vigilar los objetivos y mantener espacio para los datos.",
  'tutorial.operacion_clasica.accion': "Preparar pasadas científicas",
  'tutorial.operacion_clasica.io1': "Activa el sensor correcto sobre el blanco y descarga datos en los tramos verdes.",
  'tutorial.operacion_clasica.io2': "Vigila que la memoria no se sature o perderás las lecturas nuevas.",

  // 08 Decisiones de misión (Reigns)
  'tutorial.extendida.titulo': "Decisiones de misión",
  'tutorial.extendida.1': "{nombre}, en la misión extendida cada año llega un evento real (eclipse, tormenta solar, micrometeoroide o revisión de presupuesto) antes de decidir la disposición final de la sonda.",
  'tutorial.extendida.pista': "Desliza la carta a izquierda o derecha (o usa ← →): los puntos sobre Energía, Térmica, Propelente y Ciencia muestran qué sistemas cambiarán.",
  'tutorial.extendida.respuesta': "Recibido, directora. Evaluaré cada carta pensando en los márgenes reales de la sonda.",
  'tutorial.extendida.accion': "Abrir mazo de decisiones",
  'tutorial.extendida.io1': "Equilibra Energía, Térmica, Propelente y Ciencia: que ninguna barra crítica caiga a 0 %.",
  'tutorial.extendida.io2': "Al final decide cómo retirar la sonda (p. ej., hundir Juno en Júpiter para proteger Europa).",

  // Informe final
  'tutorial.informe.titulo': "Balance de misión",
  'tutorial.informe.exito': "{nombre}, misión evaluada: revisa abajo los 4 segmentos de NASA (lanzamiento, espacio, Tierra con la DSN y usuarios) y compara tu nave con la sonda real.",
  'tutorial.informe.perdida': "{nombre}, la misión se perdió antes de completar los objetivos: revisa qué recurso falló primero en la tabla de causa y efecto para corregirlo en el hangar.",
  'tutorial.informe.pista': "Compara tu masa, energía y enlace de antena contra la sonda real para ganar medalla de Oro o Nivel JPL en tu próximo intento.",
  'tutorial.informe.io1': "Revisa «¿Por qué salió así?» y «Comparar intentos» antes de volver al hangar.",
  'tutorial.informe.io2': "Si bajaste menos del 100 % de ciencia, prueba una antena mayor o ajusta instrumentos en el hangar.",
};
