/* Florida Renta Rápida — JavaScript ligero, sin librerías */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EN = document.documentElement.lang === "en";
  /* Textos del JavaScript en cada idioma */
  var TXT = EN ? {
    faltan: "Please complete all fields and accept the privacy policy.",
    desde: "From", dia: "day",
    fechas: "The return date and time must be after pick-up.",
    fechaMal: "Enter a valid date (month/day/year).", fechaPasada: "Choose a date from today on.",
    entrega: "Pick-up", devolucion: "Return", pasajeros: "Passengers", mismo: "same as pick-up",
    abierto: "WhatsApp is open with your request. Just tap send.",
    saludo: "Hi, I'd like to book a car in Florida.",
    nombre: "Name", categoria: "Category", vehiculo: "Vehicle", fecha: "Pick-up date", dias: "Days", pais: "Country", licencia: "Driver's license",
    similar: "or similar", tuAuto: "Your selected car",
    sugerir: "¿Prefieres ver la página en español?", irA: "Ver en español", cerrar: "Cerrar"
  } : {
    faltan: "Completa los campos y acepta la política de privacidad.",
    desde: "Desde", dia: "día",
    fechas: "La devolución tiene que ser después del retiro.",
    fechaMal: "Escribe una fecha válida (mes/día/año).", fechaPasada: "Elige una fecha desde hoy.",
    entrega: "Entrega", devolucion: "Devolución", pasajeros: "Pasajeros", mismo: "el mismo lugar de entrega",
    abierto: "Se abrió WhatsApp con tu solicitud. Solo tienes que enviarla.",
    saludo: "Hola, quiero reservar un auto en Florida.",
    nombre: "Nombre", categoria: "Categoría", vehiculo: "Vehículo", fecha: "Fecha de retiro", dias: "Días", pais: "País", licencia: "Licencia de conducir",
    similar: "o similar", tuAuto: "Tu auto elegido",
    sugerir: "Prefer to browse in English?", irA: "View in English", cerrar: "Close"
  };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Navegadores internos de Instagram, Facebook, TikTok, etc. (al abrir el link de la bio):
     a veces no abren pestañas nuevas, así que ahí WhatsApp se abre en la misma pestaña */
  var enApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|TikTok|BytedanceWebview|trill_|Line\/|Snapchat|Twitter/i.test(navigator.userAgent);
  if (enApp) $$('a[target="_blank"]').forEach(function (a) { if (/wa\.me|whatsapp/.test(a.href)) a.removeAttribute("target"); });
  var abrirWA = function (url) { if (enApp) location.href = url; else window.open(url, "_blank", "noopener"); };

  /* Año del pie de página */
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var raiz = document.documentElement;

  /* Menú móvil */
  var mb = $(".menu-btn"), nav = $("#nav");
  if (mb && nav) {
    mb.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      mb.setAttribute("aria-expanded", open);
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); mb.setAttribute("aria-expanded", false); }); });
  }

  /* Animaciones de ambiente (lluvia, relámpagos, faros): arrancan cuando la página
     ya cargó o cuando el visitante interactúa, para que la carga sea instantánea. */
  if (!reduce) {
    var heroEl = $(".hero");
    var fx = function () { if (heroEl) heroEl.classList.add("fx"); };
    ["pointermove", "touchstart", "scroll", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, fx, { once: true, passive: true });
    });
    window.addEventListener("load", function () { setTimeout(fx, 4000); });
  }

  /* Aparición al hacer scroll */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .15 });
  $$(".reveal").forEach(function (el) { io.observe(el); });

  /* Filtro de la flota */
  var chips = $$(".chip");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.dataset.f;
      chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c); });
      $$(".auto").forEach(function (a) { a.hidden = !(f === "todos" || a.dataset.cat === f); });
    });
  });

  /* Saltos dentro de la página que llegan exacto: primero se dibujan las secciones
     que el navegador deja para después (así no calcula mal las alturas) y al terminar
     se corrige la posición si quedó corta. */
  var irA = function (el) {
    if (!el) return;
    raiz.classList.add("cv-off");
    requestAnimationFrame(function () {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      var listo = false;
      var fijar = function () {
        if (listo) return; listo = true;
        var margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        if (Math.abs(el.getBoundingClientRect().top - margen) > 8) el.scrollIntoView({ behavior: "auto", block: "start" });
      };
      window.addEventListener("scrollend", fijar, { once: true });
      setTimeout(fijar, reduce ? 60 : 1300);
    });
  };
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute("href");
    if (id.length < 2 || a.hasAttribute("data-reservar")) return;
    var destino = document.getElementById(id.slice(1));
    if (!destino || destino.closest("svg")) return;
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      irA(id === "#reservar" ? ($("#form-reserva") || destino) : destino);
    });
  });

  /* Preguntas frecuentes: solo una abierta a la vez */
  var faqs = $$(".faq-list details");
  faqs.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });

  /* "Reservar este" rellena el formulario */
  var form = $("#form-reserva");
  var eleg = $("#elegido");
  var mostrarElegido = function (b) {
    if (!eleg) return;
    $("img", eleg).src = b.dataset.img;
    $("img", eleg).alt = b.dataset.reservar;
    $("small", eleg).textContent = TXT.tuAuto;
    $(".elegido-nombre", eleg).textContent = b.dataset.reservar;
    $(".elegido-cat", eleg).textContent = b.dataset.cat + " · " + TXT.similar;
    $(".elegido-precio", eleg).innerHTML = TXT.desde + " <b>$" + b.dataset.precio + "</b> /" + TXT.dia;
    eleg.dataset.cat = b.dataset.cat; eleg.dataset.auto = b.dataset.reservar;
    eleg.hidden = false;
    eleg.classList.remove("llega"); void eleg.offsetWidth;
    if (!reduce) setTimeout(function () { eleg.classList.add("llega"); }, 250);
  };
  /* si el visitante elige otra categoría en el formulario, la vitrina muestra un auto de esa categoría */
  if (form && eleg) {
    form.categoria.addEventListener("change", function () {
      if (form.categoria.value === eleg.dataset.cat) return;
      var b = $$("[data-reservar]").filter(function (x) { return x.dataset.cat === form.categoria.value && !x.closest(".clon"); })[0];
      if (b) mostrarElegido(b);
    });
  }
  $$("[data-reservar]").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      if (!form) return;
      ev.preventDefault();
      form.categoria.value = b.dataset.cat;
      form.vehiculo.value = b.dataset.reservar;
      /* el auto sale de su vitrina y aparece en la vitrina del formulario */
      var foto = $(".ph img", b.closest(".auto"));
      var ir = function () {
        mostrarElegido(b);
        /* el auto ya está elegido: se pasa directo al paso de fechas y lugar */
        if (form.irPaso) form.irPaso(1);
        /* en celular se muestra también la vitrina con el auto, que queda justo arriba del formulario */
        irA(window.innerWidth < 900 && eleg ? eleg : form);
        setTimeout(function () { form.entrega.focus({ preventScroll: true }); }, reduce ? 0 : 800);
        if (foto) setTimeout(function () { foto.classList.remove("sale"); }, 900);
      };
      if (foto && !reduce) { foto.classList.add("sale"); setTimeout(ir, 380); } else ir();
    });
  });

  /* ===== Efectos ligados al scroll =====
     Las posiciones de las secciones se miden una sola vez (y otra vez solo si cambia el
     tamaño de la página); en cada scroll solo se escriben estilos, sin volver a medir. */
  var top = $("#top"), hayHero = !!$(".hero");
  var road = $(".road"), runner = $(".road .runner"), feats = $$(".feat");
  var show = reduce ? null : $(".show"), slides = $$(".slide"), dots = $$(".show-dots i");
  var ruta = $(".ruta"), trail = $(".trail"), dot = $(".dot"), glow = $(".dot-glow"), pasos = $$(".pasos li");
  var G = {}, L = 0, listo = false, pend = false;

  var medir = function () {
    var sy = window.scrollY;
    G.vh = window.innerHeight; G.vw = window.innerWidth;
    var arriba = function (el) { return el.getBoundingClientRect().top + sy; };
    if (road && runner) { G.roadTop = arriba(road); G.roadW = road.clientWidth; G.runW = runner.offsetWidth; }
    if (show) { G.showTop = arriba(show); G.showLen = show.offsetHeight - G.vh; }
    if (ruta) { G.rutaTop = arriba(ruta); G.rutaLen = ruta.offsetHeight - G.vh; }
  };
  var cerca = function (t, len, sy) { return sy > t - G.vh * 1.2 && sy < t + len + G.vh * 1.2; };
  var avance = function (t, len, sy) { return len > 0 ? clamp((sy - t) / len, 0, 1) : 0; };

  var pintar = function () {
    pend = false;
    var sy = window.scrollY;
    if (top) top.classList.toggle("solid", sy > 40 || !hayHero);
    if (!listo) return;

    if (road && runner && cerca(G.roadTop, 0, sy)) {
      var p = clamp((sy + G.vh - G.roadTop) / (G.vh * .9), 0, 1);
      runner.style.transform = "translate(" + (-G.runW + p * (G.roadW + G.runW * .2)) + "px,-55%)";
      var lit = Math.floor(p * (feats.length + .5));
      feats.forEach(function (f, i) { f.classList.toggle("on", reduce || i < lit); });
    }

    if (show && slides.length && cerca(G.showTop, G.showLen, sy)) {
      var n = slides.length, q = avance(G.showTop, G.showLen, sy) * (n - 1);
      slides.forEach(function (s, i) {
        var d = q - i, a = clamp(1 - Math.abs(d) * 1.6, 0, 1);
        var big = s.children[0], img = s.children[1], txt = s.children[2];
        img.style.transform = "translateX(" + (-d * G.vw * .55) + "px) rotate(" + (-d * 4) + "deg) scale(" + (1 - Math.abs(d) * .15) + ")";
        img.style.opacity = a;
        txt.style.transform = "translateY(" + (d * 60) + "px)";
        txt.style.opacity = clamp(1 - Math.abs(d) * 2.6, 0, 1);
        big.style.transform = "translate(calc(-50% + " + (-d * G.vw * .25) + "px),-50%)";
        big.style.opacity = a;
        s.classList.toggle("act", Math.abs(d) < .5);
      });
      var cur = Math.round(q);
      dots.forEach(function (d, i) { d.classList.toggle("on", i === cur); });
    }

    if (ruta && trail && L && (reduce || cerca(G.rutaTop, G.rutaLen, sy))) {
      var r = reduce ? 1 : clamp(avance(G.rutaTop, G.rutaLen, sy) * 1.15, 0, 1);
      trail.style.strokeDashoffset = L * (1 - r);
      var pt = trail.getPointAtLength(L * r);
      dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
      glow.setAttribute("cx", pt.x); glow.setAttribute("cy", pt.y);
      pasos.forEach(function (li, i) { li.classList.toggle("on", r >= i / pasos.length + .02 || r === 1); });
    }
  };
  var pedir = function () { if (!pend) { pend = true; requestAnimationFrame(pintar); } };
  window.addEventListener("scroll", pedir, { passive: true });
  pintar();

  /* Mide las secciones y activa los efectos */
  var iniciar = function () {
    if (trail) { L = trail.getTotalLength(); trail.style.strokeDasharray = L; trail.style.strokeDashoffset = L; }
    medir(); listo = true; pintar();
    if (window.ResizeObserver) {
      var t;
      new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { medir(); pedir(); }, 100); }).observe(document.body);
    } else {
      window.addEventListener("resize", function () { medir(); pedir(); });
    }
  };
  /* Las secciones con scroll están más abajo: se preparan con el primer scroll o toque */
  var arrancado = false;
  var arrancar = function () {
    if (arrancado) return; arrancado = true;
    /* fotos de "Un auto para cada viaje": se piden recién ahora */
    $$("img[data-src]").forEach(function (i) { i.src = i.dataset.src; i.removeAttribute("data-src"); });
    if (window.requestIdleCallback) requestIdleCallback(iniciar, { timeout: 300 }); else setTimeout(iniciar, 50);
  };
  ["scroll", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, arrancar, { once: true, passive: true });
  });
  if (window.scrollY > 0) arrancar();

  /* Formulario -> WhatsApp (no guarda datos en el servidor) */
  if (form) {
    var hoy = new Date(); hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    var iso = hoy.toISOString().slice(0, 10);
    form.fecha.min = iso; form.fecha_dev.min = iso;
    /* "Hotel" u "Otra dirección" muestran el campo para escribirla */
    ["entrega", "devolucion"].forEach(function (n) {
      var sel = form[n], lab = $('[data-detalle-de="' + n + '"]', form), inp = lab && $("input", lab);
      var ver = function () {
        var o = sel.options[sel.selectedIndex], si = !!(o && o.hasAttribute("data-detalle"));
        lab.hidden = !si; inp.required = si; if (!si) inp.value = "";
      };
      sel.addEventListener("change", ver); ver();
    });
    /* Fechas en formato de EE. UU. (mm/dd/aaaa): se escriben a mano o se eligen en el calendario */
    var aISO = function (t) {
      var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t); if (!m) return "";
      var d = new Date(+m[3], +m[1] - 1, +m[2]);
      return (d.getMonth() === +m[1] - 1 && d.getDate() === +m[2]) ? m[3] + "-" + m[1] + "-" + m[2] : "";
    };
    var aTexto = function (v) { var p = v.split("-"); return p[1] + "/" + p[2] + "/" + p[0]; };
    ["fecha", "fecha_dev"].forEach(function (n) {
      var txt = form[n + "_txt"], oculta = form[n], cal = txt.parentNode.querySelector(".fecha-cal");
      var revisar = function () {
        var v = aISO(txt.value);
        txt.setCustomValidity(txt.value.length === 10 && !v ? TXT.fechaMal : (v && oculta.min && v < oculta.min ? TXT.fechaPasada : ""));
        if (oculta.value !== v) { oculta.value = v; oculta.dispatchEvent(new Event("change")); }
      };
      txt.addEventListener("input", function () {
        var d = txt.value.replace(/\D/g, "").slice(0, 8);
        txt.value = d.length > 4 ? d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
        revisar();
      });
      oculta.addEventListener("change", function () {
        if (oculta.value && aISO(txt.value) !== oculta.value) { txt.value = aTexto(oculta.value); revisar(); }
      });
      cal.addEventListener("click", function () {
        try { oculta.showPicker(); } catch (e) { txt.focus(); }
      });
    });
    form.fecha.addEventListener("change", function () {
      form.fecha_dev.min = form.fecha.value || iso;
      if (form.fecha_dev.value && form.fecha_dev.value < form.fecha.value) { form.fecha_dev.value = ""; form.fecha_dev_txt.value = ""; }
    });
    /* fecha en el formato de EE. UU. en los dos idiomas: 11/20/2026 */
    var fmt = function (v) { var p = v.split("-"); return p[1] + "/" + p[2] + "/" + p[0]; };
    var lugar = function (sel, det) { return sel.value + (det.value ? " (" + det.value + ")" : ""); };
    /* ===== Formulario en 3 pasos: Tu auto · Fechas y lugar · Tus datos ===== */
    var pasosF = $$(".paso-form", form), marcas = $$(".form-pasos li", form), barra = $(".form-barra i", form), actualF = 0;
    var msgF = $("#form-msg"), msgInicial = msgF ? msgF.textContent : "";
    var camposDe = function (n) {
      return $$("input,select", pasosF[n]).filter(function (c) { return c.type !== "date" && !c.closest("[hidden]"); });
    };
    var fechasBien = function () {
      var f = form.elements;
      if (!f.fecha.value || !f.fecha_dev.value) return true;
      return new Date(f.fecha_dev.value + "T" + f.hora_dev.value) > new Date(f.fecha.value + "T" + f.hora.value);
    };
    var pasoValido = function (n) {
      var mal = camposDe(n).filter(function (c) { return !c.checkValidity(); })[0];
      if (mal) { mal.reportValidity(); if (msgF) msgF.textContent = TXT.faltan; return false; }
      if (n === 1 && !fechasBien()) { if (msgF) msgF.textContent = TXT.fechas; form.fecha_dev_txt.focus(); return false; }
      return true;
    };
    var irPaso = function (n, enfocar) {
      if (!pasosF.length) return;
      actualF = n;
      pasosF.forEach(function (p, i) { p.classList.toggle("on", i === n); });
      marcas.forEach(function (li, i) {
        li.classList.toggle("on", i === n); li.classList.toggle("hecho", i < n);
        if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      if (barra) barra.style.width = ((n + 1) / pasosF.length * 100).toFixed(2) + "%";
      if (msgF && msgF.textContent !== msgInicial) msgF.textContent = msgInicial;
      /* si el inicio del formulario quedó arriba de la pantalla, se vuelve a mostrar */
      var r = form.getBoundingClientRect();
      if (enfocar && r.top < 70) window.scrollTo({ top: r.top + window.scrollY - 86, behavior: reduce ? "auto" : "smooth" });
      if (enfocar) { var c = camposDe(n)[0]; if (c) setTimeout(function () { c.focus({ preventScroll: true }); }, 60); }
    };
    form.irPaso = irPaso;
    $$("[data-sigue]", form).forEach(function (b) { b.addEventListener("click", function () { if (pasoValido(actualF)) irPaso(actualF + 1, true); }); });
    $$("[data-atras]", form).forEach(function (b) { b.addEventListener("click", function () { irPaso(Math.max(0, actualF - 1), true); }); });
    /* la barra de pasos: se puede volver atrás, y avanzar solo si lo anterior está completo */
    $$("[data-ir]", form).forEach(function (b) { b.addEventListener("click", function () {
      var n = +b.dataset.ir;
      if (n <= actualF) { irPaso(n, true); return; }
      for (var k = actualF; k < n; k++) { if (!pasoValido(k)) { irPaso(k); pasoValido(k); return; } }
      irPaso(n, true);
    }); });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = $("#form-msg");
      /* Enter en un paso intermedio: pasa al siguiente en vez de enviar */
      if (pasosF.length && actualF < pasosF.length - 1) { if (pasoValido(actualF)) irPaso(actualF + 1, true); return; }
      if (!form.checkValidity()) {
        /* lleva al paso donde está el primer dato que falta */
        var mal = $$("input,select", form).filter(function (c) { return c.type !== "date" && !c.checkValidity(); })[0];
        var p = mal && mal.closest(".paso-form");
        if (p) { irPaso(pasosF.indexOf(p)); setTimeout(function () { mal.reportValidity(); }, 50); } else form.reportValidity();
        msg.textContent = TXT.faltan;
        return;
      }
      var f = form.elements;
      var ini = new Date(f.fecha.value + "T" + f.hora.value), fin = new Date(f.fecha_dev.value + "T" + f.hora_dev.value);
      if (!(fin > ini)) { irPaso(1); msg.textContent = TXT.fechas; f.fecha_dev_txt.focus(); return; }
      var dias = Math.max(1, Math.ceil((fin - ini) / 864e5));
      var dev = f.devolucion.selectedIndex === 0 ? TXT.mismo : lugar(f.devolucion, f.devolucion_detalle);
      var texto = [
        TXT.saludo,
        "*" + TXT.nombre + ":* " + f.nombre.value,
        "*" + TXT.categoria + ":* " + f.categoria.value,
        f.vehiculo.value ? "*" + TXT.vehiculo + ":* " + f.vehiculo.value : "",
        "*" + TXT.entrega + ":* " + lugar(f.entrega, f.entrega_detalle) + " · " + fmt(f.fecha.value) + " " + f.hora.value,
        "*" + TXT.devolucion + ":* " + dev + " · " + fmt(f.fecha_dev.value) + " " + f.hora_dev.value,
        "*" + TXT.dias + ":* " + dias,
        "*" + TXT.pasajeros + ":* " + f.pasajeros.value,
        "*" + TXT.pais + ":* " + f.pais.value,
        "*" + TXT.licencia + ":* " + f.licencia.value
      ].filter(Boolean).map(encodeURIComponent).join("%0A");
      if (window.medir) window.medir("generate_lead", { categoria: f.categoria.value, entrega: f.entrega.value, dias: dias, pasajeros: +f.pasajeros.value });
      abrirWA("https://wa.me/" + window.WA_NUMERO + "?text=" + texto);
      msg.textContent = TXT.abierto;
    });
  }

  /* ===== Aviso de cookies =====
     Hoy la página solo usa almacenamiento técnico (recordar tu elección).
     Si en el futuro agregas Google Analytics o el Píxel de Meta, ponlos dentro de
     cargarMedicion(): solo se ejecutará si el visitante acepta. */
  var KEY = "ast-cookies";
  var banner = $("#cookie-banner");
  var leer = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var guardar = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
  /* Google Analytics 4: se carga solo si el visitante acepta las cookies */
  var GA = window.GA_ID || "", medicionActiva = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  function cargarMedicion() {
    if (!GA || medicionActiva) return;
    medicionActiva = true; window["ga-disable-" + GA] = false;
    var s = document.createElement("script");
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA; s.async = true;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA);
  }
  /* si después elige "Solo necesarias": se apaga la medición y se borran sus cookies */
  function apagarMedicion() {
    if (!GA) return;
    window["ga-disable-" + GA] = true; medicionActiva = false;
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n.indexOf("_ga") === 0) ["", "; domain=" + location.hostname, "; domain=." + location.hostname.replace(/^www\./, "")].forEach(function (d) {
        document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d;
      });
    });
  }
  /* eventos: cuántas reservas y contactos llegan por WhatsApp (solo cuentan si la medición está activa) */
  window.medir = function (evento, datos) { if (medicionActiva) gtag("event", evento, datos || {}); };
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href*="wa.me"]');
    if (a) window.medir("contacto_whatsapp", { ubicacion: a.className.indexOf("wa-float") > -1 ? "boton_flotante" : (a.closest("header") ? "encabezado" : "pagina") });
  });
  var elegir = function (v) { guardar(v); if (banner) banner.hidden = true; if (v === "todas") cargarMedicion(); else apagarMedicion(); };
  if (banner) {
    var c = leer();
    if (!c) banner.hidden = false; else if (c === "todas") cargarMedicion();
    $$("[data-cookie]", banner).forEach(function (b) { b.addEventListener("click", function () { elegir(b.dataset.cookie); }); });
  }
  $$("[data-cookie-settings]").forEach(function (b) {
    b.addEventListener("click", function () { if (banner) { banner.hidden = false; var x = $("[data-cookie]", banner); if (x) x.focus(); } });
  });

  /* ===== Idioma =====
     Recuerda el idioma elegido con el botón ES | EN y, la primera vez,
     sugiere el otro idioma si el navegador del visitante está en ese idioma. */
  var LKEY = "ast-lang";
  var lget = function () { try { return localStorage.getItem(LKEY); } catch (e) { return null; } };
  var lset = function (v) { try { localStorage.setItem(LKEY, v); } catch (e) {} };
  var actual = EN ? "en" : "es";
  var cambio = $(".lang");
  if (cambio) cambio.addEventListener("click", function () { lset(cambio.dataset.lang); });
  var nav0 = (navigator.language || "es").slice(0, 2).toLowerCase();
  var otro = EN ? "es" : "en";
  var sugerir = function () {
    var bar = document.createElement("div");
    bar.className = "lang-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", TXT.sugerir);
    var t = document.createElement("span"); t.textContent = TXT.sugerir;
    var ir = document.createElement("a"); ir.className = "btn btn-accent"; ir.textContent = TXT.irA; ir.href = cambio.getAttribute("href");
    ir.addEventListener("click", function () { lset(otro); });
    var x = document.createElement("button"); x.type = "button"; x.className = "lang-x"; x.textContent = "\u00d7"; x.setAttribute("aria-label", TXT.cerrar);
    x.addEventListener("click", function () { lset(actual); bar.hidden = true; });
    bar.appendChild(t); bar.appendChild(ir); bar.appendChild(x);
    document.body.appendChild(bar);
  };
  /* La sugerencia aparece cuando el visitante empieza a usar la página (no frena la carga) */
  if (cambio && !lget() && nav0 === otro) {
    var sugerido = false;
    var una = function () { if (!sugerido) { sugerido = true; sugerir(); } };
    ["scroll", "pointermove", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, una, { once: true, passive: true });
    });
  }
})();

