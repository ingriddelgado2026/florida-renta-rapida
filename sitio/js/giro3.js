/* "Un auto para cada viaje" en 3D: 3 autos que se reproducen solos, como un video, uno detrás de otro.
   Cada auto son las imágenes sacadas de su video; entre imagen e imagen se mezcla un poco para que
   el movimiento se vea continuo. No depende del scroll: se reproduce mientras la sección está a la vista
   y se pausa cuando sale (o con el botón de pausa). Las rayitas de abajo saltan a cada auto.
   Las imágenes se descargan solo cuando el visitante empieza a bajar y la sección está cerca. */
(function () {
  "use strict";
  var sec = document.querySelector(".giro3");
  if (!sec) return;
  var lienzo = sec.querySelector(".giro3-lienzo"), ctx = lienzo.getContext("2d");
  var escenas = [].slice.call(sec.querySelectorAll(".escena"));
  var botones = [].slice.call(sec.querySelectorAll(".g3-ctrl button:not(.g3-pausa)"));
  var puntos = botones.map(function (b) { return b.querySelector("i"); });
  var pausa = sec.querySelector(".g3-pausa");
  var N = +sec.dataset.total || 64, raiz = sec.dataset.raiz || "";
  var autos = escenas.map(function (e) { return e.dataset.auto; });
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var movil = function () { return window.innerWidth < 760; };
  var HAY_PC = true;
  var carpeta = function () { return HAY_PC && !movil() ? "pc" : "movil"; };
  var fotos = autos.map(function () { return []; });

  /* Tiempos de cada auto (milisegundos): recorrido de sus imágenes, pausa al final y fundido al siguiente.
     K5 y Pacifica cruzan el estudio y salen; la Outlander llega al centro, enciende las luces y se queda un rato. */
  var TIEMPO = [[4600, 0, 400], [4600, 0, 400], [3800, 2800, 700]];
  /* parte del recorrido de cada auto en la que se ve su texto */
  var TEXTO = [[.06, .78], [.06, .78], [.05, 1.01]];
  var largoDe = function (a) { var t = TIEMPO[a]; return t[0] + t[1] + t[2]; };

  var auto = 0, ms = 0;              /* auto actual y tiempo dentro de su tramo */
  var aLaVista = false, parado = false, listo = false, empezado = false, cuadro = 0, previo = 0, ultimo = "";

  var ruta = function (a, i) { return raiz + "img/giro3/" + autos[a] + "/" + carpeta() + "/" + ("00" + (i + 1)).slice(-3) + ".webp"; };
  var lista = function (img) { return img && img.complete && img.naturalWidth; };
  var cargada = function (a, n) { return lista(fotos[a][n]); };
  var buscar = function (a, n) { var k = n; while (k >= 0 && !lista(fotos[a][k])) k--; if (k < 0) { k = n; while (k < N && !lista(fotos[a][k])) k++; } return fotos[a][k]; };

  var ajustar = function () {
    var r = Math.min(window.devicePixelRatio || 1, 2); /* nítido en pantallas de alta densidad (celulares) */
    lienzo.width = Math.round(lienzo.clientWidth * r); lienzo.height = Math.round(lienzo.clientHeight * r);
    ultimo = ""; pintar();
  };

  /* Dibuja una imagen: en celular llena la pantalla; en PC va un poco a la derecha (el texto va a la izquierda) */
  var poner = function (img, alfa) {
    if (!img || alfa <= 0) return;
    var W = lienzo.width, H = lienzo.height, iw = img.naturalWidth, ih = img.naturalHeight, s, w, h, x, y;
    if (movil()) { s = Math.max(W / iw, H / ih); w = iw * s; h = ih * s; x = (W - w) / 2; y = (H - h) / 2; }
    else { s = Math.max(W / iw, H / ih) * 1.06; w = iw * s; h = ih * s; x = Math.max(W - w, Math.min(0, W * .58 - w / 2)); y = (H - h) / 2; }
    ctx.globalAlpha = alfa; ctx.drawImage(img, x, y, w, h); ctx.globalAlpha = 1;
  };

  /* suave al entrar y al salir, para que el auto no arranque ni frene de golpe */
  var suave = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var mezclaSuave = function (t) { return .15 * t + .85 * suave(t); };

  function pintar() {
    if (!listo) return;
    var tm = TIEMPO[auto], f, sig = (auto + 1) % autos.length, mezcla = 0;
    if (quieto) f = auto === autos.length - 1 ? 1 : .5;
    else if (ms < tm[0]) f = mezclaSuave(ms / tm[0]);
    else { f = 1; if (ms > tm[0] + tm[1]) mezcla = Math.min(1, (ms - tm[0] - tm[1]) / tm[2]); }
    var pos = f * (N - 1), n = Math.floor(pos), frac = pos - n;
    if (n >= N - 1) { n = N - 1; frac = 0; }

    var r = TEXTO[auto], visible = quieto || (f >= r[0] && f < r[1] && mezcla === 0);
    escenas.forEach(function (e, i) { e.classList.toggle("act", i === auto && visible); });
    puntos.forEach(function (d, i) { d.classList.toggle("on", i === auto); });

    var clave = auto + ":" + pos.toFixed(2) + ":" + mezcla.toFixed(2);
    if (clave === ultimo) return; ultimo = clave;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height); /* transparente: deja ver la palabra grande a los lados */
    var a1 = buscar(auto, n), a2 = frac > 0 && cargada(auto, n + 1) ? fotos[auto][n + 1] : null;
    poner(a1, 1 - mezcla);
    if (a2) poner(a2, frac * (1 - mezcla)); /* entre dos imágenes: se mezclan para que no se note el salto */
    if (mezcla > 0) poner(buscar(sig, 0), mezcla);
  }

  /* El reloj solo avanza si la imagen que toca ya llegó (con conexión lenta espera en vez de saltar) */
  var lleno = function (a) { for (var i = 0; i < N; i++) if (!cargada(a, i)) return false; return true; };
  var paso = function (ahora) {
    cuadro = 0;
    if (!corriendo()) { previo = 0; return; }
    var dt = previo ? Math.min(ahora - previo, 60) : 0; previo = ahora;
    var tm = TIEMPO[auto];
    var listoAuto = lleno(auto), listoSig = ms < tm[0] + tm[1] || cargada((auto + 1) % autos.length, 0);
    if (listoAuto && listoSig) ms += dt;
    if (ms >= largoDe(auto)) { ms = 0; auto = (auto + 1) % autos.length; }
    pintar();
    cuadro = requestAnimationFrame(paso);
  };
  var corriendo = function () { return listo && aLaVista && !parado && !quieto && !document.hidden; };
  var seguir = function () { if (!cuadro && corriendo()) { previo = 0; cuadro = requestAnimationFrame(paso); } };

  /* Descarga ordenada: primero el auto que se va a ver, luego los demás */
  var cargar = function () {
    if (empezado) return; empezado = true;
    if (!listo) { listo = true; ajustar(); }
    var orden = [], a, i, k;
    for (k = 0; k < autos.length; k++) { a = (auto + k) % autos.length; for (i = 0; i < N; i++) orden.push([a, i]); }
    var sig = 0, activos = 0;
    var bajar = function () {
      while (activos < 6 && sig < orden.length) {
        var o = orden[sig++]; if (fotos[o[0]][o[1]]) continue;
        var img = new Image(); img.decoding = "async"; activos++;
        img.onload = img.onerror = function () { activos--; ultimo = ""; if (!cuadro) pintar(); bajar(); };
        img.src = ruta(o[0], o[1]); fotos[o[0]][o[1]] = img;
      }
    };
    bajar();
    seguir();
  };

  /* Se reproduce solo mientras se ve al menos un tercio de la sección */
  var vigilar = function () {
    if (!("IntersectionObserver" in window)) { aLaVista = true; cargar(); return; }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) cargar(); }, { rootMargin: "100% 0px" }).observe(sec);
    new IntersectionObserver(function (es) { aLaVista = es[0].isIntersecting; seguir(); }, { threshold: .35 }).observe(sec);
  };
  var EV = ["scroll", "wheel", "touchmove", "keydown"], vigilando = false;
  var arrancar = function (e) {
    if (vigilando || (e && e.type === "scroll" && window.scrollY < 40)) return;
    vigilando = true;
    EV.forEach(function (n) { window.removeEventListener(n, arrancar); });
    if (window.requestIdleCallback) requestIdleCallback(vigilar, { timeout: 600 }); else setTimeout(vigilar, 60);
  };
  if (window.scrollY > 40) arrancar(); else EV.forEach(function (n) { window.addEventListener(n, arrancar, { passive: true }); });

  /* Rayitas: saltan a ese auto · Botón: pausa o reanuda */
  botones.forEach(function (b, i) { b.addEventListener("click", function () {
    auto = i; ms = 0; ultimo = ""; arrancar();
    if (listo) pintar(); else puntos.forEach(function (d, k) { d.classList.toggle("on", k === i); });
  }); });
  if (pausa) pausa.addEventListener("click", function () {
    parado = !parado; pausa.classList.toggle("parado", parado);
    pausa.setAttribute("aria-label", parado ? pausa.dataset.seguir : pausa.dataset.pausar);
    seguir();
  });
  document.addEventListener("visibilitychange", seguir);

  if (quieto) sec.classList.add("quieto");
  puntos[0] && puntos[0].classList.add("on");
  var antes = carpeta();
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () {
    if (carpeta() !== antes) { antes = carpeta(); fotos = autos.map(function () { return []; }); empezado = false; cargar(); }
    if (listo) ajustar();
  }, 150); });
})();
