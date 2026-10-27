document.addEventListener('DOMContentLoaded', function() {
    const tipoMovimientoSelect = document.getElementById('tipo-movimiento');
    const metodoPagoSelect = document.getElementById('metodo-pago');
    const camposIngreso = document.getElementById('campos-ingreso');
    const camposEgreso = document.getElementById('campos-egreso');
    const camposMixto = document.getElementById('campos-mixto');
    const clasificacionEgresoSelect = document.getElementById('clasificacion-egreso');
    const clasificacionIngresoSelect = document.getElementById('clasificacion-ingreso');
    
    // Selectores para el auto-cálculo
    const montoTotalInput = document.getElementById('monto');
    const montoEfectivoInput = document.getElementById('monto-efectivo-mixto');
    const montoBancoInput = document.getElementById('monto-banco-mixto');
    
    function toggleCampos() {
        if (!tipoMovimientoSelect) return; 
        if (tipoMovimientoSelect.value === 'ingreso') {
            camposIngreso.style.display = 'block';
            camposEgreso.style.display = 'none';
            if(clasificacionEgresoSelect) clasificacionEgresoSelect.required = false; 
            if(clasificacionIngresoSelect) clasificacionIngresoSelect.required = true;
        } else { // 'egreso'
            camposIngreso.style.display = 'none';
            camposEgreso.style.display = 'block';
            if(clasificacionEgresoSelect) clasificacionEgresoSelect.required = true;
            if(clasificacionIngresoSelect) clasificacionIngresoSelect.required = false;
        }
    }

    // --- NUEVO: Función para sumar automáticamente ---
    function calcularTotalMixto() {
        if (metodoPagoSelect.value === 'Mixto') {
            const ef = parseFloat(montoEfectivoInput.value) || 0;
            const ba = parseFloat(montoBancoInput.value) || 0;
            montoTotalInput.value = (ef + ba).toFixed(2);
        }
    }

    // Escuchar cuando se escribe en las casillas mixtas para sumar en tiempo real
    if(montoEfectivoInput) montoEfectivoInput.addEventListener('input', calcularTotalMixto);
    if(montoBancoInput) montoBancoInput.addEventListener('input', calcularTotalMixto);

    function toggleMixto() {
        if (!metodoPagoSelect || !camposMixto) return;
        if (metodoPagoSelect.value === 'Mixto') {
            camposMixto.style.display = 'flex';
            montoEfectivoInput.required = true;
            montoBancoInput.required = true;
            
            // Bloquear el Monto Total y auto-calcular
            montoTotalInput.readOnly = true;
            montoTotalInput.style.backgroundColor = '#e9ecef'; // Color gris para indicar bloqueo
            calcularTotalMixto();
        } else {
            camposMixto.style.display = 'none';
            montoEfectivoInput.required = false;
            montoBancoInput.required = false;
            
            // Desbloquear el Monto Total
            montoTotalInput.readOnly = false;
            montoTotalInput.style.backgroundColor = '';
        }
    }
    
    if(tipoMovimientoSelect) tipoMovimientoSelect.addEventListener('change', toggleCampos);
    if(metodoPagoSelect) metodoPagoSelect.addEventListener('change', toggleMixto);

    // Poner la fecha actual por defecto
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0]; 
    }
    
    // Ejecutar al inicio
    toggleCampos();
    toggleMixto();

    // --- Lógica para enviar el formulario al backend ---
    const movimientoForm = document.getElementById('movimiento-form');
    if(movimientoForm){
        movimientoForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            const esEgreso = (tipoMovimientoSelect.value === 'egreso');
            const montoAbs = Math.abs(parseFloat(montoTotalInput.value));
            const montoFinal = esEgreso ? -montoAbs : montoAbs; 
            const metodoSeleccionado = metodoPagoSelect.value;
            let comentarioFinal = document.getElementById('comentario').value || '';

            // Guardar el desglose si es mixto
            if (metodoSeleccionado === 'Mixto') {
                const mEfectivo = parseFloat(montoEfectivoInput.value) || 0;
                const mBanco = parseFloat(montoBancoInput.value) || 0;
                
                // Validación por seguridad (aunque ya se auto-calcula)
                if (Math.abs((mEfectivo + mBanco) - montoAbs) > 0.01) {
                    alert("Error: La suma del Efectivo y Banco debe ser exactamente igual al Monto Total.");
                    return; 
                }
                
                const desglose = `[Mixto -> Efectivo: $${mEfectivo.toFixed(2)} | Banco: $${mBanco.toFixed(2)}]`;
                comentarioFinal = comentarioFinal ? `${comentarioFinal}\n${desglose}` : desglose;
            }

            const clasificacionFinal = esEgreso ? clasificacionEgresoSelect.value : clasificacionIngresoSelect.value;

            const datos = {
                fecha: document.getElementById('fecha').value,
                concepto: document.getElementById('concepto').value,
                tipo: tipoMovimientoSelect.value,
                monto: montoFinal,
                metodo: metodoSeleccionado,
                clasificacion: clasificacionFinal,
                sucursal: null, // Lo enviamos como nulo
                comentario: comentarioFinal
            };

            // CORRECCIÓN: fetchAPI e inclusión de la s final en /api/movimientos
            fetchAPI('/api/movimientos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error("Error del servidor:", data.error);
                    alert(`Error al guardar: ${data.error}`);
                } else {
                    console.log("Respuesta del servidor:", data);
                    alert(`¡Movimiento de ${datos.tipo} guardado con éxito!`);
                    movimientoForm.reset(); 
                    toggleCampos(); 
                    toggleMixto(); 
                    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
                }
            })
            .catch(error => {
                console.error("Error al guardar movimiento:", error);
                alert("Error de conexión al guardar. Revisa la consola.");
            });
        });
    }
});