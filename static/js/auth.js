// Apuntamos al servidor local de tu API en Cloudflare Workers
const API_URL = 'https://api-puenteviejo.thericworld330.workers.dev';

// ===================================================================
// == FUNCIÓN GLOBAL DE PETICIONES (USADA POR TODOS LOS DEMÁS MÓDULOS)
// ===================================================================
// Agrega el Token JWT automáticamente a las consultas para no repetir código
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Si la API dice que el token es inválido o expiró, cerramos sesión a la fuerza
    if (response.status === 401 && !endpoint.includes('/api/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/templates/login.html';
        throw new Error('Sesión expirada o inválida');
    }

    return response;
}

// ==========================================
// == LÓGICA DEL MENÚ DESPLEGABLE (BUG 1) ==
// ==========================================
// Lo definimos en window para que el onclick del HTML lo encuentre
window.toggleUserMenu = function() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('mostrar');
    }
};

// Cerrar el menú desplegable si el usuario hace clic fuera de él
window.addEventListener('click', function(e) {
    if (!e.target.closest('.user-menu-container')) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown && dropdown.classList.contains('mostrar')) {
            dropdown.classList.remove('mostrar');
        }
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // ==========================================
    // 1. LÓGICA DE INICIO DE SESIÓN
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const errorText = document.getElementById('login-error-text');

            errorDiv.style.display = 'none';
            const btn = loginForm.querySelector('button');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
            btn.disabled = true;

            try {
                // Hacemos la petición directa al Login (sin token aún)
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Redirección corregida usando la ruta absoluta hacia templates
                    window.location.href = '/templates/index.html';
                } else {
                    errorText.textContent = data.error || 'Credenciales incorrectas';
                    errorDiv.style.display = 'block';
                    btn.innerHTML = 'Ingresar al Sistema <i class="fas fa-arrow-right"></i>';
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Error al conectar con la API:", error);
                errorText.textContent = 'Error al conectar con el servidor. Verifica que la API esté corriendo en el puerto 8787.';
                errorDiv.style.display = 'block';
                btn.innerHTML = 'Ingresar al Sistema <i class="fas fa-arrow-right"></i>';
                btn.disabled = false;
            }
        });
    }

    // ==========================================
    // 2. PROTECCIÓN DE RUTAS Y GESTIÓN DE ROLES (BUG 2)
    // ==========================================
    const currentPath = window.location.pathname.toLowerCase();
    const isLogin = currentPath.includes('login.html');

    if (!isLogin) {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        // Si no hay sesión válida, expulsar a Login
        if (!token || !userStr) {
            window.location.href = '/templates/login.html';
            return;
        }

        const user = JSON.parse(userStr);
        const userNameDisplay = document.getElementById('user-name-display');

        if (userNameDisplay) {
            userNameDisplay.textContent = user.nombre || user.username;
        }

        // CONTROL DE PERMISOS VISUALES Y RUTAS

        // REGLA A: Ocultar cosas de Jefe/Admin a los usuarios operativos
        if (user.rol !== 'admin' && user.rol !== 'jefe') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            // Bloqueo de URL por seguridad en frontend
            if (currentPath.includes('usuarios.html')) {
                window.location.href = '/templates/index.html';
            }
        }

        // REGLA B: Restricciones exclusivas para el JEFE
        if (user.rol === 'jefe') {
            // Ocultar botones o campos destinados solo al administrador general
            document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = 'none');
            
            // Ocultar menú de usuarios y bloquear ruta
            document.querySelectorAll('a[href*="usuarios.html"]').forEach(el => {
                if (el.parentElement) el.parentElement.style.display = 'none';
            });
            if (currentPath.includes('usuarios.html')) {
                window.location.href = '/templates/index.html';
            }
        }

        // REGLA C: Restricciones exclusivas para el ADMIN
        if (user.rol === 'admin') {
            const rutasFinancieras = ['registro_movimientos.html', 'generacion_reportes.html', 'cuentas_por_pagar.html'];
            
            // Ocultar los enlaces del menú lateral
            document.querySelectorAll('#main-menu a').forEach(link => {
                const href = link.getAttribute('href') || '';
                if (rutasFinancieras.some(ruta => href.includes(ruta))) {
                    if (link.parentElement) link.parentElement.style.display = 'none';
                }
            });

            // Ocultar gráficas y métricas financieras si el admin está en el Index
            document.querySelectorAll('.cards-container, .charts-wrapper, .upcoming-deadlines-container, .main-actions').forEach(el => {
                el.style.display = 'none';
            });

            // Expulsar si intenta escribir la ruta financiera manualmente
            if (rutasFinancieras.some(ruta => currentPath.includes(ruta))) {
                window.location.href = '/templates/index.html';
            }
        }

        // LÓGICA DE CIERRE DE SESIÓN (BUG 1)
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Redirigimos usando la ruta estructurada
                window.location.href = '/templates/login.html';
            });
        }
    }

    // ==========================================
    // 3. LÓGICA DEL PERFIL DE USUARIO
    // ==========================================
    const perfilForm = document.getElementById('perfil-form');
    
    if (perfilForm) {
        // Obtenemos al usuario que inició sesión
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // A) Rellenar los campos cuando la página de perfil carga
        document.getElementById('perfil-nombre').value = user.nombre || '';
        document.getElementById('perfil-username').value = user.username || '';

        // B) Escuchar el botón de Guardar Cambios
        perfilForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreVal = document.getElementById('perfil-nombre').value;
            const usernameVal = document.getElementById('perfil-username').value;
            const passwordActual = document.getElementById('password_actual').value;
            const nuevaPassword = document.getElementById('nueva_password').value;

            const btn = perfilForm.querySelector('button[type="submit"]');
            const btnOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            btn.disabled = true;

            try {
                // Paso 1: Validar si la contraseña es correcta simulando un Login hacia la API
                const loginRes = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: user.username, 
                        password: passwordActual 
                    })
                });
                
                const loginData = await loginRes.json();
                
                if (!loginRes.ok || loginData.error) {
                    alert("❌ Seguridad: La contraseña actual es incorrecta. Cambios bloqueados.");
                    btn.innerHTML = btnOriginal;
                    btn.disabled = false;
                    return;
                }

                // Paso 2: Si es correcta, guardar los cambios en la Base de Datos
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                const datosActualizar = {
                    nombre: nombreVal,
                    username: usernameVal,
                    rol: user.rol,
                    jefe_id: user.jefe_id
                };

                // Si escribió una contraseña nueva, la mandamos. Si no, conservamos la que ya tenía.
                if (nuevaPassword.trim() !== '') {
                    datosActualizar.password = nuevaPassword;
                } else {
                    datosActualizar.password = passwordActual;
                }

                const putRes = await fetchAPI(`/api/usuarios/${user.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(datosActualizar)
                });

                const putData = await putRes.json();
                if (putData.error) throw new Error(putData.error);

                alert("✅ ¡Tu perfil ha sido actualizado con éxito!");

                // Paso 3: Actualizar la memoria del navegador para que no se cierre la sesión
                user.nombre = nombreVal;
                user.username = usernameVal;
                localStorage.setItem('user', JSON.stringify(user));

                // Limpiar campos de seguridad
                document.getElementById('password_actual').value = '';
                document.getElementById('nueva_password').value = '';
                
                // Recargar página para que el nuevo nombre se vea arriba a la derecha
                window.location.reload();

            } catch (error) {
                alert(`Error al guardar: ${error.message}`);
                btn.innerHTML = btnOriginal;
                btn.disabled = false;
            }
        });
    }
});