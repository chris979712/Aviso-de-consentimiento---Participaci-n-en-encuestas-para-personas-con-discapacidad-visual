function enfocarSeccion() {
  if (!window.location.hash) return;

  let id;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }

  const destino = document.getElementById(id);
  if (destino && destino.getAttribute('tabindex') === '-1') {
    destino.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', enfocarSeccion);
enfocarSeccion();


const form = document.getElementById('consentimiento-form');
const enviar = document.getElementById('enviar');
const estado = document.getElementById('form-status');
let envioEnCurso = false;

function mostrarEstado(mensaje, tipo) {
  estado.textContent = mensaje;
  estado.dataset.tipo = tipo;
  estado.focus({ preventScroll: true });
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (envioEnCurso || !form.reportValidity()) return;

  const nombre = form.elements.namedItem('nombre');
  if (!nombre.value.trim()) {
    mostrarEstado('Escriba su nombre para continuar.', 'error');
    nombre.focus();
    return;
  }

  const datos = new FormData(form);
  const clave = String(datos.get('access_key') || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clave)) {
    mostrarEstado('El envío aún no está habilitado. Contacte al investigador para registrar su decisión.', 'error');
    return;
  }

  datos.set('access_key', clave);
  datos.set('nombre', nombre.value.trim());
  for (const campo of ['copia', 'privacidad', 'retiro']) {
    datos.set(campo, form.elements.namedItem(campo).checked ? 'Sí' : 'No');
  }
  datos.set('fecha_registro', new Date().toISOString());

  envioEnCurso = true;
  enviar.disabled = true;
  enviar.textContent = 'Enviando…';
  form.setAttribute('aria-busy', 'true');
  mostrarEstado('Enviando su decisión. Espere la confirmación.', 'enviando');

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 20000);
  try {
    const respuesta = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(datos)),
      signal: controlador.signal
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok || resultado.success !== true) throw new Error('Envío rechazado');

    form.reset();
    mostrarEstado('Su decisión se envió correctamente al investigador. Gracias. El investigador le proporcionará su número de participante por separado, si corresponde.', 'exito');
  } catch {
    mostrarEstado('No pudimos confirmar el envío. Sus respuestas siguen en el formulario. Revise su conexión y contacte al investigador antes de volver a enviar, para evitar un registro duplicado.', 'error');
  } finally {
    clearTimeout(limite);
    envioEnCurso = false;
    enviar.disabled = false;
    enviar.textContent = 'Enviar mi decisión';
    form.removeAttribute('aria-busy');
  }
});
