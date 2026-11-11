/* "Un auto para cada viaje" en 3D: 3 autos, uno detrás de otro. Cada auto gira con el scroll
   (imágenes sacadas de su video) y al terminar se funde con el siguiente.
   Las imágenes se descargan solo cuando el visitante empieza a bajar y la sección está cerca. */
(function () {
  "use strict";
  var sec = document.querySelector(".giro3");
  if (!sec) return;
  var lienzo = sec.querySelector(".giro3-lienzo"), ctx = lienzo.getContext("2d");
  var escenas = [].slice.call(sec.querySelectorAll(".escena"));
  var puntos = [].slice.call(sec.querySelectorAll(".show-dots i"));
  var N = +sec.dataset.total || 64, raiz = sec.dataset.raiz || "";
  var autos = escenas.map(function (e) { return e.dataset.auto; });
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var movil = function () { return window.innerWidth < 760; };
  /* Por ahora solo hay videos verticales: se usan también en PC.
     Cuando lleguen los horizontales, se guardan en img/giro3/<auto>/pc/ y se cambia a true. */
  var HAY_PC = true;
  var carpeta = function () { return HAY_PC && !movil() ? "pc" : "movil"; };
  var fotos = autos.map(function () { return []; });
  var pedido = false, empezado = false, ultimo = "";

  var ruta = function (a, i) { return raiz + "img/giro3/" + autos[a] + "/" + carpeta() + "/" + ("00" + (i + 1)).slice(-3) + ".webp"; };
  var lista = function (img) { return img && img.complete && img.naturalWidth; };
  var buscar = function (a, n) { var k = n; while (k >= 0 && !lista(fotos[a][k])) k--; if (k < 0) { k = n; while (k < N && !lista(fotos[a][k])) k++; } return fotos[a][k]; };

  var ajustar = function () {
    var r = Math.min(window.devicePixelRatio || 1, 2); /* nítido en pantallas de alta densidad (celulares) */
    lienzo.width = Math.round(lienzo.clientWidth * r); lienzo.height = Math.round(lienzo.clientHeight * r);
    ultimo = ""; pintar();
  };

  /* Dibuja una imagen: en celular llena la pantalla; en PC (con video vertical) va a la derecha con los lados fundidos en negro */
  var poner = function (img, alfa) {
    if (!img) return;
    var W = lienzo.width, H = lienzo.height, iw = img.naturalWidth, ih = img.naturalHeight, s, w, h, x, y;
    if (movil()) { s = Math.max(W / iw, H / ih); w = iw * s; h = ih * s; x = (W - w) / 2; y = (H - h) / 2; }
    else if (HAY_PC) { s = Math.max(W / iw, H / ih) * 1.06; w = iw * s; h = ih * s; x = Math.max(W - w, Math.min(0, W * .58 - w / 2)); y = (H - h) / 2; } /* auto un poco a la derecha: el texto va a la izquierda */
    else { s = H * 1.05 / ih; w = iw * s; h = ih * s; x = W * .66 - w / 2; y = H - h; }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = alfa; ctx.drawImage(img, x, y, w, h); ctx.globalAlpha = 1;
    if (!movil() && !HAY_PC) {
      var f = w * .28, g = ctx.createLinearGradient(x, 0, x + f, 0);
      g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(x - 1, 0, f, H);
      g = ctx.createLinearGradient(x + w - f, 0, x + w, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000"); ctx.fillStyle = g; ctx.fillRect(x + w - f, 0, f + 1, H);
    }
  };

  var avance = function () {
    var r = sec.getBoundingClientRect(), largo = sec.offsetHeight - window.innerHeight;
    return largo > 0 ? Math.min(1, Math.max(0, -r.top / largo)) : 1;
  };

  /* Cada auto ocupa un tercio del recorrido.
     Escenas 1 y 2: el auto entra por un lado y sale por el otro; el video termina con el estudio vacío,
     así que la siguiente escena empieza sin corte (solo un fundido muy corto).
     Escena 3: el auto llega al centro y enciende las luces. */
  var TEXTO = [[.08, .7], [.08, .7], [.06, 1.01]]; /* cuándo se ve el texto de cada auto (parte de su tramo) */
  var listo = false;
  function pintar() {
    pedido = false;
    if (!listo) return;
    var p = quieto ? 0 : avance(), T = autos.length, pos = Math.min(p * T, T - .0001);
    var a = Math.floor(pos), t = pos - a, GIRO = .95;
    var n = Math.round(Math.min(t / GIRO, 1) * (N - 1));
    var mezcla = a < T - 1 && t > GIRO ? (t - GIRO) / (1 - GIRO) : 0;
    var clave = a + ":" + n + ":" + mezcla.toFixed(2) + ":" + fotos[a].length;
    var r = TEXTO[a] || [0, 1.01], visible = quieto || (t >= r[0] && t < r[1]);
    escenas.forEach(function (e, i) { e.classList.toggle("act", i === a && visible); });
    puntos.forEach(function (d, i) { d.classList.toggle("on", i === a); });
    if (clave === ultimo) return; ultimo = clave;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height); /* transparente: deja ver la palabra grande a los lados */
    poner(buscar(a, n), 1 - mezcla);
    if (mezcla > 0) poner(buscar(a + 1, 0), mezcla);
  }
  var pedir = function () { if (!pedido) { pedido = true; requestAnimationFrame(pintar); } };

  /* Descarga ordenada: primero algunas imágenes repartidas de cada auto, luego el resto en orden */
  var cargar = function () {
    if (empezado) return; empezado = true;
    if (!listo) { listo = true; ajustar(); }
    var orden = [], a, i;
    for (a = 0; a < autos.length; a++) for (i = 0; i < N; i += 9) orden.push([a, i]);
    for (a = 0; a < autos.length; a++) { orden.push([a, N - 1]); for (i = 0; i < N; i++) orden.push([a, i]); }
    var sig = 0, activos = 0;
    var bajar = function () {
      while (activos < 6 && sig < orden.length) {
        var o = orden[sig++]; if (fotos[o[0]][o[1]]) continue;
        var img = new Image(); img.decoding = "async"; activos++;
        img.onload = img.onerror = function () { activos--; ultimo = ""; pedir(); bajar(); };
        img.src = ruta(o[0], o[1]); fotos[o[0]][o[1]] = img;
      }
    };
    bajar();
  };
  var vigilar = function () {
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) cargar(); }, { rootMargin: "100% 0px" }).observe(sec);
    else cargar();
  };
  /* Arranca solo cuando el visitante realmente baja (no por cambios de tamaño de la ventana),
     y en un momento libre del navegador, para no frenar la carga */
  var EV = ["scroll", "wheel", "touchmove", "keydown"];
  var arrancar = function (e) {
    if (e && e.type === "scroll" && window.scrollY < 40) return;
    EV.forEach(function (n) { window.removeEventListener(n, arrancar); });
    if (window.requestIdleCallback) requestIdleCallback(vigilar, { timeout: 600 }); else setTimeout(vigilar, 60);
  };
  if (window.scrollY > 40) arrancar(); else EV.forEach(function (n) { window.addEventListener(n, arrancar, { passive: true }); });

  if (quieto) sec.classList.add("quieto");
  window.addEventListener("scroll", pedir, { passive: true });
  var antes = carpeta();
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () {
    if (carpeta() !== antes) { antes = carpeta(); fotos = autos.map(function () { return []; }); empezado = false; cargar(); }
    if (listo) ajustar();
  }, 150); });
})();
