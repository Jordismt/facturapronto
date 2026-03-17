/**
 * FACTURAPRONTO PRO - Gestión Empresarial Local
 * Lógica de aplicación corregida y completada
 */

// --- CONFIGURACIÓN INICIAL Y ESTADOS ---
let historial = JSON.parse(localStorage.getItem('historialFacturas')) || [];
let clientes = JSON.parse(localStorage.getItem('baseClientes')) || [];
let logoEmpresa = localStorage.getItem('logoEmpresa') || null;

// --- ELEMENTOS DEL DOM ---
const facturaForm = document.getElementById('facturaForm');
const btnAnadirFila = document.getElementById('btnAnadirFila');
const contenedorConceptos = document.getElementById('contenedorConceptos');
const inputLogo = document.getElementById('inputLogo');
const previewLogo = document.getElementById('previewLogo');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosEmisor();
    actualizarInterfaz();
    if (logoEmpresa) mostrarLogo();
});

// --- LÓGICA DE BORRADO (CORREGIDA) ---

/**
 * Borra ÚNICAMENTE el historial de facturas (Ventas).
 * Mantiene intactos los datos de empresa, el logo y el selector de clientes.
 */
function limpiarSoloHistorial() {
    if (confirm("¿Deseas borrar solo el historial de facturas? Tus datos de empresa y clientes NO se borrarán.")) {
        historial = [];
        localStorage.setItem('historialFacturas', JSON.stringify(historial));
        actualizarInterfaz();
        alert("✅ Registro de ventas limpiado con éxito.");
    }
}

/**
 * Resetea el sistema completo (Configuración de fábrica).
 * Borra TODO del navegador. Requiere doble confirmación.
 */
function resetAbsoluto() {
    if (confirm("⚠️ AVISO CRÍTICO: Vas a eliminarlo TODO (Datos de empresa, Logo, Clientes e Historial).")) {
        if (confirm("¿Estás 100% seguro? Esta acción no se puede deshacer a menos que tengas un Backup.")) {
            localStorage.clear();
            alert("Sistema reiniciado. La página se recargará.");
            location.reload();
        }
    }
}

// --- GESTIÓN DE FILAS DINÁMICAS ---
btnAnadirFila.addEventListener('click', () => {
    const nuevaFila = document.createElement('div');
    nuevaFila.className = "flex flex-col md:flex-row gap-3 fila-concepto p-4 md:p-0 bg-slate-50 md:bg-transparent rounded-2xl border border-slate-100 md:border-0 animate-fade";
    nuevaFila.innerHTML = `
        <input type="text" placeholder="Concepto o descripción" required class="flex-grow p-4 bg-white md:bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-slate-200 transition text-sm">
        <div class="flex gap-2">
            <input type="number" placeholder="Cant." value="1" min="1" required class="w-1/3 md:w-20 p-4 bg-white md:bg-slate-50 rounded-2xl text-center font-bold text-sm">
            <input type="number" step="0.01" placeholder="Precio" required class="flex-1 md:w-32 p-4 bg-white md:bg-slate-50 rounded-2xl text-right font-bold text-blue-600 text-sm">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-3 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
    `;
    contenedorConceptos.appendChild(nuevaFila);
});

// --- GESTIÓN DE LOGO ---
inputLogo.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        logoEmpresa = reader.result;
        localStorage.setItem('logoEmpresa', logoEmpresa);
        mostrarLogo();
    }
    if (file) reader.readAsDataURL(file);
});

function mostrarLogo() {
    previewLogo.innerHTML = `<img src="${logoEmpresa}" class="h-full w-full object-contain p-2">`;
}

// --- DATOS DEL EMISOR ---
const camposEmisor = ['miNombre', 'miNif', 'miDireccion', 'miIban', 'proximaFactura'];
camposEmisor.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', () => {
            localStorage.setItem(id, el.value);
        });
    }
});

function cargarDatosEmisor() {
    camposEmisor.forEach(id => {
        const valor = localStorage.getItem(id);
        const el = document.getElementById(id);
        if (valor && el) el.value = valor;
    });
    if (!document.getElementById('proximaFactura').value) {
        document.getElementById('proximaFactura').value = 1;
    }
}

