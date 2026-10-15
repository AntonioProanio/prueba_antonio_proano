document.addEventListener("DOMContentLoaded", () => {
  const PANTALLA_MOVIL = window.matchMedia("(max-width: 768px)");
  const MOVIMIENTO_REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* =====================================================
     1. ENCABEZADO + MENÚ HAMBURGUESA
     ===================================================== */
  const encabezado = document.getElementById("encabezado");
  const botonMenu = document.getElementById("boton-menu");
  const menuNavegacion = document.getElementById("menu-navegacion");
  const enlacesNavegacion = [...menuNavegacion.querySelectorAll(".navegacion__enlace")];

  // Índice para animar los enlaces uno tras otro
  enlacesNavegacion.forEach((link, i) => link.parentElement.style.setProperty("--i", i));

  const estaMenuAbierto = () => menuNavegacion.classList.contains("navegacion--abierta");

  function establecerMenu(abierto, devolverFoco = false) {
    menuNavegacion.classList.toggle("navegacion--abierta", abierto);
    botonMenu.classList.toggle("boton-menu--abierto", abierto);
    encabezado.classList.toggle("encabezado--abierto", abierto);
    botonMenu.setAttribute("aria-expanded", String(abierto));
    botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    if (!abierto && devolverFoco) botonMenu.focus();
  }

  botonMenu.addEventListener("click", () => establecerMenu(!estaMenuAbierto()));

  // Cerrar al elegir un enlace
  enlacesNavegacion.forEach((link) => link.addEventListener("click", () => establecerMenu(false)));

  // Cerrar al hacer clic fuera del menú
  document.addEventListener("click", (e) => {
    if (estaMenuAbierto() && !encabezado.contains(e.target)) establecerMenu(false);
  });

  // Cerrar con la tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && estaMenuAbierto()) establecerMenu(false, true);
  });

  // Cerrar si la pantalla pasa a tamaño de escritorio
  PANTALLA_MOVIL.addEventListener("change", (e) => {
    if (!e.matches) establecerMenu(false);
  });

  // Encabezado que se encoge y se pinta de blanco al desplazarse
  let actualizandoEncabezado = false;
  const actualizarEncabezado = () => {
    encabezado.classList.toggle("encabezado--desplazado", window.scrollY > 40);
    actualizandoEncabezado = false;
  };
  window.addEventListener("scroll", () => {
    if (!actualizandoEncabezado) {
      requestAnimationFrame(actualizarEncabezado);
      actualizandoEncabezado = true;
    }
  }, { passive: true });
  actualizarEncabezado();

  // Resalta en el menú la sección que se está viendo
  const observadorSecciones = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      enlacesNavegacion.forEach((link) =>
        link.classList.toggle("navegacion__enlace--activo", link.getAttribute("href") === "#" + entry.target.id)
      );
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  enlacesNavegacion.forEach((link) => {
    const seccion = document.querySelector(link.getAttribute("href"));
    if (seccion) observadorSecciones.observe(seccion);
  });
  observadorSecciones.observe(document.getElementById("portada")); // en la portada no se resalta ningún enlace

  /* =====================================================
     2. CARRUSEL DE PRODUCTOS (solo en móvil/tablet)
        En escritorio los 3 productos se ven en fila.
     ===================================================== */
  const carrusel = document.getElementById("carrusel");
  const ventanaCarrusel = carrusel.querySelector(".carrusel__ventana");
  const pistaCarrusel = carrusel.querySelector(".carrusel__pista");
  const diapositivas = [...pistaCarrusel.children];
  const botonAnterior = carrusel.querySelector(".carrusel__boton--anterior");
  const botonSiguiente = carrusel.querySelector(".carrusel__boton--siguiente");
  const contenedorPuntos = carrusel.querySelector(".carrusel__puntos");
  const estadoCarrusel = carrusel.querySelector(".carrusel__estado");

  const INTERVALO_AUTOMATICO = 4500;
  let indiceCarrusel = 0;
  let temporizador = null;
  let visibleEnPantalla = true;
  let ratonEncima = false;
  let enfocadoDentro = false;

  // Puntos de navegación
  const puntosCarrusel = diapositivas.map((diapositiva, i) => {
    const puntoCarrusel = document.createElement("button");
    puntoCarrusel.type = "button";
    puntoCarrusel.className = "carrusel__punto";
    puntoCarrusel.setAttribute("aria-label", "Ir al producto " + (i + 1));
    puntoCarrusel.addEventListener("click", () => irAProducto(i));
    contenedorPuntos.appendChild(puntoCarrusel);
    return puntoCarrusel;
  });

  function actualizarVistaCarrusel() {
    if (!PANTALLA_MOVIL.matches) {
      // Escritorio: se restablece la fila normal
      pistaCarrusel.style.transform = "";
      pistaCarrusel.style.transition = "";
      diapositivas.forEach((s) => {
        s.inert = false;
        s.classList.remove("carrusel__diapositiva--activa");
      });
      return;
    }
    pistaCarrusel.style.transition = "";
    pistaCarrusel.style.transform = "translateX(" + -indiceCarrusel * 100 + "%)";
    diapositivas.forEach((s, i) => {
      s.classList.toggle("carrusel__diapositiva--activa", i === indiceCarrusel);
      s.inert = i !== indiceCarrusel; // los enlaces ocultos no reciben foco
    });
    puntosCarrusel.forEach((d, i) => {
      d.classList.toggle("carrusel__punto--activo", i === indiceCarrusel);
      d.setAttribute("aria-current", String(i === indiceCarrusel));
    });
    estadoCarrusel.textContent = "Producto " + (indiceCarrusel + 1) + " de " + diapositivas.length;
  }

  function irAProducto(i) {
    indiceCarrusel = (i + diapositivas.length) % diapositivas.length; // vuelve al inicio/final
    actualizarVistaCarrusel();
    reiniciarReproduccionAutomatica();
  }

  /* --- Reproducción automática inteligente --- */
  function detenerReproduccionAutomatica() {
    clearInterval(temporizador);
    temporizador = null;
  }

  function iniciarReproduccionAutomatica() {
    detenerReproduccionAutomatica();
    const puedeReproducir = PANTALLA_MOVIL.matches && !MOVIMIENTO_REDUCIDO.matches && visibleEnPantalla &&
      !ratonEncima && !enfocadoDentro && !document.hidden;
    if (puedeReproducir) temporizador = setInterval(() => irAProducto(indiceCarrusel + 1), INTERVALO_AUTOMATICO);
  }
  const reiniciarReproduccionAutomatica = iniciarReproduccionAutomatica;

  // Pausa al pasar el ratón o al enfocar con teclado
  carrusel.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") { ratonEncima = true; detenerReproduccionAutomatica(); }
  });
  carrusel.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") { ratonEncima = false; iniciarReproduccionAutomatica(); }
  });
  // Solo se pausa con el foco del teclado, no después de hacer clic con el ratón
  carrusel.addEventListener("focusin", (e) => {
    if (e.target.matches(":focus-visible")) { enfocadoDentro = true; detenerReproduccionAutomatica(); }
  });
  carrusel.addEventListener("focusout", () => { enfocadoDentro = false; iniciarReproduccionAutomatica(); });

  // Pausa si el carrusel no se ve en pantalla o si cambias de pestaña
  new IntersectionObserver((entries) => {
    visibleEnPantalla = entries[0].isIntersecting;
    iniciarReproduccionAutomatica();
  }, { threshold: 0.3 }).observe(carrusel);
  document.addEventListener("visibilitychange", iniciarReproduccionAutomatica);

  // Botones y teclado
  botonAnterior.addEventListener("click", () => irAProducto(indiceCarrusel - 1));
  botonSiguiente.addEventListener("click", () => irAProducto(indiceCarrusel + 1));
  carrusel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") irAProducto(indiceCarrusel - 1);
    if (e.key === "ArrowRight") irAProducto(indiceCarrusel + 1);
  });

  /* --- Deslizar con el dedo o arrastrar con el ratón --- */
  let arrastrando = false;
  let seMovio = false;
  let posicionInicialX = 0;
  let desplazamientoX = 0;

  ventanaCarrusel.addEventListener("pointerdown", (e) => {
    if (!PANTALLA_MOVIL.matches || (e.pointerType === "mouse" && e.button !== 0)) return;
    arrastrando = true;
    seMovio = false;
    posicionInicialX = e.clientX;
    desplazamientoX = 0;
    detenerReproduccionAutomatica();
  });

  ventanaCarrusel.addEventListener("pointermove", (e) => {
    if (!arrastrando) return;
    desplazamientoX = e.clientX - posicionInicialX;
    if (!seMovio && Math.abs(desplazamientoX) > 6) {
      seMovio = true;
      ventanaCarrusel.setPointerCapture(e.pointerId);
      pistaCarrusel.style.transition = "none"; // el carrusel sigue al dedo
    }
    if (seMovio) {
      pistaCarrusel.style.transform = "translateX(" + (-indiceCarrusel * ventanaCarrusel.offsetWidth + desplazamientoX) + "px)";
    }
  });

  const terminarArrastre = () => {
    if (!arrastrando) return;
    arrastrando = false;
    if (seMovio && Math.abs(desplazamientoX) > ventanaCarrusel.offsetWidth * 0.18) {
      irAProducto(indiceCarrusel + (desplazamientoX < 0 ? 1 : -1));
    } else {
      actualizarVistaCarrusel();
      iniciarReproduccionAutomatica();
    }
  };
  ventanaCarrusel.addEventListener("pointerup", terminarArrastre);
  ventanaCarrusel.addEventListener("pointercancel", terminarArrastre);

  // Si se arrastró, no se activa el botón "Comprar" por error
  ventanaCarrusel.addEventListener("click", (e) => {
    if (seMovio) {
      e.preventDefault();
      e.stopPropagation();
      seMovio = false;
    }
  }, true);

  // Al cambiar entre móvil y escritorio
  PANTALLA_MOVIL.addEventListener("change", () => {
    indiceCarrusel = 0;
    actualizarVistaCarrusel();
    iniciarReproduccionAutomatica();
  });

  actualizarVistaCarrusel();
  iniciarReproduccionAutomatica();

  /* =====================================================
     3. CAMBIO DE FONDO CON FUNDIDO SUAVE (ratón, toque y teclado)
        El fundido en sí lo hace el CSS; aquí solo se activa la clase.
     ===================================================== */
  const SIN_EFECTO_HOVER = window.matchMedia("(hover: none)");
  const portada = document.getElementById("portada");
  const botonPortada = document.getElementById("boton-portada");
  const reglasJuego = document.querySelector(".reglas__contenedor");

  function vincularEfecto(elemento, objetivo, nombreClase, { enfoque = false, duracionMs = 900 } = {}) {
    let temporizador;
    const activar = () => {
      clearTimeout(temporizador);
      objetivo.classList.add(nombreClase);
    };
    const desactivar = (e) => {
      clearTimeout(temporizador);
      const esToque = e && e.pointerType && e.pointerType !== "mouse";
      // Con el dedo el efecto se mantiene un momento para que se alcance a ver
      if (esToque) temporizador = setTimeout(() => objetivo.classList.remove(nombreClase), duracionMs);
      else objetivo.classList.remove(nombreClase);
    };
    elemento.addEventListener("pointerenter", activar);
    elemento.addEventListener("pointerdown", activar);
    elemento.addEventListener("pointerleave", desactivar);
    elemento.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") desactivar(e); });
    elemento.addEventListener("pointercancel", desactivar);
    if (enfoque) {
      // Solo con el foco del teclado (Tab), no tras tocar o hacer clic
      let porTeclado = false;
      elemento.addEventListener("focus", () => {
        if (elemento.matches(":focus-visible")) { porTeclado = true; activar(); }
      });
      elemento.addEventListener("blur", () => {
        if (porTeclado) { porTeclado = false; desactivar(); }
      });
    }
  }

  // Aviso al pulsar cualquiera de los botones "Comprar" de los productos
  const avisoCompra = document.getElementById("aviso-compra");
  const cerrarAvisoCompra = document.getElementById("cerrar-aviso-compra");
  const aceptarAvisoCompra = document.getElementById("aceptar-aviso-compra");

  document.querySelectorAll(".boton--producto").forEach((botonCompra) => {
    botonCompra.addEventListener("click", (evento) => {
      evento.preventDefault();
      avisoCompra.showModal();
    });
  });

  function cerrarAviso() {
    avisoCompra.close();
  }

  cerrarAvisoCompra.addEventListener("click", cerrarAviso);
  aceptarAvisoCompra.addEventListener("click", cerrarAviso);

  // Botón "Comprar" de la portada
  vincularEfecto(botonPortada, portada, "portada--alternativa", { enfoque: true });

  // Sección "Reglas del juego"
  if (SIN_EFECTO_HOVER.matches) {
    // En pantallas táctiles no existe el hover: el color cambia al ver la sección
    new IntersectionObserver((entries) => {
      reglasJuego.classList.toggle("reglas__contenedor--alternativo", entries[0].isIntersecting);
    }, { threshold: 0.4 }).observe(reglasJuego);
  } else {
    vincularEfecto(reglasJuego, reglasJuego, "reglas__contenedor--alternativo");
  }
});
