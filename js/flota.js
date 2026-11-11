/* Flota: dos filas de autos. Al bajar, la primera fila se desliza hacia la derecha y la segunda
   hacia la izquierda, así los 16 autos caben en una sola pantalla.
   Si se elige una categoría en los filtros, se deja de deslizar y se muestran juntos. */
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
    if (!sec || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { if (sec) sec.classList.add("filtrado"); return; }
    var filas = [].slice.call(sec.querySelectorAll(".fila"));
    var sobra = [0, 0], pedido = false;

    /* cuánto le sobra a cada fila respecto del ancho de la pantalla */
    var medir = function () {
      filas.forEach(function (f, i) { f.style.transform = ""; sobra[i] = Math.max(0, f.scrollWidth - sec.clientWidth); });
      pintar();
    };
    var pintar = function () {
      pedido = false;
      if (sec.classList.contains("filtrado")) return;
      var r = sec.getBoundingClientRect(), largo = sec.offsetHeight - window.innerHeight;
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      var p = largo > 0 ? Math.min(1, Math.max(0, -r.top / largo)) : 0;
      /* fila 1: entra desde la izquierda y avanza a la derecha · fila 2: avanza a la izquierda */
      if (filas[0]) filas[0].style.transform = "translate3d(" + (-sobra[0] * (1 - p)).toFixed(1) + "px,0,0)";
      if (filas[1]) filas[1].style.transform = "translate3d(" + (-sobra[1] * p).toFixed(1) + "px,0,0)";
    };
    var pedir = function () { if (!pedido) { pedido = true; requestAnimationFrame(pintar); } };

    /* filtros: con una categoría elegida, los autos se muestran juntos sin deslizar */
    [].forEach.call(document.querySelectorAll(".chip"), function (c) {
      c.addEventListener("click", function () {
        var todos = c.dataset.f === "todos", antes = sec.getBoundingClientRect().top;
        sec.classList.toggle("filtrado", !todos);
        /* cuántos autos quedaron: el CSS adapta el tamaño de las tarjetas */
        sec.dataset.n = [].filter.call(sec.querySelectorAll(".auto"), function (a) { return !a.hidden; }).length;
        filas.forEach(function (f) { f.style.transform = ""; });
        /* la sección cambia de alto: se deja el inicio de la flota a la vista para que la página no salte */
        if (antes < 0) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
        if (todos) requestAnimationFrame(medir);
      });
    });
    window.addEventListener("scroll", pedir, { passive: true });
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(medir, 150); });
    medir();
  }
})();
