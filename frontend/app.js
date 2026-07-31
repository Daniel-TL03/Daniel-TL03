// Cambia esta URL por la de tu backend en Render una vez desplegado
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api/tareas';

const form = document.getElementById('form-tarea');
const input = document.getElementById('input-tarea');
const filtro = document.getElementById('input-filtro');
const lista = document.getElementById('lista-tareas');

let tareas = [];

async function cargarTareas(q = '') {
  const url = q ? `${API_URL}?q=${encodeURIComponent(q)}` : API_URL;
  const res = await fetch(url);
  tareas = await res.json();
  renderizar();
}

function renderizar() {
  lista.innerHTML = '';
  tareas.forEach(t => {
    const li = document.createElement('li');
    if (t.completada) li.classList.add('completada');

    const span = document.createElement('span');
    span.textContent = t.titulo;
    span.onclick = () => toggleCompletada(t);

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = '🗑️';
    btnEliminar.className = 'eliminar';
    btnEliminar.onclick = () => eliminarTarea(t.id);

    li.append(span, btnEliminar);
    lista.appendChild(li);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = input.value.trim();
  if (!titulo) return;
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo }),
  });
  input.value = '';
  cargarTareas(filtro.value);
});

async function toggleCompletada(tarea) {
  await fetch(`${API_URL}/${tarea.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completada: !tarea.completada }),
  });
  cargarTareas(filtro.value);
}

async function eliminarTarea(id) {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  cargarTareas(filtro.value);
}

// Filtro en tiempo real (sin recargar toda la página, solo re-consulta)
let debounce;
filtro.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => cargarTareas(filtro.value), 250);
});

cargarTareas();
