document.addEventListener('DOMContentLoaded', function() {
    
    const tablaBody = document.getElementById('tabla-usuarios-body');
    const formCrear = document.getElementById('form-nuevo-usuario');
    const formModificar = document.getElementById('form-modificar-usuario');
    
    // Modales
    const modalModificar = document.getElementById('modificar-modal');
    const modalEliminar = document.getElementById('eliminar-modal');
    let usuarioIdParaAccion = null;

    // Selectores de Rol y Jefe (Para Admin)
    const selectRolCrear = document.getElementById('nuevo-rol');
    const divJefeCrear = document.getElementById('contenedor-select-jefe');
    const selectJefeCrear = document.getElementById('nuevo-jefe-asignado');

    const selectRolMod = document.getElementById('modificar-rol');
    const divJefeMod = document.getElementById('modificar-contenedor-jefe');
    const selectJefeMod = document.getElementById('modificar-jefe-asignado');

    // 1. CARGAR DATOS INICIALES
    function init() {
        cargarUsuarios();
        if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
            cargarListaJefes(); // Llenar los selects de jefes
        }
    }

    function cargarUsuarios() {
        // CORRECCIÓN: Uso de fetchAPI
        fetchAPI('/api/usuarios')
        .then(res => res.json())
        .then(data => {
            if(data.error) { console.error(data.error); return; }
            tablaBody.innerHTML = '';
            
            data.forEach(user => {
                const tr = document.createElement('tr');
                tr.dataset.id = user.id;
                tr.dataset.nombre = user.nombre;
                tr.dataset.username = user.username;
                tr.dataset.rol = user.rol;
                tr.dataset.jefe_id = user.jefe_id || ''; // Guardar jefe actual

                let jefeCol = '';
                if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
                    // Mostrar si tiene jefe asignado
                    jefeCol = `<td>${user.jefe_id ? 'Asignado' : '<span style="color:#aaa">N/A</span>'}</td>`;
                }

                tr.innerHTML = `
                    <td>${user.nombre}</td>
                    <td>${user.username}</td>
                    <td><span class="badge-rol">${user.rol.toUpperCase()}</span></td>
                    ${jefeCol}
                    <td style="text-align: center;">
                        <button class="action-btn btn-modificar-user" style="background:#3498db; margin-right:5px;"><i class="fas fa-edit"></i></button>
                        <button class="action-btn btn-eliminar-user" style="background:#c0392b;"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tablaBody.appendChild(tr);
            });
        });
    }

    function cargarListaJefes() {
        // CORRECCIÓN: Filtramos desde la ruta unificada de usuarios
        fetchAPI('/api/usuarios')
        .then(res => res.json())
        .then(data => {
            let options = '<option value="">-- Selecciona un Jefe --</option>';
            const jefes = data.filter(u => u.rol === 'admin' || u.rol === 'jefe');
            jefes.forEach(j => {
                options += `<option value="${j.id}">${j.nombre}</option>`;
            });
            if(selectJefeCrear) selectJefeCrear.innerHTML = options;
            if(selectJefeMod) selectJefeMod.innerHTML = options;
        });
    }

    // 2. LÓGICA VISUAL: MOSTRAR/OCULTAR SELECT DE JEFE (SOLO ADMIN)
    if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
        
        function toggleSelectJefe(rolSelect, divJefe) {
            const rol = rolSelect.value;
            // Si el rol NO es jefe ni admin, requiere asignar un jefe
            if (rol !== 'jefe' && rol !== 'admin') {
                divJefe.style.display = 'block';
                // Hacer el select required
                const sel = divJefe.querySelector('select');
                if(sel) sel.required = true;
            } else {
                divJefe.style.display = 'none';
                const sel = divJefe.querySelector('select');
                if(sel) sel.required = false;
            }
        }

        // Eventos al cambiar rol
        if(selectRolCrear) selectRolCrear.addEventListener('change', () => toggleSelectJefe(selectRolCrear, divJefeCrear));
        if(selectRolMod) selectRolMod.addEventListener('change', () => toggleSelectJefe(selectRolMod, divJefeMod));
    }

    // 3. EVENTOS DE TABLA (MODIFICAR / ELIMINAR)
    tablaBody.addEventListener('click', function(e) {
        const btnMod = e.target.closest('.btn-modificar-user');
        const btnEli = e.target.closest('.btn-eliminar-user');
        const row = e.target.closest('tr');

        if (btnMod) {
            const d = row.dataset;
            document.getElementById('modificar-id').value = d.id;
            document.getElementById('modificar-nombre').value = d.nombre;
            document.getElementById('modificar-username').value = d.username;
            document.getElementById('modificar-rol').value = d.rol;
            
            // Si es admin, ajustar el select de jefe
            if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
                toggleSelectJefe(selectRolMod, divJefeMod); // Actualizar visibilidad
                if (d.jefe_id) selectJefeMod.value = d.jefe_id;
            }
            
            modalModificar.style.display = 'flex';
        }

        if (btnEli) {
            usuarioIdParaAccion = row.dataset.id;
            modalEliminar.style.display = 'flex';
        }
    });

    // 4. CREAR USUARIO
    if (formCrear) {
        formCrear.addEventListener('submit', function(e) {
            e.preventDefault();
            const datos = {
                nombre: document.getElementById('nuevo-nombre').value,
                username: document.getElementById('nuevo-username').value,
                password: document.getElementById('nuevo-password').value,
                rol: document.getElementById('nuevo-rol').value
            };

            // Si es admin y eligió un rol operativo, mandar jefe_id
            if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
                const jefeVal = selectJefeCrear.value;
                if (divJefeCrear.style.display !== 'none' && jefeVal) {
                    datos.jefe_id = jefeVal;
                }
            }

            fetchAPI('/api/usuarios', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            })
            .then(res => res.json())
            .then(data => {
                if(data.error) alert(data.error);
                else {
                    alert("Usuario creado.");
                    formCrear.reset();
                    cargarUsuarios();
                    if(ES_ADMIN) toggleSelectJefe(selectRolCrear, divJefeCrear); // Reset UI
                }
            });
        });
    }

    // 5. MODIFICAR USUARIO (PUT)
    if (formModificar) {
        formModificar.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('modificar-id').value;
            const datos = {
                nombre: document.getElementById('modificar-nombre').value,
                username: document.getElementById('modificar-username').value,
                rol: document.getElementById('modificar-rol').value,
                password: document.getElementById('modificar-password').value
            };

            if (typeof ES_ADMIN !== 'undefined' && ES_ADMIN) {
                const jefeVal = selectJefeMod.value;
                if (divJefeMod.style.display !== 'none') {
                    datos.jefe_id = jefeVal;
                }
            }

            fetchAPI(`/api/usuarios/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(datos)
            })
            .then(res => res.json())
            .then(data => {
                if(data.error) alert(data.error);
                else {
                    alert("Usuario actualizado.");
                    modalModificar.style.display = 'none';
                    cargarUsuarios();
                }
            });
        });
    }

    // 6. ELIMINAR USUARIO
    const btnConfirmarEli = document.getElementById('confirmar-eliminacion');
    if (btnConfirmarEli) {
        btnConfirmarEli.addEventListener('click', function() {
            if(!usuarioIdParaAccion) return;
            fetchAPI(`/api/usuarios/${usuarioIdParaAccion}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.error) alert(data.error);
                else {
                    alert("Eliminado.");
                    modalEliminar.style.display = 'none';
                    cargarUsuarios();
                }
            });
        });
    }

    // Cerrar Modales
    document.querySelectorAll('#close-modificar-modal, #close-eliminar-modal, #cancelar-eliminacion').forEach(btn => {
        if(btn) btn.addEventListener('click', () => {
            if (modalModificar) modalModificar.style.display = 'none';
            if (modalEliminar) modalEliminar.style.display = 'none';
        });
    });

    init();
});