/* ===== Inicio: los 3 autos se turnan para pasar adelante =====
   Empieza unos segundos después de que la página terminó de cargar (no afecta la velocidad).
   El de la derecha avanza al centro, el del centro se va a la izquierda y el de la izquierda pasa
   por detrás a la derecha. Para que se vean nítidos adelante, se usan las fotos grandes de la flota. */
(function () {
  "use strict";
  var stage = document.querySelector(".hero .stage");
  if (!stage || !Element.prototype.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var carDiv = stage.querySelector(".car"), ai = stage.querySelector(".atras-i"), ad = stage.querySelector(".atras-d");
  if (!carDiv || !ai || !ad) return;
  var raiz = (ai.getAttribute("src") || "").indexOf("../") === 0 ? "../" : "";
  var els = [carDiv, ai, ad];             /* Rogue, RAV4, Outlander */
  var lugar = ["f", "i", "d"];            /* f = adelante, i = atrás izquierda, d = atrás derecha */
  var sigue = { d: "f", f: "i", i: "d" };
  var O = [], S = {}, aLaVista = true, ocupado = false, listo = false, reloj = 0;
  var DUR = 1300, PAUSA = 4200;

  var medir = function () {
    els.forEach(function (e, k) { O[k] = { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; });
    S.f = O[0]; S.i = O[1]; S.d = O[2];  /* cada lugar tiene el tamaño del auto que estaba ahí al cargar */
  };
  /* transformación para poner el auto k en el lugar s: mismo ancho que el lugar y apoyado en el piso.
     El lugar de la izquierda va en espejo (el auto mira hacia afuera, como en la foto original). */
  var pos = function (k, s) {
    /* la foto de la Rogue tiene más margen que las otras dos: se compensa para que los tres se vean del mismo tamaño */
    var aj = k === 0 ? (s === "f" ? 1 : 1.07) : (s === "f" ? .93 : 1);
    var o = O[k], t = S[s], w = t.w * aj, esc = w / o.w;
    var tx = t.x + (t.w - w) / 2 - o.x, ty = (t.y + t.h) - (o.y + o.h * esc);
    return s === "i" ? "translate(" + (tx + w).toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + (-esc).toFixed(4) + "," + esc.toFixed(4) + ")"
                     : "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + esc.toFixed(4) + ")";
  };
  var capa = function (s) { return s === "f" ? 2 : 1; };
  var colocar = function () { els.forEach(function (e, k) { e.style.transform = pos(k, lugar[k]); e.style.zIndex = capa(lugar[k]); }); };

  var girar = function () {
    if (ocupado || !aLaVista || document.hidden) return;
    ocupado = true;
    var fin = 0;
    els.forEach(function (e, k) {
      var de = lugar[k], a = sigue[de], t0 = pos(k, de), t1 = pos(k, a);
      /* el que pasa adelante va por encima de todos durante el movimiento */
      e.style.zIndex = a === "f" ? 3 : (de === "f" ? 2 : 1);
      /* entrar o salir del lugar en espejo: se desvanece y aparece en su nuevo lugar (sin "voltearse") */
      var cambiaEspejo = (de === "i") !== (a === "i");
      var kf = cambiaEspejo
        ? [{ transform: t0, opacity: 1 }, { transform: t0, opacity: 0, offset: .38 }, { transform: t1, opacity: 0, offset: .62 }, { transform: t1, opacity: 1 }]
        : [{ transform: t0 }, { transform: t1 }];
      var an = e.animate(kf, { duration: DUR, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" });
      an.onfinish = function () {
        e.style.transform = t1; e.style.zIndex = capa(a); an.cancel();
        if (++fin === els.length) ocupado = false;
      };
      lugar[k] = a;
    });
  };
  var ciclo = function () { clearTimeout(reloj); reloj = setTimeout(function () { girar(); ciclo(); }, PAUSA + DUR); };

  var preparar = function () {
    /* fotos grandes de la RAV4 y la Outlander (las de atrás son pequeñas y se verían borrosas adelante) */
    var cargar = function (img, nombre) {
      var n = new Image(); n.src = raiz + "img/flota/" + nombre + ".webp";
      return (n.decode ? n.decode() : Promise.resolve()).then(function () { return n.src; });
    };
    Promise.all([cargar(ai, "rav4"), cargar(ad, "outlander")]).then(function (src) {
      els.forEach(function (e) { e.style.animation = "none"; e.style.opacity = "1"; e.style.transformOrigin = "0 0"; });
      [ai, ad].forEach(function (img, i) { img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.src = src[i]; });
      medir(); colocar(); listo = true;
      ciclo();
    }).catch(function () {});
  };
  var empezar = function () { setTimeout(function () { if (window.requestIdleCallback) requestIdleCallback(preparar, { timeout: 1500 }); else preparar(); }, 2500); };
  if (document.readyState === "complete") empezar(); else window.addEventListener("load", empezar);

  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { aLaVista = es[0].isIntersecting; }).observe(stage);
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () {
    if (!listo) return; els.forEach(function (e) { e.getAnimations().forEach(function (a) { a.finish(); }); }); medir(); colocar();
  }, 150); });
})();
