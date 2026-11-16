// ¿El navegador puede dibujar 3D? Si no, el juego usa los dibujos 2D de respaldo.
let webgl = null;
export function soportaWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { webgl = false; }
  return webgl;
}
