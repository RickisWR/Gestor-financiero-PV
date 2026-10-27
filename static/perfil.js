document.addEventListener('DOMContentLoaded', () => {
    const perfilForm = document.getElementById('perfil-form');
    if (!perfilForm) return;

    // 1. Obtener usuario de la sesión actual
    const userStr = localStorage.getItem('usuario_puente_viejo');
    if (!userStr) {
        alert("No hay sesión activa.");
        window.location.href = '/templates/login.html';
        return;
    }
    
    const user = JSON.parse(userStr);

    // 2. Rellenar los campos visuales con los datos actuales
    document.getElementById('perfil-nombre').value = user.nombre || '';
    document.getElementById('perfil-username').value = user.username || '';

    // 3. Manejar el evento de guardado
    perfilForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue en blanco

        const nombreVal = document.getElementById('perfil-nombre').value;
        const usernameVal = document.getElementById('perfil-username').value;
        const passwordActual = document.getElementById('password_actual').value;
        const nuevaPassword = document.getElementById('nueva_password').value;

        const btn = perfilForm.querySelector('button[type="submit"]');
        const btnOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando seguridad...';
        btn.disabled = true;

        try {
            // A) COMPROBACIÓN: Validar si la contraseña actual es la correcta
            // Usamos el endpoint de login del backend para comprobar si hace match
            const loginRes = await fetchAPI('/api/login', {
                method: 'POST',
                body: JSON.stringify({ 
                    username: user.username, 
                    password: passwordActual 
                })
            });
            
            const loginData = await loginRes.json();
            
            if (loginData.error) {
                alert("❌ Seguridad: La contraseña actual es incorrecta. No puedes guardar los cambios.");
                btn.innerHTML = btnOriginal;
                btn.disabled = false;
                return;
            }

            // B) GUARDAR LOS CAMBIOS
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';

            const datosActualizar = {
                nombre: nombreVal,
                username: usernameVal,
                rol: user.rol,
                jefe_id: user.jefe_id
            };

            // Solo enviamos la nueva contraseña si el usuario escribió algo
            if (nuevaPassword.trim() !== '') {
                datosActualizar.password = nuevaPassword;
            }

            // Llamada PUT para actualizar al usuario
            const putRes = await fetchAPI(`/api/usuarios/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(datosActualizar)
            });

            const putData = await putRes.json();
            if (putData.error) throw new Error(putData.error);

            alert("✅ ¡Tu perfil ha sido actualizado con éxito!");

            // C) ACTUALIZAR SESIÓN LOCAL
            user.nombre = nombreVal;
            user.username = usernameVal;
            localStorage.setItem('usuario_puente_viejo', JSON.stringify(user));

            // Limpiamos los campos y recargamos para que el nombre cambie en la esquina superior derecha
            document.getElementById('password_actual').value = '';
            document.getElementById('nueva_password').value = '';
            window.location.reload();

        } catch (error) {
            alert(`Error de red al intentar guardar: ${error.message}`);
        } finally {
            btn.innerHTML = btnOriginal;
            btn.disabled = false;
        }
    });
});