document.addEventListener('DOMContentLoaded', function() {

    const totalIngresosEl = document.getElementById('total-ingresos');
    const totalEgresosEl = document.getElementById('total-egresos');
    const totalAcumuladoEl = document.getElementById('total-acumulado');
    const mensajeTendenciaEl = document.getElementById('mensaje-tendencia');

    // Variables para las instancias de gráficas (para poder destruirlas al recargar)
    let chartGastos = null;
    let chartBalance = null;

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0-11
    const anioActual = hoy.getFullYear();
    const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
    const anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;

    function cargarResumen() {
        // CORRECCIÓN: Uso de fetchAPI
        fetchAPI('/api/movimientos')
        .then(response => response.json())
        .then(data => {
            
            let ingresosTotalesHistoricos = 0;
            let egresosTotalesHistoricos = 0;
            let ingresosMesActual = 0;
            let ingresosMesPasado = 0;

            // --- DATOS PARA GRÁFICAS ---
            let gastosPorCategoria = {
                'compra': 0,
                'gasto-operativo': 0,
                'gasto-extraordinario': 0,
                'otro': 0
            };
            let flujoMensual = {}; // Estructura: "Ene": {ingreso: 0, egreso: 0}

            data.forEach(mov => {
                const monto = parseFloat(mov.monto);
                // Asegurar formato fecha correcto para gráficas
                const fechaMov = new Date(mov.fecha + 'T00:00:00'); 
                
                // --- Procesar Gráfica de Barras (Meses) ---
                const mesKey = fechaMov.toLocaleString('es-MX', { month: 'short' });
                // Inicializar mes si no existe
                if (!flujoMensual[mesKey]) flujoMensual[mesKey] = { ingreso: 0, egreso: 0, orden: fechaMov.getTime() };

                if (monto >= 0) {
                    ingresosTotalesHistoricos += monto;
                    flujoMensual[mesKey].ingreso += monto; // Sumar al mes
                } else {
                    egresosTotalesHistoricos += monto; 
                    flujoMensual[mesKey].egreso += Math.abs(monto); // Sumar al mes (positivo para gráfica)

                    // --- Procesar Gráfica Pastel (Categorías) ---
                    if (mov.tipo === 'egreso') {
                        const cat = mov.clasificacion || 'otro';
                        if (gastosPorCategoria[cat] !== undefined) {
                            gastosPorCategoria[cat] += Math.abs(monto);
                        } else {
                            gastosPorCategoria['otro'] += Math.abs(monto);
                        }
                    }
                }

                // Lógica de KPI (Mes actual vs pasado)
                if (mov.tipo === 'ingreso' && monto > 0) {
                    if (fechaMov.getMonth() === mesActual && fechaMov.getFullYear() === anioActual) {
                        ingresosMesActual += monto;
                    }
                    else if (fechaMov.getMonth() === mesAnterior && fechaMov.getFullYear() === anioAnterior) {
                        ingresosMesPasado += monto;
                    }
                }
            });

            // Actualizar DOM (KPIs)
            if(totalIngresosEl) totalIngresosEl.textContent = formatCurrency(ingresosTotalesHistoricos);
            if(totalEgresosEl) totalEgresosEl.textContent = formatCurrency(egresosTotalesHistoricos);
            const balanceTotal = ingresosTotalesHistoricos + egresosTotalesHistoricos;
            
            if(totalAcumuladoEl) {
                totalAcumuladoEl.textContent = formatCurrency(balanceTotal);
                if (balanceTotal >= 0) {
                    totalAcumuladoEl.className = 'positive-feedback';
                } else {
                    totalAcumuladoEl.className = 'negative-feedback';
                }
            }

            // Calcular Tendencia
            calcularTendencia(ingresosMesActual, ingresosMesPasado);

            // --- RENDERIZAR GRÁFICAS ---
            renderizarGraficaPastel(gastosPorCategoria);
            renderizarGraficaBarras(flujoMensual);

        })
        .catch(error => console.error("Error cargando dashboard:", error));
    }

    function calcularTendencia(actual, pasado) {
        if(!mensajeTendenciaEl) return;
        let mensaje = "";
        let claseColor = "";
        let icono = "";

        if (pasado === 0) {
            if (actual > 0) {
                 mensaje = "¡Primeros ingresos del periodo!";
                 claseColor = "trend-up";
                 icono = "<i class='fas fa-star'></i>";
            } else {
                 mensaje = "Sin actividad reciente.";
                 claseColor = "trend-neutral";
                 icono = "<i class='fas fa-minus'></i>";
            }
        } else {
            const diferencia = actual - pasado;
            const porcentaje = ((diferencia / pasado) * 100).toFixed(1);

            if (diferencia > 0) {
                mensaje = `Oye, tus ingresos mejoraron un <strong>${porcentaje}%</strong> respecto al mes pasado.`;
                claseColor = "trend-up";
                icono = "<i class='fas fa-arrow-up'></i>";
            } else if (diferencia < 0) {
                mensaje = `Oye, tus ingresos disminuyeron un <strong>${Math.abs(porcentaje)}%</strong> respecto al mes pasado.`;
                claseColor = "trend-down";
                icono = "<i class='fas fa-arrow-down'></i>";
            } else {
                mensaje = "Tus ingresos se mantienen igual que el mes pasado.";
                claseColor = "trend-neutral";
                icono = "<i class='fas fa-equals'></i>";
            }
        }
        mensajeTendenciaEl.innerHTML = `${icono} ${mensaje}`;
        mensajeTendenciaEl.className = `trend-message ${claseColor}`;
    }

    // --- GRÁFICA 1: PASTEL ---
    function renderizarGraficaPastel(datos) {
        const canvas = document.getElementById('gastosChart');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if (chartGastos) chartGastos.destroy(); // Limpiar si ya existe

        const labels = {
            'compra': 'Compras',
            'gasto-operativo': 'Operativos',
            'gasto-extraordinario': 'Extras',
            'otro': 'Otros'
        };

        chartGastos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(datos).map(k => labels[k] || k),
                datasets: [{
                    data: Object.values(datos),
                    backgroundColor: ['#E67A2E', '#F2C14E', '#c0392b', '#95a5a6'], // Colores de tu marca
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    // --- GRÁFICA 2: BARRAS ---
    function renderizarGraficaBarras(datosMeses) {
        const canvas = document.getElementById('balanceChart');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if (chartBalance) chartBalance.destroy();

        // Convertir a array y ordenar cronológicamente
        const arrayMeses = Object.keys(datosMeses).map(key => ({
            mes: key, ...datosMeses[key]
        })).sort((a, b) => a.orden - b.orden);

        // Mostrar solo últimos 6 meses
        const dataFinal = arrayMeses.slice(-6);

        chartBalance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dataFinal.map(d => d.mes),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: dataFinal.map(d => d.ingreso),
                        backgroundColor: '#8A8B5A', // Verde Oliva
                        borderRadius: 4
                    },
                    {
                        label: 'Egresos',
                        data: dataFinal.map(d => d.egreso),
                        backgroundColor: '#D23507', // Rojo
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // --- NUEVO: Cargar Próximos Vencimientos (MANTENIDO IGUAL) ---
    function cargarVencimientos() {
        // CORRECCIÓN: Uso de fetchAPI
        fetchAPI('/api/cuentas')
        .then(response => response.json())
        .then(data => {
            const listaEl = document.getElementById('lista-vencimientos');
            if(!listaEl) return;
            listaEl.innerHTML = '';

            // Filtrar: Solo pendientes y con fecha límite
            const pendientes = data.filter(c => 
                (c.monto_total - c.monto_abonado) > 0.01 && c.fecha_limite
            );

            // Ordenar por fecha
            pendientes.sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));

            const proximos = pendientes.slice(0, 5);

            if (proximos.length === 0) {
                listaEl.innerHTML = '<li style="padding: 15px; color: #7f8c8d;">¡Todo al día! No hay vencimientos próximos.</li>';
                return;
            }

            proximos.forEach(cuenta => {
                const saldo = cuenta.monto_total - cuenta.monto_abonado;
                const fechaLim = new Date(cuenta.fecha_limite);
                const hoy = new Date();
                hoy.setHours(0,0,0,0);
                
                const diffTime = fechaLim - hoy; 
                const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                let etiqueta = "";
                let color = "#2c3e50"; 

                if (diasRestantes < 0) {
                    etiqueta = `Venció hace ${Math.abs(diasRestantes)} días`;
                    color = "#c0392b"; // Rojo
                } else if (diasRestantes === 0) {
                    etiqueta = "¡Vence HOY!";
                    color = "#d35400"; // Naranja
                } else {
                    etiqueta = `Vence en ${diasRestantes} días`;
                }

                const item = `
                    <li style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="display: block; font-size: 1.1em;">${cuenta.proveedor}</strong>
                            <span style="font-size: 0.9em; color: ${color}; font-weight: bold;">
                                <i class="far fa-clock"></i> ${etiqueta} (${cuenta.fecha_limite})
                            </span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #4A2F22;">${formatCurrency(saldo)}</div>
                            <small style="color: #95a5a6;">Pendiente</small>
                        </div>
                    </li>
                `;
                listaEl.innerHTML += item;
            });
        });
    }

    cargarResumen();
    cargarVencimientos();
});