/* js/main.js - Gestión de autenticación y CRUD de tareas usando localStorage */

const STORAGE_KEYS = {
    USERS: 'gt_users',
    SESS: 'gt_session',
    TASKS: 'gt_tasks'
};

function readStorage(key) {
    return JSON.parse(localStorage.getItem(key) || 'null');
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/* --- Auth helpers --- */
function getUsers() {
    return readStorage(STORAGE_KEYS.USERS) || [];
}

function saveUser(user) {
    const users = getUsers();
    users.push(user);
    writeStorage(STORAGE_KEYS.USERS, users);
}

function setSession(email) {
    writeStorage(STORAGE_KEYS.SESS, { email });
}

function getSession() {
    return readStorage(STORAGE_KEYS.SESS);
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.SESS);
    window.location.href = 'index.html';
}

/* --- Tasks helpers --- */
function getTasks() {
    return readStorage(STORAGE_KEYS.TASKS) || [];
}

function saveTasks(tasks) {
    writeStorage(STORAGE_KEYS.TASKS, tasks);
}

function createTask(task) {
    const tasks = getTasks();
    task.id = Date.now();
    tasks.push(task);
    saveTasks(tasks);
    return task;
}

function updateTask(updated) {
    const tasks = getTasks().map(t => t.id === updated.id ? updated : t);
    saveTasks(tasks);
}

function deleteTask(id) {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
}

function findTask(id) {
    return getTasks().find(t => t.id === id);
}

/* --- Render / Page specific logic --- */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();

    if (path === '' || path === 'index.html') initLoginPage();
    if (path === 'register.html') initRegisterPage();
    if (path === 'dashboard.html') initDashboardPage();
    if (path === 'create-task.html') initCreateTaskPage();
    if (path === 'view-task.html') initViewTaskPage();
    if (path === 'edit-task.html') initEditTaskPage();

    // Common: attach logout links/buttons if present
    document.querySelectorAll('.logout-btn').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); logout(); }));
});

/* -------- Login Page -------- */
function initLoginPage(){
    const form = document.querySelector('form[action="dashboard.html"]') || document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('#email')?.value?.trim();
        const password = form.querySelector('#password')?.value || '';
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            setSession(user.email);
            window.location.href = 'dashboard.html';
        } else {
            alert('Credenciales inválidas. Si no tienes cuenta regístrate.');
        }
    });
}


/* -------- Register Page -------- */
function initRegisterPage(){
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = form.querySelector('#name')?.value?.trim();
        const email = form.querySelector('#email')?.value?.trim();
        const password = form.querySelector('#password')?.value || '';
        const role = form.querySelector('#role')?.value || 'estudiante';

        if (!name || !email || !password) {
            alert('Completa todos los campos.');
            return;
        }

        const exists = getUsers().some(u => u.email === email);
        if (exists) {
            alert('Ya existe una cuenta con ese correo.');
            return;
        }

        saveUser({ name, email, password, role });
        setSession(email);
        window.location.href = 'dashboard.html';
    });
}


/* -------- Dashboard Page -------- */
function initDashboardPage(){
    const sess = getSession();
    if (!sess) { window.location.href = 'index.html'; return; }

    const users = getUsers();
    const me = users.find(u => u.email === sess.email) || { name: 'Usuario' };
    document.querySelector('header h2') && (document.querySelector('header h2').textContent = `Bienvenido, ${me.name}`);

    renderTasksTable();

    // Attach create-task link is normal anchor, logout handled globally if link has class
}

function renderTasksTable(){
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    const tasks = getTasks();
    tbody.innerHTML = '';
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No hay tareas aún. Crea una.</td></tr>';
        return;
    }
    tasks.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Título">${escapeHtml(t.title)}</td>
            <td data-label="Fecha">${escapeHtml(t.due_date)}</td>
            <td data-label="Estado">${escapeHtml(t.status)}</td>
            <td data-label="Acciones" class="actions">
                <a href="view-task.html?id=${t.id}" class="btn btn-ghost">Ver</a>
                <a href="edit-task.html?id=${t.id}" class="btn btn-ghost">Editar</a>
                <button data-id="${t.id}" class="btn" style="background:#ef4444;border-radius:8px">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // attach delete handlers
    // botones eliminar (ahora son <button> en actions)
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = Number(btn.getAttribute('data-id'));
            if (confirm('¿Seguro que deseas eliminar esta tarea?')) {
                deleteTask(id);
                renderTasksTable();
            }
        });
    });
}


/* -------- Create Task Page -------- */
function initCreateTaskPage(){
    const form = document.getElementById('createTaskForm');
    const sess = getSession();
    if (!sess) { window.location.href = 'index.html'; return; }
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = form.querySelector('#title')?.value?.trim();
        const description = form.querySelector('#description')?.value?.trim();
        const due_date = form.querySelector('#due_date')?.value || '';
        const status = form.querySelector('#status')?.value || 'Pendiente';
        if (!title || !due_date) { alert('Título y fecha de entrega son obligatorios.'); return; }
        createTask({ title, description, due_date, status, owner: sess.email });
        window.location.href = 'dashboard.html';
    });
}


/* -------- View Task Page -------- */
function initViewTaskPage(){
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('id')) || null;
    if (!id) return;
    const task = findTask(id);
    if (!task) return;
    document.querySelector('.task-view h2') && (document.querySelector('.task-view h2').textContent = task.title);
    document.querySelector('.task-view p strong') && null; // noop keep structure
    // fill details
    const html = `
        <p><strong>Fecha de entrega:</strong> ${escapeHtml(task.due_date)}</p>
        <p><strong>Estado:</strong> ${escapeHtml(task.status)}</p>
        <p><strong>Descripción:</strong> ${escapeHtml(task.description || '')}</p>
    `;
    document.querySelector('.task-view')?.insertAdjacentHTML('afterbegin', html);
}


/* -------- Edit Task Page -------- */
function initEditTaskPage(){
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('id')) || null;
    const form = document.getElementById('editTaskForm');
    if (!form || !id) return;
    const task = findTask(id);
    if (!task) return;
    form.querySelector('input[name="task_id"]') && (form.querySelector('input[name="task_id"]').value = task.id);
    form.querySelector('#title').value = task.title;
    form.querySelector('#description').value = task.description || '';
    form.querySelector('#due_date').value = task.due_date;
    form.querySelector('#status').value = task.status;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const updated = {
            id: task.id,
            title: form.querySelector('#title').value.trim(),
            description: form.querySelector('#description').value.trim(),
            due_date: form.querySelector('#due_date').value,
            status: form.querySelector('#status').value,
            owner: task.owner
        };
        if (!updated.title || !updated.due_date) { alert('Título y fecha obligatorios.'); return; }
        updateTask(updated);
        window.location.href = 'dashboard.html';
    });
}


/* --- Small helpers --- */
function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

}

/* Exponer logout en consola para pruebas rápidas */
window.appLogout = logout;



