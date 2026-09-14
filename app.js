// === CONFIGURACIÓN GOOGLE SHEETS ===
// AQUÍ PEGUÉ TU NUEVO LINK:
// LIMPIAR CUALQUIER ESTADO BLOQUEADO DEL NAVEGADOR AL CARGAR
localStorage.removeItem("pedido_ya_confirmado");
sessionStorage.removeItem("pedido_bloqueado");
sessionStorage.removeItem("ultimo_pedido");

const URL_GOOGLE_SHEET = "https://script.google.com/macros/s/AKfycbyJattTf9tVMhzO-1Dx67D4ZQM8vUWaSbHGVjEtAUMEv6dtu6x0NMUxqjXJa5WmaolZVQ/exec";

// ID de sesión única para rastrear el carrito del cliente de forma anónima
let sessionId = localStorage.getItem("sesion_carrito_dulcitos") || Math.random().toString(36).substring(2, 15);
localStorage.setItem("sesion_carrito_dulcitos", sessionId);


// 1. BASE DE DATOS DE PRODUCTOS
let productos = [];

let carrito = [];
let productoActual = null; // Variable para almacenar el producto del modal

// === FUNCIÓN DE REGISTRO UNIFICADA (Local + Google Sheets) ===
// AGREGADO: parámetro elementoClicado
function registrarAccionAdmin(nombreProducto, tipoAccion, precio = 0, elementoClicado = "") {
    let ahora = new Date();
    let fechaStr = ahora.toLocaleDateString();
    let horaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Guardar en memoria local (compatibilidad con tu panel local)
    let historial = JSON.parse(localStorage.getItem("stats_historial_detallado")) || [];
    historial.unshift({
        fecha: fechaStr,
        hora: horaStr,
        producto: nombreProducto,
        comproWp: "No"
    });
    localStorage.setItem("stats_historial_detallado", JSON.stringify(historial));

    // 2. Enviar datos en tiempo real a Google Sheets
    let datos = {
        fecha: fechaStr,
        hora: horaStr,
        producto: nombreProducto,
        precio: precio,
        tipo_accion: tipoAccion,
        id_sesion: sessionId,
        elemento_clicado: elementoClicado // AGREGADO: Esto viaja a Google Sheets
    };

    fetch(URL_GOOGLE_SHEET, {
        method: 'POST',
        body: JSON.stringify(datos),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).catch(error => console.log("Error de sincronización con Google Sheets:", error));
}

// === MENÚ LATERAL HAMBURGUESA ===
const btnAbrirMenu = document.getElementById("btn-abrir-menu");
const btnCerrarMenu = document.getElementById("btn-cerrar-menu");
const sidebarMenu = document.getElementById("sidebar-menu");
const overlayMenu = document.getElementById("overlay-menu");

btnAbrirMenu.addEventListener("click", () => {
    sidebarMenu.classList.add("activo");
    overlayMenu.classList.add("activo");
});

function cerrarMenu() {
    sidebarMenu.classList.remove("activo");
    overlayMenu.classList.remove("activo");
}

btnCerrarMenu.addEventListener("click", cerrarMenu);
overlayMenu.addEventListener("click", cerrarMenu);

// === CATÁLOGO ===
function filtrarCatalogo(filtro) {
    const contenedor = document.getElementById("catalogo");
    contenedor.innerHTML = ""; 
    
    let productosAMostrar = productos;
    
    if (filtro !== "Todo") {
        productosAMostrar = productos.filter(producto => 
            producto.categoria === filtro || producto.subcategoria === filtro
        );
    }
    
    if (productosAMostrar.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: span 4; text-align: center;'>No se encontraron productos.</p>";
    }
    
    productosAMostrar.forEach(producto => {
        let textoBoton = "Agregar al carrito";
        if (producto.id === 13) {
            textoBoton = "Seleccionar sabores";
        } else if (producto.id === 5 || producto.id === 6) {
            textoBoton = "Seleccionar unidades";
        }

        // AGREGADO: En los 'onclick' ahora pasamos 'foto' o 'titulo'
        contenedor.innerHTML += `
            <div style="background-color: white; color: #333; border: 1px solid #e8d0d8; border-radius: 8px; padding: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
                
                <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-img" onclick="abrirModalProducto(${producto.id}, 'foto')">
                
                <h3 style="margin: 10px 0; font-size: 16px; color: #4a2c35; cursor: pointer;" 
                    onclick="abrirModalProducto(${producto.id}, 'titulo')">${producto.nombre}</h3>
                
                <p style="margin-bottom: 12px; font-weight: bold; font-size: 14px;">Precio: $${producto.precio}</p>
                
                <button onclick="agregarAlCarrito(${producto.id})" style="padding: 10px; cursor: pointer; background-color: #f7c3d3; color: #4a2c35; border: none; border-radius: 5px; font-weight: bold; font-size: 13px;">
                    ${textoBoton}
                </button>
            </div>
        `;
    });

    cerrarMenu();
}

// === MODAL DETALLE DE PRODUCTO ===
// AGREGADO: recibe el parámetro de qué elemento se clicó
function abrirModalProducto(id, elementoClicado) {
    const producto = productos.find(p => p.id === id);
    const modal = document.getElementById("modal-producto");
    const imagenElemento = document.getElementById("modal-producto-img");
    const tituloElemento = document.getElementById("modal-producto-titulo");
    const descElemento = document.getElementById("modal-producto-desc");

    imagenElemento.src = producto.imagen;
    tituloElemento.innerText = producto.nombre;
    descElemento.innerText = producto.descripcion;

    // Registra que el usuario vio el detalle del producto, sumando "foto" o "titulo"
    registrarAccionAdmin(producto.nombre, "👁️ Vio los detalles", producto.precio, elementoClicado);

    modal.style.display = "flex";
}

function cerrarModalProducto() {
    const modal = document.getElementById("modal-producto");
    modal.style.display = "none";
}

// === MODAL VARIANTES DE DONAS ===
function abrirModalDonas() {
    document.getElementById("modal-donas").style.display = "flex";
}

function cerrarModalDonas() {
    document.getElementById("modal-donas").style.display = "none";
}

function confirmarAgregarDona() {
    const opciones = document.getElementsByName("sabor-dona");
    let saborSeleccionado = "";
    
    for (let i = 0; i < opciones.length; i++) {
        if (opciones[i].checked) {
            saborSeleccionado = opciones[i].value;
            break;
        }
    }
    
    const productoDona = productos.find(p => p.id === 13);
    const nombreConSabor = `${productoDona.nombre} (${saborSeleccionado})`;
    
    insertarEnCarrito(nombreConSabor, productoDona.precio);
    cerrarModalDonas();
}

// === MODAL CANTIDAD DE ALFAJORES ===
let alfajorSeleccionadoId = null;

function abrirModalAlfajores(idProducto) {
    alfajorSeleccionadoId = idProducto;
    const producto = productos.find(p => p.id === idProducto);
    
    productoActual = producto; // GUARDAMOS EL PRODUCTO ACTUAL PARA USARLO AL CONFIRMAR
    
    document.getElementById("titulo-modal-alfajores").innerText = `Selecciona la cantidad de ${producto.nombre}`;
    document.getElementById("modal-alfajores").style.display = "flex";
}

function cerrarModalAlfajores() {
    document.getElementById("modal-alfajores").style.display = "none";
    alfajorSeleccionadoId = null;
}

function confirmarAgregarAlfajor() {
    const radioSeleccionado = document.querySelector('input[name="cantidad-alfajor"]:checked');
    if (!radioSeleccionado) return;

    if (!productoActual) {
        console.error("Error: no se detectó el productoActual");
        return;
    }

    const cantidadUnidades = Number(radioSeleccionado.getAttribute('data-cantidad')); // 6, 12 o 24
    const textoCantidad = radioSeleccionado.getAttribute('data-texto'); // "Por 6 unidades"
    
    const precioUnitario = Number(productoActual.precio || productoActual.Precio); // Viene de Google Sheets [cite: 14]
    const precioTotal = precioUnitario * cantidadUnidades; // Calcula el total [cite: 14]

    const itemCarrito = {
        nombre: `${productoActual.nombre} (${textoCantidad})`,
        precio: precioTotal
    };

    if (typeof carrito !== 'undefined') {
        carrito.push(itemCarrito);
        
        let totalCarritos = parseInt(localStorage.getItem("stats_total_carritos") || 0) + 1;
        localStorage.setItem("stats_total_carritos", totalCarritos);

        registrarAccionAdmin(itemCarrito.nombre, "🛒 Agregó alfajor al carrito", precioTotal);

        actualizarVistaCarrito();
        document.getElementById("seccion-carrito-desplegable").style.display = "block";
        cerrarModalAlfajores();
    }
}

// === LÓGICA DEL CARRITO ===
document.getElementById("btn-abrir-carrito").addEventListener("click", () => {
    const ventanaCarrito = document.getElementById("seccion-carrito-desplegable");
    if (ventanaCarrito.style.display === "none" || ventanaCarrito.style.display === "") {
        ventanaCarrito.style.display = "block";
    } else {
        ventanaCarrito.style.display = "none";
    }
});

function agregarAlCarrito(idProducto) {
    const productoElegido = productos.find(producto => producto.id === idProducto);
    
    if (productoElegido.id === 13) {
        abrirModalDonas();
        return;
    }
    
    if (productoElegido.id === 5 || productoElegido.id === 6) {
        abrirModalAlfajores(productoElegido.id);
        return;
    }

    insertarEnCarrito(productoElegido.nombre, productoElegido.precio);
}

function insertarEnCarrito(nombreProducto, precioProducto) {
    carrito.push({ nombre: nombreProducto, precio: precioProducto });
    
    let totalCarritos = parseInt(localStorage.getItem("stats_total_carritos") || 0) + 1;
    localStorage.setItem("stats_total_carritos", totalCarritos);

    // Registra la acción en Google Sheets y en local
    registrarAccionAdmin(nombreProducto, "🛒 Agregó al carrito", precioProducto);
    
    actualizarVistaCarrito();
    document.getElementById("seccion-carrito-desplegable").style.display = "block";
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const listaCarrito = document.getElementById("carrito");
    const textoTotal = document.getElementById("total-carrito");
    const contadorRojo = document.getElementById("contador-carrito");
    
    listaCarrito.innerHTML = ""; 
    let sumaTotal = 0;
    
    contadorRojo.innerText = carrito.length;
    if (carrito.length > 0) {
        contadorRojo.style.display = "block";
    } else {
        contadorRojo.style.display = "none";
        listaCarrito.innerHTML = "<p style='text-align:center; color:#999; margin: 20px 0;'>Tu carrito está vacío</p>";
    }

    carrito.forEach((producto, index) => {
        sumaTotal += producto.precio;
        
        listaCarrito.innerHTML += `
            <li style="margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #eee;">
                <span><strong>${producto.nombre}</strong> - $${producto.precio}</span>
                <button onclick="eliminarDelCarrito(${index})" style="background: #ef4444; color: white; border: none; padding: 5px 12px; font-size: 16px; border-radius: 4px; cursor: pointer;">❌</button>
            </li>
        `;
    });
    
    textoTotal.innerText = `Total: $${sumaTotal}`;
}

// === ENVÍO WHATSAPP ===
document.getElementById("btn-whatsapp").addEventListener("click", () => {
    if(carrito.length === 0) {
        alert("Tu carrito está vacío. Agrega productos para comprar.");
        return; 
    }

    const inputTitular = document.getElementById("input-titular");
    const inputWsp = document.getElementById("input-wsp");
    const nombreTitular = inputTitular ? inputTitular.value.trim() : "";
    const numeroWsp = inputWsp ? inputWsp.value.trim() : "";

    if (!nombreTitular || !numeroWsp) {
        alert("Por favor completá el nombre del titular y tu WhatsApp antes de continuar.");
        return;
    }

    let textoMensaje = "¡Hola! Quiero confirmar este pedido:\n\n";
    let total = 0;

    carrito.forEach(producto => {
        textoMensaje += `- ${producto.nombre} ($${producto.precio})\n`;
        total += producto.precio;
    });

    textoMensaje += `\n*Total a pagar: $${total}*\n`;
    textoMensaje += `\nTitular de mi transferencia: ${nombreTitular}`;
    textoMensaje += `\nMi WhatsApp: ${numeroWsp}`;
    textoMensaje += `\n\n¿Me pasas tu alias para transferir?`;

    const numeroWhatsApp = "5493424279070"; 
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(textoMensaje)}`;

    fetch(URL_GOOGLE_SHEET, {
        method: 'POST',
        body: JSON.stringify({
            tipo_accion: "comprar_whatsapp",
            id_sesion: sessionId,
            titular: nombreTitular,
            whatsapp: numeroWsp,
            precio: total // <-- Esto guarda el monto total en la columna Precio (D)
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).catch(error => console.log("Error registrando compra:", error));

    window.open(urlWhatsApp, '_blank');

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('activo');

    alert("¡Gracias por tu compra! Se abrió WhatsApp en otra pestaña.");

    carrito = [];
    actualizarVistaCarrito();

    if (inputTitular) inputTitular.value = "";
    if (inputWsp) inputWsp.value = "";

    setTimeout(() => {
        location.reload();
    }, 2000);
});

// Al cargar la página, inicializar el catálogo y carrito
window.addEventListener("DOMContentLoaded", () => {
    cargarCatalogo();
    actualizarVistaCarrito();
});

// === CARGAR PRODUCTOS DESDE GOOGLE SHEETS ===
async function cargarCatalogo() {
    const contenedor = document.getElementById("catalogo");
    contenedor.innerHTML = "<p style='grid-column: span 4; text-align: center;'>Cargando productos...</p>";

    try {
        const respuesta = await fetch(URL_GOOGLE_SHEET + "?productos=1");
        const datos = await respuesta.json();

        if (datos && Array.isArray(datos)) {
            productos = datos; 
            filtrarCatalogo("Todo"); 
        } else {
            contenedor.innerHTML = "<p style='grid-column: span 4; text-align: center;'>No se encontraron productos activos.</p>";
        }
    } catch (error) {
        console.error("Error cargando el catálogo:", error);
        contenedor.innerHTML = "<p style='grid-column: span 4; text-align: center; color: red;'>Error de conexión al cargar los productos.</p>";
    }
}