// --- PROCESAR FACTURA ---
facturaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const idFactura = "FAC-" + document.getElementById('proximaFactura').value.padStart(4, '0');
    const aplicarIrpf = document.getElementById('aplicarIrpf').checked;
    
    // Capturar conceptos
    const filas = document.querySelectorAll('.fila-concepto');
    let subtotal = 0;
    const conceptos = Array.from(filas).map(f => {
        const inputsNum = f.querySelectorAll('input[type="number"]');
        const desc = f.querySelector('input[type="text"]').value;
        const cant = parseFloat(inputsNum[0].value);
        const precio = parseFloat(inputsNum[1].value);
        const totalFila = cant * precio;
        subtotal += totalFila;
        return { desc, cant, precio, total: totalFila };
    });

    const iva = subtotal * 0.21;
    const irpf = aplicarIrpf ? subtotal * 0.15 : 0;
    const totalFinal = subtotal + iva - irpf;

    const factura = {
        id: idFactura,
        fecha: new Date().toLocaleDateString(),
        cliente: document.getElementById('cliente').value,
        nifCliente: document.getElementById('nifCliente').value,
        emailCliente: document.getElementById('emailCliente').value,
        dirCliente: document.getElementById('dirCliente').value,
        conceptos, subtotal, iva, irpf,
        total: totalFinal
    };

    // Guardar en Historial y Base de Clientes
    gestionarBaseClientes(factura);
    historial.push(factura);
    localStorage.setItem('historialFacturas', JSON.stringify(historial));

    // Incrementar Contador
    const prox = parseInt(document.getElementById('proximaFactura').value) + 1;
    document.getElementById('proximaFactura').value = prox;
    localStorage.setItem('proximaFactura', prox);

    generarPDF(factura);
    actualizarInterfaz();
    mostrarNotificacion(factura);
    
    // Limpiar campos de conceptos (dejar solo uno)
    contenedorConceptos.innerHTML = '';
    btnAnadirFila.click();
});

