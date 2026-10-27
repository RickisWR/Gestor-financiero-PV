document.addEventListener('DOMContentLoaded', function() {
    
    const tableBody = document.getElementById('report-flujo-body');
    if (!tableBody) return;

    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const tipoCheckboxes = document.querySelectorAll('input[name="tipoMov"]');
    const buscadorConceptoInput = document.getElementById('buscador-concepto');
    const filtrarBtn = document.getElementById('btn-filtrar');
    const ordenarPorSelect = document.getElementById('ordenar-por');

    const modificarModal = document.getElementById('modificar-modal');
    const eliminarModal = document.getElementById('eliminar-modal');
    const detallesModal = document.getElementById('detalles-modal');
    const eliminarMultipleModal = document.getElementById('eliminar-multiple-modal');
    const modificarForm = document.getElementById('modificar-form');

    const exportPdfBtn = document.getElementById('btn-export-pdf'); 
    const exportExcelBtn = document.getElementById('btn-export-excel'); 
    
    const selectAllCheckbox = document.getElementById('select-all-movs');
    const btnEliminarSeleccion = document.getElementById('btn-eliminar-seleccion');
    const contadorSeleccion = document.getElementById('contador-seleccion');

    const modificarMetodoSelect = document.getElementById('modificar-metodo');
    const modificarCamposMixto = document.getElementById('modificar-campos-mixto');
    const modMontoTotal = document.getElementById('modificar-monto');
    const modMontoEfectivo = document.getElementById('modificar-monto-efectivo');
    const modMontoBanco = document.getElementById('modificar-monto-banco');
    
    const modificarTipoSelect = document.getElementById('modificar-tipo');
    const modificarClasificacionSelect = document.getElementById('modificar-clasificacion');

    let movimientoIdParaEliminar = null;
    let todosLosMovimientos = []; 

    function formatCurrency(value) {
        try {
            const numValue = Number(value);
            if (isNaN(numValue)) return "$ 0.00"; 
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(numValue);
        } catch (e) {
            return "$ Error";
        }
    }

    function obtenerClaseColor(tipo, metodo) {
        const t = (tipo || '').toLowerCase();
        const m = (metodo || '').toLowerCase();
        if (m === 'mixto') return t === 'ingreso' ? 'row-ingreso-mixto' : 'row-egreso-mixto';
        const esEfectivo = m.includes('efectivo');
        if (t === 'ingreso') return esEfectivo ? 'row-ingreso-efectivo' : 'row-ingreso-banco';
        return esEfectivo ? 'row-egreso-efectivo' : 'row-egreso-banco';
    }

    function obtenerLetraClasificacion(mov) {
        if (mov.cuenta_id && mov.cuenta_id !== null) return 'P'; 
        const clas = (mov.clasificacion || '').toLowerCase();
        if (mov.tipo === 'ingreso') {
            if (clas === 'venta') return 'V';
            return 'I';
        }
        if (mov.tipo === 'egreso') {
            if (clas === 'compra') return 'C';
            if (clas === 'gasto-extraordinario') return 'E';
            if (clas === 'gasto-operativo') return 'O';
        }
        return ''; 
    }

    function actualizarTabla() {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;
        const conceptoBusqueda = buscadorConceptoInput.value.toLowerCase();
        const ordenSeleccionado = ordenarPorSelect ? ordenarPorSelect.value : 'fecha_desc';
        
        const tiposSeleccionados = [];
        tipoCheckboxes.forEach(checkbox => {
            if (checkbox.checked) tiposSeleccionados.push(checkbox.value);
        });

        tableBody.innerHTML = '';
        
        let balanceEfectivo = 0;
        let balanceBanco = 0;
        let balanceAcumulado = 0; 
        let movimientosProcesados = [];

        todosLosMovimientos.forEach((mov) => {
            const fechaFila = mov.fecha;
            const tipoFila = mov.tipo; 
            const clasificacionFila = (mov.clasificacion || 'N/A').toLowerCase(); 
            const conceptoFila = (mov.concepto || '').toLowerCase(); 
            const monto = parseFloat(mov.monto);
            const metodo = mov.metodo; 

            if (isNaN(monto)) return; 

            let mostrarFila = true;

            if (fechaInicio && fechaFila < fechaInicio) mostrarFila = false;
            if (fechaFin && fechaFila > fechaFin) mostrarFila = false;
            if (conceptoBusqueda && !conceptoFila.includes(conceptoBusqueda)) mostrarFila = false;
            
            if (tiposSeleccionados.length > 0) { 
                 let tipoCoincide = false;
                 if (tipoFila === 'ingreso') {
                     if (clasificacionFila === 'venta' && tiposSeleccionados.includes('venta')) tipoCoincide = true;
                     else if (clasificacionFila !== 'venta' && tiposSeleccionados.includes('ingreso')) tipoCoincide = true;
                 } else if (tipoFila === 'egreso' && tiposSeleccionados.includes(clasificacionFila)) {
                     tipoCoincide = true;
                 }
                 if(tipoFila === 'egreso' && clasificacionFila === 'n/a' && tiposSeleccionados.includes('otro')) tipoCoincide = true;
                 
                 if (!tipoCoincide) mostrarFila = false;
            } else { 
                mostrarFila = false; 
            }

            if (mostrarFila) {
                balanceAcumulado += monto; 
                
                if (metodo === 'Mixto') {
                    let mEf = 0, mBa = 0;
                    if (mov.comentario) {
                        const matchEf = mov.comentario.match(/Efectivo:\s*\$([\d.]+)/);
                        const matchBa = mov.comentario.match(/Banco:\s*\$([\d.]+)/);
                        if (matchEf) mEf = parseFloat(matchEf[1]);
                        if (matchBa) mBa = parseFloat(matchBa[1]);
                    }
                    if (monto < 0) {
                        balanceEfectivo -= Math.abs(mEf);
                        balanceBanco -= Math.abs(mBa);
                    } else {
                        balanceEfectivo += Math.abs(mEf);
                        balanceBanco += Math.abs(mBa);
                    }
                } else if (metodo === 'Efectivo') {
                    balanceEfectivo += monto;
                } else if (metodo === 'Tarjeta') {
                    balanceBanco += monto;
                }
                
                movimientosProcesados.push({
                    ...mov,
                    montoNum: monto,
                    balEfe: balanceEfectivo,
                    balBan: balanceBanco,
                    balAcu: balanceAcumulado,
                    claseFila: obtenerClaseColor(tipoFila, metodo),
                    letraRef: obtenerLetraClasificacion(mov)
                });
            }
        });

        if (ordenSeleccionado === 'fecha_desc') movimientosProcesados.reverse();
        else if (ordenSeleccionado === 'monto_desc') movimientosProcesados.sort((a, b) => Math.abs(b.montoNum) - Math.abs(a.montoNum));

        movimientosProcesados.forEach(mov => {
            const montoFormateado = formatCurrency(mov.montoNum);
            const ingresoHTML = mov.montoNum >= 0 ? `<td class="monto-ingreso positive-feedback">${montoFormateado}</td>` : '<td class="monto-ingreso"></td>';
            const egresoHTML = mov.montoNum < 0 ? `<td class="monto-egreso negative-feedback">${montoFormateado}</td>` : '<td class="monto-egreso"></td>';

            const filaHTML = `
                <tr class="${mov.claseFila}" data-id="${mov.id}" data-tipo="${mov.tipo}" data-clasificacion="${mov.clasificacion}" data-fecha="${mov.fecha}" data-concepto="${mov.concepto}" data-monto="${mov.monto}" data-metodo="${mov.metodo}" data-sucursal="${mov.sucursal || ''}" data-comentario="${mov.comentario || ''}">
                    
                    <td style="text-align: center;">
                        <input type="checkbox" class="mov-checkbox" value="${mov.id}">
                    </td>
                    <td>${mov.fecha}</td>
                    
                    <td class="concepto-cell">
                        <div class="concepto-interactivo">
                            <div class="concepto-texto" data-menu-id="menu-${mov.id}">
                                ${mov.concepto} <i class="fas fa-caret-down"></i>
                            </div>
                            <div id="menu-${mov.id}" class="menu-flotante">
                                <a href="#" class="opcion-azul btn-accion-menu" data-accion="ver"><i class="fas fa-eye"></i> Ver Detalles</a>
                                <a href="#" class="opcion-modificar btn-accion-menu" data-accion="modificar"><i class="fas fa-edit"></i> Modificar</a>
                                <a href="#" class="opcion-eliminar btn-accion-menu" data-accion="eliminar"><i class="fas fa-trash-alt"></i> Eliminar</a>
                            </div>
                        </div>
                    </td>

                    <td class="col-ref">${mov.letraRef}</td>
                    ${ingresoHTML}
                    ${egresoHTML}
                    
                    <td class="monto-efectivo ${mov.balEfe >= 0 ? 'positive-feedback' : 'negative-feedback'}">${formatCurrency(mov.balEfe)}</td>
                    <td class="monto-banco ${mov.balBan >= 0 ? 'positive-feedback' : 'negative-feedback'}">${formatCurrency(mov.balBan)}</td>
                    <td class="acumulado ${mov.balAcu >= 0 ? 'positive-feedback' : 'negative-feedback'}">${formatCurrency(mov.balAcu)}</td>
                </tr>
            `;
            tableBody.innerHTML += filaHTML;
        });
        actualizarEstadoSeleccion(); 
    }

    async function cargarMovimientos() {
        try {
            const response = await fetchAPI('/api/movimientos');
            const data = await response.json();
            
            if (data.error) {
                alert("Error al cargar datos.");
            } else {
                todosLosMovimientos = data; 
                actualizarTabla(); 
            }
        } catch (error) {
            console.error("Error de red:", error);
        }
    }
    
    filtrarBtn.addEventListener('click', actualizarTabla); 
    if (ordenarPorSelect) ordenarPorSelect.addEventListener('change', actualizarTabla);
    cargarMovimientos(); 
    
    function actualizarEstadoSeleccion() {
        const checkboxes = document.querySelectorAll('.mov-checkbox');
        const seleccionados = document.querySelectorAll('.mov-checkbox:checked');
        
        contadorSeleccion.textContent = seleccionados.length;
        if (seleccionados.length > 0) btnEliminarSeleccion.style.display = 'inline-block';
        else btnEliminarSeleccion.style.display = 'none';
        
        if(checkboxes.length === 0) selectAllCheckbox.checked = false;
        else selectAllCheckbox.checked = (checkboxes.length === seleccionados.length);
    }

    if(selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            document.querySelectorAll('.mov-checkbox').forEach(cb => cb.checked = isChecked);
            actualizarEstadoSeleccion();
        });
    }

    tableBody.addEventListener('change', function(e) {
        if(e.target.classList.contains('mov-checkbox')) actualizarEstadoSeleccion();
    });

    btnEliminarSeleccion.addEventListener('click', () => {
        const count = document.querySelectorAll('.mov-checkbox:checked').length;
        document.getElementById('texto-cantidad-borrar').textContent = `${count} movimiento(s)`;
        eliminarMultipleModal.style.display = 'flex';
    });

    document.getElementById('confirmar-eliminacion-multiple').addEventListener('click', async function() {
        const seleccionados = document.querySelectorAll('.mov-checkbox:checked');
        const ids = Array.from(seleccionados).map(cb => cb.value);
        
        const btn = this;
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Borrando...';
        
        let borradosExito = 0;
        for(let id of ids) {
            try {
                const res = await fetchAPI(`/api/movimientos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if(!data.error) borradosExito++;
            } catch (e) {
                console.error("Error al borrar el ID " + id);
            }
        }
        
        btn.disabled = false;
        btn.textContent = textoOriginal;
        eliminarMultipleModal.style.display = 'none';
        
        alert(`Se eliminaron ${borradosExito} movimientos correctamente.`);
        cargarMovimientos();
    });

    tableBody.addEventListener('click', function(event) {
        if(event.target.classList.contains('mov-checkbox') || event.target.tagName.toLowerCase() === 'input') return;

        const conceptoTrigger = event.target.closest('.concepto-texto');
        if (conceptoTrigger) {
            event.stopPropagation(); 
            const menuId = conceptoTrigger.getAttribute('data-menu-id');
            const menu = document.getElementById(menuId);
            
            document.querySelectorAll('.menu-flotante').forEach(m => {
                if (m.id !== menuId) m.classList.remove('mostrar');
            });
            if(menu) menu.classList.toggle('mostrar');
            return;
        }

        const actionBtn = event.target.closest('.btn-accion-menu');
        if (actionBtn) {
            event.preventDefault(); 
            const row = actionBtn.closest('tr');
            const data = row.dataset;
            const accion = actionBtn.getAttribute('data-accion');

            const menuAbierto = actionBtn.closest('.menu-flotante');
            if(menuAbierto) menuAbierto.classList.remove('mostrar');

            if (accion === 'ver') abrirModalDetalles(data);
            else if (accion === 'modificar') abrirModalModificar(data);
            else if (accion === 'eliminar') abrirModalEliminar(data);
        }
    });

    window.addEventListener('click', function(event) {
        if (!event.target.closest('.concepto-texto') && !event.target.closest('.menu-flotante')) {
            document.querySelectorAll('.menu-flotante.mostrar').forEach(menu => menu.classList.remove('mostrar'));
        }
        if (event.target == detallesModal) detallesModal.style.display = 'none';
        if (event.target == modificarModal) modificarModal.style.display = 'none';
        if (event.target == eliminarModal) eliminarModal.style.display = 'none';
        if (event.target == eliminarMultipleModal) eliminarMultipleModal.style.display = 'none';
    });

    function abrirModalDetalles(data) {
        document.getElementById('detalles-id').textContent = data.id || 'N/A';
        document.getElementById('detalles-fecha').textContent = data.fecha || 'N/A';
        document.getElementById('detalles-concepto').textContent = data.concepto || 'N/A';
        document.getElementById('detalles-tipo').textContent = data.tipo || 'N/A'; 
        document.getElementById('detalles-metodo').textContent = data.metodo || 'N/A'; 

        const monto = parseFloat(data.monto);
        const montoSpan = document.getElementById('detalles-monto');
        montoSpan.textContent = formatCurrency(isNaN(monto) ? 0 : monto); 
        montoSpan.className = monto >= 0 ? 'positive-feedback' : 'negative-feedback';

        document.getElementById('detalles-clasificacion').textContent = data.clasificacion && data.clasificacion !== 'N/A' ? data.clasificacion : 'General';
        
        document.getElementById('detalles-sucursal-p').style.display = data.sucursal ? 'block' : 'none';
        document.getElementById('detalles-sucursal').textContent = data.sucursal || '';
        document.getElementById('detalles-comentario-p').style.display = data.comentario ? 'block' : 'none';
        document.getElementById('detalles-comentario').textContent = data.comentario || '';

        detallesModal.style.display = 'flex';
    }

    function actualizarOpcionesClasificacionMod() {
        const tipo = modificarTipoSelect.value;
        modificarClasificacionSelect.innerHTML = ''; 
        
        if (tipo === 'ingreso') {
            modificarClasificacionSelect.innerHTML = `
                <option value="venta">Venta</option>
                <option value="otro">Otro</option>
            `;
        } else {
            modificarClasificacionSelect.innerHTML = `
                <option value="compra">Compra</option>
                <option value="gasto-operativo">Gasto Operativo</option>
                <option value="gasto-extraordinario">Gasto Extraordinario</option>
                <option value="otro">Otro</option>
            `;
        }
    }

    if (modificarTipoSelect) {
        modificarTipoSelect.disabled = false;
        modificarTipoSelect.addEventListener('change', actualizarOpcionesClasificacionMod);
    }

    function calcularTotalModMixto() {
        if (modificarMetodoSelect.value === 'Mixto') {
            const ef = parseFloat(modMontoEfectivo.value) || 0;
            const ba = parseFloat(modMontoBanco.value) || 0;
            modMontoTotal.value = (ef + ba).toFixed(2);
        }
    }
    
    if(modMontoEfectivo) modMontoEfectivo.addEventListener('input', calcularTotalModMixto);
    if(modMontoBanco) modMontoBanco.addEventListener('input', calcularTotalModMixto);

    function toggleModificarMixto() {
        if (!modificarMetodoSelect || !modificarCamposMixto) return;
        if (modificarMetodoSelect.value === 'Mixto') {
            modificarCamposMixto.style.display = 'flex';
            modMontoEfectivo.required = true;
            modMontoBanco.required = true;
            
            modMontoTotal.readOnly = true;
            modMontoTotal.style.backgroundColor = '#e9ecef';
            calcularTotalModMixto();
        } else {
            modificarCamposMixto.style.display = 'none';
            modMontoEfectivo.required = false;
            modMontoBanco.required = false;
            
            modMontoTotal.readOnly = false;
            modMontoTotal.style.backgroundColor = '';
        }
    }
    if (modificarMetodoSelect) modificarMetodoSelect.addEventListener('change', toggleModificarMixto);

    function abrirModalModificar(data) {
        document.getElementById('modificar-id').value = data.id || '';
        document.getElementById('modificar-fecha').value = data.fecha || '';
        document.getElementById('modificar-concepto').value = data.concepto || '';
        
        const montoMod = parseFloat(data.monto);
        modMontoTotal.value = isNaN(montoMod) ? '' : Math.abs(montoMod); 
        document.getElementById('modificar-metodo').value = data.metodo || 'Efectivo'; 
        
        modificarTipoSelect.value = data.tipo || 'ingreso'; 
        actualizarOpcionesClasificacionMod();

        document.getElementById('modificar-comentario').value = data.comentario || '';
        
        if(data.clasificacion && data.clasificacion !== 'N/A') {
            modificarClasificacionSelect.value = data.clasificacion;
        }
        
        if (!modificarClasificacionSelect.value) {
            modificarClasificacionSelect.value = (modificarTipoSelect.value === 'ingreso') ? 'venta' : 'compra';
        }
        
        if (data.metodo === 'Mixto' && data.comentario) {
            const regexEfectivo = /Efectivo:\s*\$([\d.]+)/;
            const regexBanco = /Banco:\s*\$([\d.]+)/;
            const matchEf = data.comentario.match(regexEfectivo);
            const matchBa = data.comentario.match(regexBanco);
            modMontoEfectivo.value = matchEf ? parseFloat(matchEf[1]) : '';
            modMontoBanco.value = matchBa ? parseFloat(matchBa[1]) : '';
        } else {
            modMontoEfectivo.value = '';
            modMontoBanco.value = '';
        }

        toggleModificarMixto(); 
        modificarModal.style.display = 'flex';
    }

    function abrirModalEliminar(data) {
        movimientoIdParaEliminar = data.id;
        eliminarModal.style.display = 'flex';
    }

    modificarForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const id = document.getElementById('modificar-id').value;
        const tipoGeneral = modificarTipoSelect.value; 
        const esEgreso = (tipoGeneral === 'egreso');
        
        const montoAbs = Math.abs(parseFloat(modMontoTotal.value));
        
        if (isNaN(montoAbs) || montoAbs <= 0) {
            alert("El monto ingresado no es válido. Debe ser mayor a 0.");
            return;
        }

        const montoFinal = esEgreso ? -montoAbs : montoAbs; 
        const metodoSeleccionado = document.getElementById('modificar-metodo').value;
        let comentarioFinal = document.getElementById('modificar-comentario').value || '';

        comentarioFinal = comentarioFinal.replace(/\[Mixto -> Efectivo: \$[\d.]+ \| Banco: \$[\d.]+\]/g, '').trim();

        if (metodoSeleccionado === 'Mixto') {
            const mEfectivo = parseFloat(modMontoEfectivo.value) || 0;
            const mBanco = parseFloat(modMontoBanco.value) || 0;
            
            if (Math.abs((mEfectivo + mBanco) - montoAbs) > 0.01) {
                alert("Error: La suma del Efectivo y Banco debe ser exactamente igual al Monto Total.");
                return; 
            }
            
            const desglose = `[Mixto -> Efectivo: $${mEfectivo.toFixed(2)} | Banco: $${mBanco.toFixed(2)}]`;
            comentarioFinal = comentarioFinal ? `${comentarioFinal}\n${desglose}` : desglose;
        }

        const nuevosDatos = {
            fecha: document.getElementById('modificar-fecha').value,
            concepto: document.getElementById('modificar-concepto').value,
            monto: montoFinal,
            metodo: metodoSeleccionado, 
            clasificacion: modificarClasificacionSelect.value,
            tipo: tipoGeneral,
            comentario: comentarioFinal
        };

        const btn = this.querySelector('button[type="submit"]');
        const btnOriginalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;
        
        try {
            const response = await fetchAPI(`/api/movimientos/${id}`, {
                method: 'PUT',
                body: JSON.stringify(nuevosDatos)
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            alert("Movimiento modificado correctamente.");
            modificarModal.style.display = 'none';
            cargarMovimientos(); 
        } catch (error) {
            alert(`Ocurrió un error al actualizar: ${error.message}`);
        } finally {
            btn.innerHTML = btnOriginalText;
            btn.disabled = false;
        }
    });

    document.getElementById('confirmar-eliminacion').addEventListener('click', async function() {
        if (!movimientoIdParaEliminar) return; 
        
        const btn = this;
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        try {
            const response = await fetchAPI(`/api/movimientos/${movimientoIdParaEliminar}`, { method: 'DELETE' });
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            alert("Movimiento eliminado correctamente.");
            eliminarModal.style.display = 'none';
            movimientoIdParaEliminar = null;
            cargarMovimientos(); 
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    });

    document.getElementById('close-detalles-modal').addEventListener('click', () => detallesModal.style.display = 'none');
    document.getElementById('close-modificar-modal').addEventListener('click', () => modificarModal.style.display = 'none');
    document.getElementById('close-eliminar-modal').addEventListener('click', () => eliminarModal.style.display = 'none');
    document.getElementById('cancelar-eliminacion').addEventListener('click', () => eliminarModal.style.display = 'none');
    document.getElementById('close-eliminar-multiple-modal').addEventListener('click', () => eliminarMultipleModal.style.display = 'none');
    document.getElementById('cancelar-eliminacion-multiple').addEventListener('click', () => eliminarMultipleModal.style.display = 'none');
    
    function getFiltrosComoURL() {
        const params = new URLSearchParams();
        if (fechaInicioInput.value) params.append('fecha_inicio', fechaInicioInput.value);
        if (fechaFinInput.value) params.append('fecha_fin', fechaFinInput.value);
        if (buscadorConceptoInput.value) params.append('concepto', buscadorConceptoInput.value);
        const tiposSeleccionados = [];
        tipoCheckboxes.forEach(checkbox => { if (checkbox.checked) tiposSeleccionados.push(checkbox.value); });
        if (tiposSeleccionados.length > 0) params.append('tipos', tiposSeleccionados.join(',')); 
        return params.toString(); 
    }

    async function descargarReporte(url, filename) {
        try {
            const response = await fetchAPI(url);
            
            if (!response.ok) {
                let errText = "Error desconocido del servidor al generar reporte.";
                try {
                    const errJson = await response.json();
                    errText = errJson.error || errText;
                } catch(e) {}
                throw new Error(errText);
            }
            
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
            alert(`No se pudo generar el reporte: ${error.message}`); 
        }
    }
    
    if(exportPdfBtn) exportPdfBtn.addEventListener('click', () => descargarReporte(`/api/exportar/pdf?${getFiltrosComoURL()}`, 'Reporte_Financiero.pdf'));
    // AQUÍ ESTÁ LA CORRECCIÓN CLAVE: .csv en lugar de .xlsx
    if(exportExcelBtn) exportExcelBtn.addEventListener('click', () => descargarReporte(`/api/exportar/excel?${getFiltrosComoURL()}`, 'Reporte_Financiero.csv'));
});