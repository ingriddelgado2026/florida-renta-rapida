/* Cómo funciona: la conversación de WhatsApp se reproduce sola, como un chat real, cuando la sección
   está a la vista (no depende del scroll).
   1) La solicitud del formulario aparece lista en la barra de escribir, se pulsa "enviar" y pasa al chat.
   2) Antes de cada respuesta del asesor se ve "escribiendo…".
   3) Las respuestas del cliente se escriben letra por letra y se envían.
   Al terminar espera unos segundos y empieza de nuevo. El paso de la derecha se ilumina según el mensaje;
   tocando un paso, el chat salta a ese momento. Si la sección sale de la pantalla, al volver empieza desde el inicio. */
(function () {
  "use strict";
  /* Al cargar solo se espera el primer scroll real del visitante; todo lo demás se prepara después */
  var EV = ["scroll", "wheel", "touchmove", "keydown"], hecho = false;
  var arrancar = function (e) {
    if (hecho || (e && e.type === "scroll" && window.scrollY < 40)) return;
    hecho = true;
    EV.forEach(function (n) { window.removeEventListener(n, arrancar); });
    if (window.requestIdleCallback) requestIdleCallback(iniciar, { timeout: 500 }); else setTimeout(iniciar, 50);
  };
  EV.forEach(function (n) { window.addEventListener(n, arrancar, { passive: true }); });

  function iniciar() {
  var sec = document.querySelector(".chat-sec");
  if (!sec || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cel = sec.querySelector(".cel");
  var msgs = [].slice.call(sec.querySelectorAll(".msg:not(.escribe)"));
  var escribe = sec.querySelector(".msg.escribe");
  var texto = sec.querySelector(".cel-texto");
  var pasos = [].slice.call(sec.querySelectorAll(".chat-pasos li"));
  var ultimo = "", fotoLista = false;
  var UNIDAD = 1300, FINAL = 3500; /* milisegundos por cada "peso" de la línea de tiempo · pausa al terminar */
  var ms = 0, previo = 0, cuadro = 0, aLaVista = false, cerca = false;

  /* Línea de tiempo: cada mensaje tiene una "preparación" (borrador o escribiendo…) y luego aparece */
  var tramos = [];
  msgs.forEach(function (m, i) {
    var sale = m.classList.contains("out");
    if (sale) tramos.push({ tipo: m.dataset.pre ? "lleno" : "teclea", i: i, peso: m.dataset.pre ? 1.6 : 1.1 });
    else tramos.push({ tipo: "escribe", i: i, peso: .55 });
    tramos.push({ tipo: "ver", i: i, peso: sale ? .45 : .6 });
  });
  var total = tramos.reduce(function (a, t) { return a + t.peso; }, 0);

  var pintar = function () {
    if (!fotoLista) { cel.classList.add("con-fondo"); /* fondo de Miami de noche: se pide recién aquí */
      fotoLista = true; [].forEach.call(sec.querySelectorAll("img[data-src]"), function (i) { i.src = i.dataset.src; i.removeAttribute("data-src"); }); }

    /* un pequeño respiro antes del primer mensaje */
    var x = (ms - 400) / UNIDAD, k = -1, t = 0, acum = 0;
    if (x >= 0) for (k = 0; k < tramos.length; k++) { if (x < acum + tramos[k].peso) { t = (x - acum) / tramos[k].peso; break; } acum += tramos[k].peso; }
    if (k >= tramos.length) { k = tramos.length - 1; t = 1; }
    var tr = k >= 0 ? tramos[k] : null;
    var visibles = !tr ? 0 : (tr.tipo === "ver" ? tr.i + 1 : tr.i);
    var borrador = "", escribiendo = false, conForm = false, pulsa = false;
    if (tr && (tr.tipo === "lleno" || tr.tipo === "teclea")) {
      var b = msgs[tr.i].dataset.borrador || "";
      if (tr.tipo === "lleno") { borrador = t > .12 ? b : ""; conForm = !!borrador; }
      else borrador = b.slice(0, Math.ceil(Math.min(1, t / .82) * b.length));
      pulsa = t > .86;
    }
    if (tr && tr.tipo === "escribe") escribiendo = t > .15;

    var clave = visibles + "|" + borrador.length + "|" + escribiendo + "|" + pulsa + "|" + conForm;
    if (clave === ultimo) return; ultimo = clave;

    msgs.forEach(function (m, i) { m.classList.toggle("ver", i < visibles); });
    escribe.classList.toggle("ver", escribiendo);
    texto.textContent = borrador;
    texto.classList.toggle("cursor", !!borrador && tr.tipo === "teclea");
    cel.classList.toggle("con-texto", !!borrador);
    cel.classList.toggle("con-form", conForm);
    cel.classList.toggle("pulsa", pulsa);

    var actual = tr ? +msgs[tr.i].dataset.paso : 0;
    pasos.forEach(function (li) { var n = +li.dataset.paso; li.classList.toggle("on", n === actual); li.classList.toggle("hecho", n < actual); });
  };

  var corriendo = function () { return aLaVista && !document.hidden; };
  var paso = function (ahora) {
    cuadro = 0;
    if (!corriendo()) { previo = 0; return; }
    var dt = previo ? Math.min(ahora - previo, 60) : 0; previo = ahora;
    ms += dt;
    if (ms > 400 + total * UNIDAD + FINAL) { ms = 0; } /* vuelve a empezar */
    pintar();
    cuadro = requestAnimationFrame(paso);
  };
  var seguir = function () { if (!cuadro && corriendo()) { previo = 0; cuadro = requestAnimationFrame(paso); } };

  /* tocar un paso de la derecha lleva el chat a ese momento */
  pasos.forEach(function (li) {
    
    li.addEventListener("click", function () {
      var n = +li.dataset.paso, acum = 0;
      for (var k = 0; k < tramos.length; k++) { if (+msgs[tramos[k].i].dataset.paso === n) break; acum += tramos[k].peso; }
      ms = 400 + acum * UNIDAD; ultimo = ""; pintar(); seguir();
    });
  });

  /* en celular, el botón flotante de WhatsApp se oculta mientras se ve el chat (tapaba el botón de enviar) */
  var marcar = function () {
    var r = sec.getBoundingClientRect();
    var activo = r.top < window.innerHeight * .5 && r.bottom > window.innerHeight * .5;
    if (activo !== document.body.classList.contains("chat-activo")) document.body.classList.toggle("chat-activo", activo);
  };
  window.addEventListener("scroll", marcar, { passive: true });
  marcar();

  /* corre mientras se ve buena parte de la sección; si sale por completo, la próxima vez empieza desde el inicio */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var e = es[0];
      if (!e.isIntersecting) { cerca = false; ms = 0; ultimo = ""; } else cerca = true;
      aLaVista = e.intersectionRatio >= .35 || (e.isIntersecting && e.intersectionRect.height >= window.innerHeight * .6);
      if (cerca) pintar();
      seguir();
    }, { threshold: [0, .2, .35, .5, .8] }).observe(sec);
  } else { aLaVista = true; seguir(); }
  document.addEventListener("visibilitychange", seguir);
  }
  /* si la página se abrió ya bajada (por ejemplo al volver atrás) */
  window.addEventListener("load", function () { if (window.scrollY > 40) arrancar(); });
})();