// --- ACTUALIZAR INTERFAZ ---
function actualizarInterfaz() {
    const tbody = document.getElementById('tablaHistorial');
    const divMovil = document.getElementById('historialMovil');
    let sumaTotal = 0;

    tbody.innerHTML = '';
    divMovil.innerHTML = '';

    historial.slice().reverse().forEach((f, idx) => {
        const indexReal = historial.length - 1 - idx;
        sumaTotal += f.total;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="px-8 py-4 font-bold text-slate-400 text-xs">${f.id}</td>
                <td class="px-8 py-4 font-semibold text-slate-700">${f.cliente}</td>
                <td class="px-8 py-4 text-right font-extrabold text-slate-900">${f.total.toFixed(2)}€</td>
                <td class="px-8 py-4 text-right">
                    <button onclick="eliminarFactura(${indexReal})" class="text-slate-300 hover:text-red-500 transition text-xs">✕</button>
                </td>
            </tr>`;

        divMovil.innerHTML += `
            <div class="p-5 flex justify-between items-center bg-white border-b border-slate-50">
                <div>
                    <p class="text-[9px] font-black text-blue-500 uppercase">${f.id}</p>
                    <p class="font-bold text-slate-800">${f.cliente}</p>
                </div>
                <div class="text-right">
                    <p class="font-black text-slate-900">${f.total.toFixed(2)}€</p>
                    <button onclick="eliminarFactura(${indexReal})" class="text-[10px] text-red-400 uppercase font-bold">Borrar</button>
                </div>
            </div>`;
    });

    document.getElementById('totalMes').textContent = `${sumaTotal.toFixed(2)}€`;
    
    // Actualizar selector de clientes
    const select = document.getElementById('selectClientes');
    select.innerHTML = '<option value="">Seleccionar cliente guardado...</option>';
    clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify(c);
        opt.textContent = c.nombre;
        select.appendChild(opt);
    });
}

// --- GESTIÓN DE CLIENTES ---
function gestionarBaseClientes(f) {
    if (!clientes.some(c => c.nif === f.nifCliente)) {
        clientes.push({
            nombre: f.cliente, nif: f.nifCliente, email: f.emailCliente, dir: f.dirCliente
        });
        localStorage.setItem('baseClientes', JSON.stringify(clientes));
    }
}

document.getElementById('selectClientes').addEventListener('change', (e) => {
    if(e.target.value) {
        const c = JSON.parse(e.target.value);
        document.getElementById('cliente').value = c.nombre;
        document.getElementById('nifCliente').value = c.nif;
        document.getElementById('emailCliente').value = c.email;
        document.getElementById('dirCliente').value = c.dir;
    }
});

// --- PDF PROFESIONAL & 100% LEGAL ---
function generarPDF(f) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // --- PALETA DE COLORES PREMIUM ---
    const C_PRIMARIO = [30, 41, 59];   // Slate 800
    const C_ACCENTO = [37, 99, 235];    // Blue 600
    const C_TEXTO_SUAVE = [100, 116, 139]; // Slate 500
    const C_BORDE = [226, 232, 240];    // Slate 200

    const margenX = 20;
    let cursorY = 20;

    // --- 1. CABECERA (BRANDING & EMISOR) ---
    if (logoEmpresa) {
        try {
            doc.addImage(logoEmpresa, 'PNG', margenX, cursorY, 25, 25, undefined, 'FAST');
        } catch(e) { console.error("Error logo:", e); }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(localStorage.getItem('miNombre') || "EMISOR NO CONFIGURADO", 190, cursorY + 5, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    doc.text(`NIF/CIF: ${localStorage.getItem('miNif') || "---"}`, 190, cursorY + 10, { align: 'right' });
    doc.text(localStorage.getItem('miDireccion') || "Dirección Fiscal no configurada", 190, cursorY + 14, { align: 'right', maxWidth: 70 });
    
    cursorY += 35;

    // --- 2. TÍTULO Y REFERENCIA ---
    doc.setDrawColor(C_BORDE[0], C_BORDE[1], C_BORDE[2]);
    doc.line(margenX, cursorY, 190, cursorY);
    
    cursorY += 12;
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text("FACTURA", margenX, cursorY);

    doc.setFontSize(9);
    doc.text("Nº FACTURA", 130, cursorY - 4);
    doc.text("FECHA EMISIÓN", 165, cursorY - 4);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C_ACCENTO[0], C_ACCENTO[1], C_ACCENTO[2]);
    doc.text(f.id, 130, cursorY);
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(f.fecha, 165, cursorY);

    cursorY += 15;

    // --- 3. SECCIÓN CLIENTE (BILL TO) ---
    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(margenX, cursorY, 170, 28, 2, 2, 'F');
    
    let clienteY = cursorY + 7;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    doc.text("DATOS DEL CLIENTE / RECEPTOR", margenX + 5, clienteY);
    
    doc.setFontSize(10);
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(f.cliente.toUpperCase(), margenX + 5, clienteY + 6);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`NIF/CIF: ${f.nifCliente}`, margenX + 5, clienteY + 11);
    doc.text(`Dirección: ${f.dirCliente}`, margenX + 5, clienteY + 16, { maxWidth: 160 });

    cursorY += 38;

    // --- 4. TABLA DE CONCEPTOS ---
    doc.autoTable({
        startY: cursorY,
        head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
        body: f.conceptos.map(c => [
            c.desc, 
            c.cant, 
            c.precio.toFixed(2) + " €", 
            c.total.toFixed(2) + " €"
        ]),
        margin: { left: margenX, right: margenX },
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: C_TEXTO_SUAVE, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: C_PRIMARIO, cellPadding: 4 },
        columnStyles: { 
            1: { halign: 'center' }, 
            2: { halign: 'right' }, 
            3: { halign: 'right', fontStyle: 'bold' } 
        },
        didDrawPage: (data) => {
            doc.setDrawColor(C_ACCENTO[0], C_ACCENTO[1], C_ACCENTO[2]);
            doc.setLineWidth(0.4);
            doc.line(margenX, data.settings.startY + 7, 190, data.settings.startY + 7);
        }
    });

    // --- 5. TOTALES DESGLOSADOS ---
    let finalY = doc.lastAutoTable.finalY + 15;
    const posXEtiqueta = 130;
    const posXValor = 185;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    
    // Base
    doc.text("BASE IMPONIBLE", posXEtiqueta, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(f.subtotal.toFixed(2) + " €", posXValor, finalY, { align: 'right' });
    
    // IVA
    finalY += 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    doc.text("IVA (21%)", posXEtiqueta, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(f.iva.toFixed(2) + " €", posXValor, finalY, { align: 'right' });
    
    if (f.irpf > 0) {
        finalY += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
        doc.text("RETENCIÓN IRPF (15%)", posXEtiqueta, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("- " + f.irpf.toFixed(2) + " €", posXValor, finalY, { align: 'right' });
    }

    // CUADRO TOTAL FINAL
    finalY += 10;
    doc.setFillColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.roundedRect(posXEtiqueta - 5, finalY - 6, 65, 14, 1.5, 1.5, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL FACTURA", posXEtiqueta, finalY + 3);
    
    doc.setFontSize(12);
    doc.text(f.total.toFixed(2) + " €", 185, finalY + 3, { align: 'right' });

    // --- 6. PAGO Y LEGAL ---
    finalY += 25;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    doc.text("INFORMACIÓN DE PAGO", margenX, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C_PRIMARIO[0], C_PRIMARIO[1], C_PRIMARIO[2]);
    doc.text(`Transferencia bancaria (IBAN): ${localStorage.getItem('miIban') || "No especificado"}`, margenX, finalY + 5);

    // --- PIE LEGAL (100% Obligatorio) ---
    doc.setFontSize(7);
    doc.setTextColor(C_TEXTO_SUAVE[0], C_TEXTO_SUAVE[1], C_TEXTO_SUAVE[2]);
    const pieY = 275;
    doc.text("Nota legal: Factura emitida de conformidad con el Reglamento por el que se regulan las obligaciones de facturación (RD 1619/2012).", margenX, pieY);
    doc.text("Este documento es una factura oficial. Gracias por su confianza.", margenX, pieY + 4);
    
    doc.setFont("helvetica", "bold");
    doc.text("SISTEMA FACTURAPRONTO PRO", 190, pieY + 4, { align: 'right' });

    doc.save(`${f.id}_${f.cliente.replace(/\s+/g, '_')}.pdf`);
}
function eliminarFactura(index) {
    if(confirm("¿Eliminar factura del registro?")) {
        historial.splice(index, 1);
        localStorage.setItem('historialFacturas', JSON.stringify(historial));
        actualizarInterfaz();
    }
}

function exportarBackup() {
    const data = {
        historial, clientes,
        emisor: {
            nombre: localStorage.getItem('miNombre'),
            nif: localStorage.getItem('miNif'),
            dir: localStorage.getItem('miDireccion'),
            iban: localStorage.getItem('miIban'),
            next: localStorage.getItem('proximaFactura')
        },
        logo: logoEmpresa
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Backup_FP_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

document.getElementById('importarBackup').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        if(confirm("¿Importar Backup? Se sobrescribirá la configuración actual.")) {
            localStorage.setItem('historialFacturas', JSON.stringify(data.historial || []));
            localStorage.setItem('baseClientes', JSON.stringify(data.clientes || []));
            localStorage.setItem('logoEmpresa', data.logo || "");
            if(data.emisor) {
                localStorage.setItem('miNombre', data.emisor.nombre || "");
                localStorage.setItem('miNif', data.emisor.nif || "");
                localStorage.setItem('miDireccion', data.emisor.dir || "");
                localStorage.setItem('miIban', data.emisor.iban || "");
                localStorage.setItem('proximaFactura', data.emisor.next || 1);
            }
            location.reload();
        }
    };
    reader.readAsText(e.target.files[0]);
});

function exportarCSV() {
    let csv = "ID;Fecha;Cliente;Monto\n";
    historial.forEach(f => csv += `${f.id};${f.fecha};${f.cliente};${f.total.toFixed(2)}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Registro_Ventas.csv";
    a.click();
}

// --- NOTIFICACIONES ---
function mostrarNotificacion(f) {
    const box = document.getElementById('notificacionEmail');
    box.classList.remove('translate-y-32', 'opacity-0');
    document.getElementById('btnAbrirEmail').onclick = () => {
        const sub = `Factura ${f.id}`;
        const body = `Hola ${f.cliente}, adjunto envío la factura por importe de ${f.total.toFixed(2)}€.`;
        window.location.href = `mailto:${f.emailCliente}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    };
}

function cerrarNotificacion() {
    document.getElementById('notificacionEmail').classList.add('translate-y-32', 'opacity-0');
}

// Lógica para que el botón de ayuda funcione al hacer click (especialmente en móviles)
const ayudaBtn = document.querySelector('#ayudaTooltip div');
const ayudaMenu = document.getElementById('ayudaMenu');

ayudaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = ayudaMenu.style.display === 'block';
    ayudaMenu.style.display = isVisible ? 'none' : 'block';
});

// Cerrar el menú si se hace click fuera
document.addEventListener('click', () => {
    ayudaMenu.style.display = 'none';
});