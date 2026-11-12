/* Flota: dos filas de autos que avanzan solas, sin fin (la de arriba hacia la derecha, la de abajo
   hacia la izquierda). No dependen del scroll de la página: para volver a ver un auto se arrastra la fila
   con el dedo o con el mouse (o se desliza con el trackpad). Al soltar, la fila sigue con su impulso
   y unos segundos después retoma su marcha sola. Con el mouse encima, la fila se detiene para leer.
   Si se elige una categoría en los filtros, se dejan de mover y se muestran juntos. */
(function () {
  "use strict";
  var EV = ["scroll", "wheel", "touchmove", "keydown"], hecho = false;
  var arrancar = function (e) {
    if (hecho || (e && e.type === "scroll" && window.scrollY < 40)) return;
    hecho = true;
    EV.forEach(function (n) { window.removeEventListener(n, arrancar); });
    if (window.requestIdleCallback) requestIdleCallback(iniciar, { timeout: 500 }); else setTimeout(iniciar, 50);
  };
  EV.forEach(function (n) { window.addEventListener(n, arrancar, { passive: true }); });
  window.addEventListener("load", function () { if (window.scrollY > 40) arrancar(); });

  function iniciar() {
    var sec = document.querySelector(".flota-desliza");
    if (!sec) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { sec.classList.add("filtrado"); return; }
    var movil = function () { return window.innerWidth < 760; };
    var aLaVista = true, cuadro = 0, previo = 0;

    /* Cada fila lleva una copia de sus tarjetas detrás, así al terminar empieza de nuevo sin que se note.
       Las copias no se leen con lector de pantalla ni reciben foco con Tab, pero sí se pueden tocar: su botón "Reservar este" usa el original. */
    var filas = [].slice.call(sec.querySelectorAll(".fila")).map(function (el, i) {
      var orig = [].slice.call(el.children);
      orig.forEach(function (a) {
        var c = a.cloneNode(true);
        c.classList.add("clon"); c.setAttribute("aria-hidden", "true"); /* sin "inert": sus botones tienen que poder tocarse */
        [].forEach.call(c.querySelectorAll("a,button"), function (b) { b.setAttribute("tabindex", "-1"); });
        var bo = a.querySelector("[data-reservar]"), bc = c.querySelector("[data-reservar]");
        if (bo && bc) bc.addEventListener("click", function (ev) { ev.preventDefault(); bo.click(); });
        el.appendChild(c);
      });
      return { el: el, primero: orig[0], copia: el.children[orig.length], dir: i === 0 ? 1 : -1,
               x: 0, ancho: 0, vel: 0, empuje: 0, quieta: 0, encima: false, toca: null };
    });

    /* ancho de un juego de tarjetas: la fila se mueve dentro de ese tramo y al pasarlo vuelve al inicio */
    var medir = function () {
      filas.forEach(function (f) {
        f.el.style.transform = "";
        f.ancho = f.copia.offsetLeft - f.primero.offsetLeft;
        f.x = f.dir > 0 ? -f.ancho * .5 : -f.ancho * .15; /* la de arriba empieza a mitad, para que no se vean iguales */
      });
      pintar(); seguir();
    };
    var ajustar = function (f) { if (f.ancho > 0) { f.x = f.x % f.ancho; if (f.x > 0) f.x -= f.ancho; } };
    var pintar = function () { filas.forEach(function (f) { f.el.style.transform = "translate3d(" + f.x.toFixed(2) + "px,0,0)"; }); };

    var corriendo = function () { return aLaVista && !document.hidden && !sec.classList.contains("filtrado"); };
    var paso = function (ahora) {
      cuadro = 0;
      if (!corriendo()) { previo = 0; return; }
      var dt = previo ? Math.min(ahora - previo, 50) : 16; previo = ahora;
      var crucero = movil() ? 34 : 46; /* píxeles por segundo */
      filas.forEach(function (f) {
        if (f.toca) return; /* mientras se arrastra, manda el dedo */
        if (f.quieta > 0) f.quieta -= dt;
        /* la velocidad se acerca de a poco a la de crucero (o a cero con el mouse encima): sin tirones */
        var meta = f.encima || f.quieta > 0 ? 0 : crucero * f.dir;
        f.vel += (meta - f.vel) * (1 - Math.exp(-dt / 600));
        /* impulso que queda al soltar después de arrastrar: se va frenando */
        f.empuje *= Math.exp(-dt / 350);
        if (Math.abs(f.empuje) < 2) f.empuje = 0;
        f.x += (f.vel + f.empuje) * dt / 1000;
        ajustar(f);
      });
      pintar();
      cuadro = requestAnimationFrame(paso);
    };
    var seguir = function () { if (!cuadro && corriendo()) { previo = 0; cuadro = requestAnimationFrame(paso); } };

    /* Arrastrar con el dedo o el mouse. El scroll vertical de la página sigue funcionando (touch-action: pan-y). */
    filas.forEach(function (f) {
      var el = f.el, movido = 0;
      el.addEventListener("pointerdown", function (e) {
        if (sec.classList.contains("filtrado") || (e.pointerType === "mouse" && e.button !== 0)) return;
        f.toca = { id: e.pointerId, x: e.clientX, t: e.timeStamp, v: 0 }; movido = 0; f.empuje = 0; f.vel = 0;
      });
      el.addEventListener("pointermove", function (e) {
        var k = f.toca; if (!k || k.id !== e.pointerId) return;
        var dx = e.clientX - k.x, dt = Math.max(1, e.timeStamp - k.t);
        movido += Math.abs(dx);
        if (movido > 6 && !el.classList.contains("arrastra")) { el.classList.add("arrastra"); try { el.setPointerCapture(e.pointerId); } catch (er) {} }
        f.x += dx; ajustar(f); pintar();
        k.v = k.v * .6 + (dx / dt * 1000) * .4; k.x = e.clientX; k.t = e.timeStamp;
      });
      var soltar = function (e) {
        var k = f.toca; if (!k || k.id !== e.pointerId) return;
        f.toca = null; el.classList.remove("arrastra");
        /* si fue solo un toque o el inicio de un scroll vertical, la fila sigue como iba */
        if (movido > 6) { f.empuje = Math.max(-2500, Math.min(2500, k.v)); f.quieta = 2500; } /* descansa 2,5 s antes de seguir sola */
        seguir();
      };
      el.addEventListener("pointerup", soltar);
      el.addEventListener("pointercancel", soltar);
      /* si se arrastró, el soltar no cuenta como clic en "Reservar este" */
      el.addEventListener("click", function (e) { if (movido > 6) { e.preventDefault(); e.stopPropagation(); movido = 0; } }, true);
      /* trackpad o rueda horizontal */
      el.addEventListener("wheel", function (e) {
        if (sec.classList.contains("filtrado") || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault(); f.x -= e.deltaX; ajustar(f); pintar(); f.quieta = 2500; f.vel = 0;
      }, { passive: false });
      /* con el mouse encima se detiene para poder leer */
      el.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") f.encima = true; });
      el.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") f.encima = false; });
      /* con teclado: al llegar con Tab a un botón, la fila se detiene y lo muestra */
      el.addEventListener("focusin", function (e) {
        f.encima = true;
        var r = e.target.getBoundingClientRect();
        if (r.left < 0 || r.right > window.innerWidth) { f.x -= r.left - window.innerWidth * .3; ajustar(f); pintar(); }
      });
      el.addEventListener("focusout", function () { f.encima = false; });
    });

    /* solo se anima mientras la sección se ve */
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { aLaVista = es[0].isIntersecting; seguir(); }).observe(sec);
    document.addEventListener("visibilitychange", seguir);

    /* filtros: con una categoría elegida, los autos se muestran juntos sin moverse */
    [].forEach.call(document.querySelectorAll(".chip"), function (c) {
      c.addEventListener("click", function () {
        var todos = c.dataset.f === "todos", antes = sec.getBoundingClientRect().top;
        sec.classList.toggle("filtrado", !todos);
        /* cuántos autos quedaron (sin contar las copias): el CSS adapta el tamaño de las tarjetas */
        sec.dataset.n = [].filter.call(sec.querySelectorAll(".auto:not(.clon)"), function (a) { return !a.hidden; }).length;
        filas.forEach(function (f) { f.el.style.transform = ""; });
        /* la sección cambia de alto: se deja el inicio de la flota a la vista para que la página no salte */
        if (antes < 0) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
        if (todos) requestAnimationFrame(medir);
      });
    });
    /* solo si cambia el ancho (en el celular la barra del navegador cambia el alto al bajar y no debe reiniciar) */
    var anchoVentana = window.innerWidth, t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () {
      if (window.innerWidth !== anchoVentana) { anchoVentana = window.innerWidth; medir(); }
    }, 150); });
    medir();
  }
})();
