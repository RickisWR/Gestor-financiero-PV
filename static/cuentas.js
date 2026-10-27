document.addEventListener('DOMContentLoaded', function() {

    const tableBody = document.getElementById('cuentas-table-body');
    const formNuevaCuenta = document.getElementById('cuentas-form');
    
    if (!tableBody || !formNuevaCuenta) {
        console.error("Error Crítico: No se encontró la tabla o el formulario en el HTML.");
        return;
    }

    const buscadorInput = document.getElementById('buscador-cuentas');
    const fechaInicioInput = document.getElementById('fecha-inicio-cuentas');
    const fechaFinInput = document.getElementById('fecha-fin-cuentas');
    
    const totalSaldoTop = document.getElementById('total-saldo-top');
    const totalSaldoBottom = document.getElementById('total-saldo-bottom');
    
    const exportPdfBtn = document.getElementById('btn-export-pdf-cuentas');
    const exportExcelBtn = document.getElementById('btn-export-excel-cuentas');

    const abonarModal = document.getElementById('abonar-modal');
    const pagarModal = document.getElementById('pagar-modal');
    const eliminarCuentaModal = document.getElementById('eliminar-cuenta-modal');
    
    const abonarForm = document.getElementById('abonar-form');
    const pagarForm = document.getElementById('pagar-form');
    
    const closeAbonar = document.getElementById('close-abonar-modal');
    const closePagar = document.getElementById('close-pagar-modal');
    const closeEliminarCuenta = document.getElementById('close-eliminar-cuenta-modal');
    
    const cancelarPagoBtn = document.getElementById('cancelar-pago');
    const cancelarEliminarCuentaBtn = document.getElementById('cancelar-eliminar-cuenta');
    const confirmarEliminarCuentaBtn = document.getElementById('confirmar-eliminar-cuenta');

    const historialModal = document.getElementById('historial-abonos-modal');
    const editarAbonoModal = document.getElementById('editar-abono-modal');
    const editarCuentaModal = document.getElementById('editar-cuenta-modal'); 
    
    const closeHistorial = document.getElementById('close-historial-modal');
    const closeEditarAbono = document.getElementById('close-editar-abono-modal');
    const closeEditarCuenta = document.getElementById('close-editar-cuenta-modal'); 
    
    const editarAbonoForm = document.getElementById('editar-abono-form');
    const editarCuentaForm = document.getElementById('editar-cuenta-form'); 

    let todasLasCuentas = []; 
    let cuentaDataParaAccion = {};

    function formatCurrency(value) {
        try {
            const num = Number(value);
            return isNaN(num) ? "$0.00" : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
        } catch (e) { return "$ Error"; }
    }

    const fechaCreditoInput = document.getElementById('fecha-credito');
    if (fechaCreditoInput) fechaCreditoInput.value = new Date().toISOString().split('T')[0];

    function actualizarTablaCuentas() {
        const termino = buscadorInput.value.toLowerCase();
        const fInicio = fechaInicioInput.value;
        const fFin = fechaFinInput.value;
        
        tableBody.innerHTML = '';
        let saldoTotalVisible = 0;

        todasLasCuentas.forEach(cuenta => {
            const saldo = cuenta.monto_total - cuenta.monto_abonado;
            const estado = (saldo <= 0.01 || cuenta.estado === 'Pagado') ? 'Pagado' : 'Pendiente';

            if (termino && !cuenta.proveedor.toLowerCase().includes(termino)) return;
            if (fInicio && cuenta.fecha_credito < fInicio) return;
            if (fFin && cuenta.fecha_credito > fFin) return;

            if (estado === 'Pendiente') saldoTotalVisible += saldo;

            const vencimientoHTML = cuenta.fecha_limite ? 
                `<span style="color: #c0392b; font-weight: bold;">${cuenta.fecha_limite}</span>` : 
                '<span style="color: #aaa;">-</span>';

            let proveedorHTML = `
            <td class="concepto-cell">
                <div class="concepto-interactivo">
                    <div class="concepto-texto" data-menu-id="menu-cuenta-${cuenta.id}">
                        ${cuenta.proveedor} <i class="fas fa-caret-down"></i>
                    </div>
                    <div id="menu-cuenta-${cuenta.id}" class="menu-flotante">
                        <a href="#" class="opcion-azul btn-accion-cuenta" data-accion="historial" data-id="${cuenta.id}" data-proveedor="${cuenta.proveedor}" data-total="${cuenta.monto_total}" data-abonado="${cuenta.monto_abonado}">
                            <i class="fas fa-history"></i> Historial de Abonos
                        </a>
                        <a href="#" class="opcion-azul btn-accion-cuenta" data-accion="editar-cuenta" data-id="${cuenta.id}" data-proveedor="${cuenta.proveedor}" data-total="${cuenta.monto_total}" data-fecha="${cuenta.fecha_credito}" data-limite="${cuenta.fecha_limite || ''}">
                            <i class="fas fa-edit"></i> Modificar Detalles
                        </a>
            `;
            
            if (estado === 'Pendiente') {
                proveedorHTML += `
                        <a href="#" class="opcion-verde btn-accion-cuenta" data-accion="abonar" data-id="${cuenta.id}" data-proveedor="${cuenta.proveedor}" data-saldo="${saldo}">
                            <i class="fas fa-plus"></i> Registrar Abono
                        </a>
                        <a href="#" class="opcion-naranja btn-accion-cuenta" data-accion="saldar" data-id="${cuenta.id}" data-proveedor="${cuenta.proveedor}" data-saldo="${saldo}">
                            <i class="fas fa-check-double"></i> Saldar Total
                        </a>
                `;
            }
            
            proveedorHTML += `
                        <a href="#" class="opcion-eliminar btn-accion-cuenta" data-accion="eliminar" data-id="${cuenta.id}" data-proveedor="${cuenta.proveedor}">
                            <i class="fas fa-trash-alt"></i> Eliminar Cuenta
                        </a>
                    </div>
                </div>
            </td>`;

            const row = `
                <tr data-id="${cuenta.id}">
                    <td>${cuenta.fecha_credito}</td>
                    ${proveedorHTML}
                    <td>${vencimientoHTML}</td>
                    <td>${formatCurrency(cuenta.monto_total)}</td>
                    <td>${formatCurrency(saldo)}</td>
                    <td><span class="status-${estado.toLowerCase()}">${estado}</span></td>
                </tr>`;
            tableBody.innerHTML += row;
        });

        const totalFmt = formatCurrency(saldoTotalVisible);
        if(totalSaldoTop) totalSaldoTop.textContent = totalFmt;
        if(totalSaldoBottom) totalSaldoBottom.textContent = totalFmt;
    }

    window.cargarCuentas = async function() {
        try {
            const res = await fetchAPI('/api/cuentas');
            const data = await res.json();
            if(!data.error) {
                todasLasCuentas = data; 
                actualizarTablaCuentas(); 
            }
        } catch(error) {
            console.error("Error de red:", error);
        }
    };

    if(buscadorInput) buscadorInput.addEventListener('keyup', actualizarTablaCuentas);
    if(fechaInicioInput) fechaInicioInput.addEventListener('change', actualizarTablaCuentas);
    if(fechaFinInput) fechaFinInput.addEventListener('change', actualizarTablaCuentas);
    
    window.cargarCuentas(); 

    formNuevaCuenta.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        
        const proveedorVal = document.getElementById('proveedor').value;
        const fechaVal = document.getElementById('fecha-credito').value;
        const montoVal = document.getElementById('monto-solicitado').value;
        const fechaLimiteInput = document.getElementById('fecha-limite'); 

        const datos = {
            proveedor: proveedorVal,
            fecha_credito: fechaVal,
            monto_total: parseFloat(montoVal),
            fecha_limite: fechaLimiteInput && fechaLimiteInput.value ? fechaLimiteInput.value : null 
        };

        const btn = this.querySelector('button');
        const textBtn = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Guardando...';

        try {
            const response = await fetchAPI('/api/cuentas', {
                method: 'POST',
                body: JSON.stringify(datos)
            });
            const data = await response.json();
            if(data.error) throw new Error(data.error);
            
            alert("¡Cuenta registrada correctamente!"); 
            formNuevaCuenta.reset();
            if(fechaCreditoInput) fechaCreditoInput.value = new Date().toISOString().split('T')[0];
            window.cargarCuentas(); 
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = textBtn;
        }
    });

    tableBody.addEventListener('click', function(event) {
        const menuTrigger = event.target.closest('.concepto-texto');
        if (menuTrigger) {
            event.stopPropagation();
            const menuId = menuTrigger.getAttribute('data-menu-id');
            document.querySelectorAll('.menu-flotante').forEach(m => {
                if (m.id !== menuId) m.classList.remove('mostrar');
            });
            const menu = document.getElementById(menuId);
            if(menu) menu.classList.toggle('mostrar');
            return;
        }

        const actionBtn = event.target.closest('.btn-accion-cuenta');
        if (actionBtn) {
            event.preventDefault();
            const accion = actionBtn.getAttribute('data-accion');
            cuentaDataParaAccion = actionBtn.dataset; 
            
            const menuAbierto = actionBtn.closest('.menu-flotante');
            if(menuAbierto) menuAbierto.classList.remove('mostrar');

            if (accion === 'historial') {
                abrirHistorial(cuentaDataParaAccion);
            } else if (accion === 'editar-cuenta') {
                document.getElementById('edit-cuenta-id').value = cuentaDataParaAccion.id;
                document.getElementById('edit-cuenta-proveedor').value = cuentaDataParaAccion.proveedor;
                document.getElementById('edit-cuenta-fecha').value = cuentaDataParaAccion.fecha;
                document.getElementById('edit-cuenta-limite').value = cuentaDataParaAccion.limite;
                document.getElementById('edit-cuenta-monto').value = cuentaDataParaAccion.total;
                editarCuentaModal.style.display = 'flex';
            } else if (accion === 'abonar') {
                document.getElementById('abonar-proveedor-nombre').textContent = cuentaDataParaAccion.proveedor;
                document.getElementById('abonar-cuenta-id').value = cuentaDataParaAccion.id;
                const montoInput = document.getElementById('monto-abono');
                const saldoNum = parseFloat(cuentaDataParaAccion.saldo);
                montoInput.max = saldoNum.toFixed(2);
                montoInput.placeholder = `Máx: ${formatCurrency(saldoNum)}`;
                abonarModal.style.display = 'flex';
            } else if (accion === 'saldar') {
                document.getElementById('pagar-proveedor-nombre').textContent = cuentaDataParaAccion.proveedor;
                document.getElementById('pagar-cuenta-id').value = cuentaDataParaAccion.id;
                pagarModal.style.display = 'flex';
            } else if (accion === 'eliminar') {
                document.getElementById('eliminar-proveedor-nombre').textContent = cuentaDataParaAccion.proveedor;
                eliminarCuentaModal.style.display = 'flex';
            }
        }
    });

    window.addEventListener('click', function(event) {
        if (!event.target.closest('.concepto-texto') && !event.target.closest('.menu-flotante')) {
            document.querySelectorAll('.menu-flotante.mostrar').forEach(menu => menu.classList.remove('mostrar'));
        }
    });

    editarCuentaForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const id = document.getElementById('edit-cuenta-id').value;
        const cuentaActual = todasLasCuentas.find(c => c.id == id);
        
        if (!cuentaActual) return;

        const limiteVal = document.getElementById('edit-cuenta-limite').value;
        const nuevoMontoTotal = parseFloat(document.getElementById('edit-cuenta-monto').value);
        
        if (nuevoMontoTotal < cuentaActual.monto_abonado) {
            alert("Error: El monto total de la deuda no puede ser menor a lo que ya has abonado en el historial.");
            return;
        }

        const nuevoEstado = (nuevoMontoTotal - cuentaActual.monto_abonado <= 0.01) ? 'Pagado' : 'Pendiente';

        const datos = {
            ...cuentaActual,
            proveedor: document.getElementById('edit-cuenta-proveedor').value,
            fecha_credito: document.getElementById('edit-cuenta-fecha').value,
            fecha_limite: limiteVal ? limiteVal : null,
            monto_total: nuevoMontoTotal,
            estado: nuevoEstado
        };

        try {
            const r = await fetchAPI(`/api/cuentas/${id}`, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });
            const data = await r.json();
            if(data.error) throw new Error(data.error);
            
            alert("Cuenta modificada con éxito.");
            editarCuentaModal.style.display = 'none';
            window.cargarCuentas();
        } catch (e) {
            alert(`Ocurrió un error: ${e.message}`);
        }
    });

    abonarForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const monto = parseFloat(document.getElementById('monto-abono').value);
        const metodo = document.getElementById('abonar-metodo').value;
        const id = document.getElementById('abonar-cuenta-id').value;

        if (monto > parseFloat(cuentaDataParaAccion.saldo) + 0.01) {
             alert("El abono no puede ser mayor a la deuda restante.");
             return;
        }

        try {
            const cuenta = todasLasCuentas.find(c => c.id == id);
            const nuevoAbonado = parseFloat(cuenta.monto_abonado) + monto;
            const nuevoEstado = (cuenta.monto_total - nuevoAbonado <= 0.01) ? 'Pagado' : 'Pendiente';

            await fetchAPI(`/api/cuentas/${id}`, {
                method: 'PUT',
                body: JSON.stringify({...cuenta, monto_abonado: nuevoAbonado, estado: nuevoEstado})
            });

            const hoy = new Date().toISOString().split('T')[0];
            await fetchAPI('/api/movimientos', {
                method: 'POST',
                body: JSON.stringify({
                    fecha: hoy, concepto: `Abono a cuenta: ${cuenta.proveedor}`, tipo: 'egreso',
                    monto: -Math.abs(monto), metodo: metodo, clasificacion: 'compra', cuenta_id: id
                })
            });

            alert("Abono registrado con éxito.");
            abonarModal.style.display = 'none';
            this.reset();
            window.cargarCuentas();
        } catch (e) {
            alert(`Error al registrar abono: ${e.message}`);
        }
    });

    pagarForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const metodo = document.getElementById('pagar-metodo').value;
        const id = document.getElementById('pagar-cuenta-id').value;
        const saldo = parseFloat(cuentaDataParaAccion.saldo);

        try {
            const cuenta = todasLasCuentas.find(c => c.id == id);
            const nuevoAbonado = parseFloat(cuenta.monto_abonado) + saldo;

            await fetchAPI(`/api/cuentas/${id}`, {
                method: 'PUT',
                body: JSON.stringify({...cuenta, monto_abonado: nuevoAbonado, estado: 'Pagado'})
            });

            const hoy = new Date().toISOString().split('T')[0];
            await fetchAPI('/api/movimientos', {
                method: 'POST',
                body: JSON.stringify({
                    fecha: hoy, concepto: `Liquidación de cuenta: ${cuenta.proveedor}`, tipo: 'egreso',
                    monto: -Math.abs(saldo), metodo: metodo, clasificacion: 'compra', cuenta_id: id
                })
            });

            alert("Cuenta saldada con éxito.");
            pagarModal.style.display = 'none';
            this.reset();
            window.cargarCuentas();
        } catch (e) {
            alert(`Error al saldar cuenta: ${e.message}`);
        }
    });
    
    if(confirmarEliminarCuentaBtn) {
        confirmarEliminarCuentaBtn.addEventListener('click', async function() {
            if (!cuentaDataParaAccion || !cuentaDataParaAccion.id) return;
            
            try {
                const r = await fetchAPI(`/api/cuentas/${cuentaDataParaAccion.id}`, { method: 'DELETE' });
                const data = await r.json();
                if(data.error) throw new Error(data.error);
                
                alert("Cuenta y sus abonos eliminados con éxito.");
                eliminarCuentaModal.style.display = 'none';
                window.cargarCuentas();
            } catch (e) {
                alert(`Ocurrió un error: ${e.message}`);
            }
        });
    }

    function abrirHistorial(data) {
        document.getElementById('hist-proveedor-nombre').textContent = data.proveedor;
        document.getElementById('hist-total').textContent = formatCurrency(data.total);
        document.getElementById('hist-abonado').textContent = formatCurrency(data.abonado);
        document.getElementById('hist-pendiente').textContent = formatCurrency(data.total - data.abonado);
        
        cargarAbonos(data.id, data.proveedor);
        historialModal.style.display = 'flex';
    }

    function cargarAbonos(cuentaId, proveedor) {
        fetchAPI(`/api/movimientos`)
            .then(res => res.json())
            .then(todos => {
                const abonos = todos.filter(m => m.cuenta_id == cuentaId);
                const tbody = document.getElementById('historial-abonos-body');
                tbody.innerHTML = '';
                
                if (abonos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay abonos registrados para esta cuenta.</td></tr>';
                    return;
                }

                abonos.forEach(ab => {
                    const montoPositivo = Math.abs(ab.monto);
                    tbody.innerHTML += `
                        <tr>
                            <td>${ab.fecha}</td>
                            <td>${formatCurrency(montoPositivo)}</td>
                            <td>${ab.metodo}</td>
                            <td>
                                <button class="btn btn-secondary btn-sm" onclick="abrirEditarAbono(${ab.id}, '${ab.fecha}', ${montoPositivo}, '${ab.metodo}', '${ab.concepto}', ${cuentaId}, '${proveedor}')" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-eliminar btn-sm" onclick="eliminarAbono(${ab.id}, ${cuentaId}, '${proveedor}', ${montoPositivo})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                });
            });
    }

    window.abrirEditarAbono = function(id, fecha, montoOriginal, metodo, concepto, cuentaId, proveedor) {
        document.getElementById('edit-abono-id').value = id;
        document.getElementById('edit-abono-fecha').value = fecha;
        
        const inputMonto = document.getElementById('edit-abono-monto');
        inputMonto.value = montoOriginal;
        inputMonto.dataset.original = montoOriginal; 

        document.getElementById('edit-abono-metodo').value = metodo;
        document.getElementById('edit-abono-concepto').value = concepto;
        document.getElementById('edit-abono-cuenta-id').value = cuentaId;
        document.getElementById('hist-proveedor-temp').value = proveedor; 
        editarAbonoModal.style.display = 'flex';
    };

    editarAbonoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('edit-abono-id').value;
        const cuentaId = document.getElementById('edit-abono-cuenta-id').value;
        const proveedor = document.getElementById('hist-proveedor-temp').value;
        
        const montoNuevo = Math.abs(parseFloat(document.getElementById('edit-abono-monto').value));
        const montoOriginal = parseFloat(document.getElementById('edit-abono-monto').dataset.original);
        const diferencia = montoNuevo - montoOriginal;

        const cuentaActual = todasLasCuentas.find(c => c.id == cuentaId);
        if (!cuentaActual) return;

        const nuevoAbonado = parseFloat(cuentaActual.monto_abonado) + diferencia;

        if (nuevoAbonado > cuentaActual.monto_total + 0.01) {
            alert("Error: El nuevo monto del abono excede el saldo restante de la deuda.");
            return;
        }

        const nuevoEstado = (cuentaActual.monto_total - nuevoAbonado <= 0.01) ? 'Pagado' : 'Pendiente';

        try {
            const datosMov = {
                fecha: document.getElementById('edit-abono-fecha').value,
                concepto: document.getElementById('edit-abono-concepto').value,
                monto: -montoNuevo, 
                metodo: document.getElementById('edit-abono-metodo').value,
                clasificacion: 'compra',
                tipo: 'egreso',
                cuenta_id: cuentaId
            };
            
            const rMov = await fetchAPI(`/api/movimientos/${id}`, {
                method: 'PUT',
                body: JSON.stringify(datosMov)
            });
            const dataMov = await rMov.json();
            if (dataMov.error) throw new Error(dataMov.error);

            const rCuenta = await fetchAPI(`/api/cuentas/${cuentaId}`, {
                method: 'PUT',
                body: JSON.stringify({...cuentaActual, monto_abonado: nuevoAbonado, estado: nuevoEstado})
            });
            const dataCuenta = await rCuenta.json();
            if (dataCuenta.error) throw new Error(dataCuenta.error);

            alert("Abono corregido con éxito.");
            editarAbonoModal.style.display = 'none';
            await window.cargarCuentas(); 

            setTimeout(() => {
                const cuentaActualizada = todasLasCuentas.find(c => c.id == cuentaId);
                if (cuentaActualizada) {
                    document.getElementById('hist-abonado').textContent = formatCurrency(cuentaActualizada.monto_abonado);
                    document.getElementById('hist-pendiente').textContent = formatCurrency(cuentaActualizada.monto_total - cuentaActualizada.monto_abonado);
                    cargarAbonos(cuentaId, proveedor);
                }
            }, 300);

        } catch(error) {
            alert(`Error de sincronización: ${error.message}`);
        }
    });

    window.eliminarAbono = async function(id, cuentaId, proveedor, montoAbono) {
        if(confirm("¿Estás seguro de eliminar este abono? El saldo pendiente de la cuenta aumentará automáticamente.")) {
            try {
                const cuentaActual = todasLasCuentas.find(c => c.id == cuentaId);
                const nuevoAbonado = parseFloat(cuentaActual.monto_abonado) - montoAbono;
                const nuevoEstado = (cuentaActual.monto_total - nuevoAbonado <= 0.01) ? 'Pagado' : 'Pendiente';

                const resDel = await fetchAPI(`/api/movimientos/${id}`, { method: 'DELETE' });
                const dataDel = await resDel.json();
                if(dataDel.error) throw new Error(dataDel.error);

                await fetchAPI(`/api/cuentas/${cuentaId}`, {
                    method: 'PUT',
                    body: JSON.stringify({...cuentaActual, monto_abonado: nuevoAbonado, estado: nuevoEstado})
                });

                await window.cargarCuentas();
                
                setTimeout(() => {
                    const cuentaActualizada = todasLasCuentas.find(c => c.id == cuentaId);
                    if (cuentaActualizada) {
                        document.getElementById('hist-abonado').textContent = formatCurrency(cuentaActualizada.monto_abonado);
                        document.getElementById('hist-pendiente').textContent = formatCurrency(cuentaActualizada.monto_total - cuentaActualizada.monto_abonado);
                        cargarAbonos(cuentaId, proveedor);
                    }
                }, 300);
            } catch (error) {
                alert(`Ocurrió un problema: ${error.message}`);
            }
        }
    };

    if(closeAbonar) closeAbonar.addEventListener('click', () => { abonarModal.style.display = 'none'; abonarForm.reset(); });
    if(closePagar) closePagar.addEventListener('click', () => { pagarModal.style.display = 'none'; pagarForm.reset(); });
    if(closeEliminarCuenta) closeEliminarCuenta.addEventListener('click', () => { eliminarCuentaModal.style.display = 'none'; });
    if(closeHistorial) closeHistorial.addEventListener('click', () => { historialModal.style.display = 'none'; });
    if(closeEditarAbono) closeEditarAbono.addEventListener('click', () => { editarAbonoModal.style.display = 'none'; });
    if(closeEditarCuenta) closeEditarCuenta.addEventListener('click', () => { editarCuentaModal.style.display = 'none'; }); 
    
    if(cancelarPagoBtn) cancelarPagoBtn.addEventListener('click', () => { pagarModal.style.display = 'none'; pagarForm.reset(); });
    if(cancelarEliminarCuentaBtn) cancelarEliminarCuentaBtn.addEventListener('click', () => { eliminarCuentaModal.style.display = 'none'; });
    
    window.addEventListener('click', (e) => {
        if (e.target == abonarModal) { abonarModal.style.display = 'none'; abonarForm.reset(); }
        if (e.target == pagarModal) { pagarModal.style.display = 'none'; pagarForm.reset(); }
        if (e.target == eliminarCuentaModal) { eliminarCuentaModal.style.display = 'none'; }
        if (e.target == historialModal) { historialModal.style.display = 'none'; }
        if (e.target == editarAbonoModal) { editarAbonoModal.style.display = 'none'; }
        if (e.target == editarCuentaModal) { editarCuentaModal.style.display = 'none'; }
    });

    function getFiltrosURL() {
        const params = new URLSearchParams();
        if (fechaInicioInput.value) params.append('fecha_inicio', fechaInicioInput.value);
        if (fechaFinInput.value) params.append('fecha_fin', fechaFinInput.value);
        if (buscadorInput.value) params.append('proveedor', buscadorInput.value);
        return params.toString();
    }

    async function descargarReporteCuentas(url, filename) {
        try {
            const response = await fetchAPI(url);
            if (!response.ok) throw new Error("Error en el servidor al generar reporte.");
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; 
            a.href = downloadUrl; 
            a.download = filename;
            document.body.appendChild(a); 
            a.click();
            window.URL.revokeObjectURL(downloadUrl); 
            a.remove();
        } catch (error) { 
            alert(`No se pudo exportar: ${error.message}`); 
        }
    }

    if(exportPdfBtn) exportPdfBtn.addEventListener('click', () => descargarReporteCuentas(`/api/exportar/cuentas/pdf?${getFiltrosURL()}`, 'Cuentas_Por_Pagar.pdf'));
    // AQUÍ ESTÁ LA CORRECCIÓN CLAVE: .csv en lugar de .xlsx
    if(exportExcelBtn) exportExcelBtn.addEventListener('click', () => descargarReporteCuentas(`/api/exportar/cuentas/excel?${getFiltrosURL()}`, 'Cuentas_Por_Pagar.csv'));
});