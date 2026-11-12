# Florida Renta Rápida: arma la carpeta sitio/ (español) y sitio/en/ (inglés) a partir de fuente/ y datos/.
# Los precios, la flota, los teléfonos, el horario y la promoción están en datos/*.json
# (son los archivos que la clienta cambia desde el panel). Las direcciones y Analytics, en datos/ajustes.json.
# Uso: python fuente/construir.py   (GitHub lo ejecuta solo cada vez que se guarda un cambio)
import hashlib, html, io, json, os, re, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, ".."))
SITIO = os.path.join(RAIZ, "sitio")

def dato(n):
    with open(os.path.join(RAIZ, "datos", n), encoding="utf-8") as f:
        return json.load(f)

def error(msg):
    # si algo del panel quedó mal, se detiene aquí y la web publicada no cambia
    print("ERROR EN LOS DATOS: " + msg)
    sys.exit(1)

AJ, PRECIOS, FLOTA, CONTACTO, PROMO = dato("ajustes.json"), dato("precios.json"), dato("flota.json"), dato("contacto.json"), dato("promocion.json")
URL = AJ["url"].rstrip("/")
NOINDEX = bool(AJ.get("noindex"))          # True = Google no indexa (solo para direcciones de prueba)
GA_ID = AJ.get("ga_id", "")                # Google Analytics 4. Vacío = sin Analytics

# Categorías fijas: clave, español, inglés
CATS = [
    ("compacto", "Compacto", "Compact"), ("mid", "Mid Size", "Mid Size"), ("full", "Full Size", "Full Size"),
    ("suv", "SUV", "SUV"), ("suvgrande", "SUV Grande", "Large SUV"),
    ("minivan", "Mini Van", "Minivan"), ("maxivan", "Maxi Van", "Passenger Van"),
]
CLAVES = [k for k, _, _ in CATS]
for k in CLAVES:
    if not isinstance(PRECIOS.get(k), (int, float)) or PRECIOS[k] <= 0:
        error("falta el precio de la categoría '%s'" % k)

def monto(v):
    """35 -> '35' · 12.99 -> '12.99'"""
    v = float(v)
    return str(int(v)) if v == int(v) else "%.2f" % v

def digitos(t):
    return re.sub(r"\D", "", str(t))

def tel_google(t):
    d = digitos(t)
    return "+%s-%s-%s-%s" % (d[0], d[1:4], d[4:7], d[7:]) if len(d) == 11 else "+" + d

def hora(t):
    m = re.match(r"^\s*(\d{1,2}):(\d{2})\s*$", str(t))
    if not m: error("la hora '%s' tiene que escribirse así: 6:00 o 21:00" % t)
    return "%d:%s" % (int(m.group(1)), m.group(2))

# ===== Fotos de la flota: si suben PNG/JPG o una foto muy grande, se convierte a WebP de 900 px =====
FLOTA_DIR = os.path.join(SITIO, "img", "flota")
def preparar_foto(ruta):
    ruta = (ruta or "").strip().lstrip("/")
    if not ruta: return None
    if not ruta.startswith("img/"): ruta = "img/flota/" + os.path.basename(ruta)
    origen = os.path.join(SITIO, *ruta.split("/"))
    if not os.path.exists(origen): error("no se encuentra la foto '%s'" % ruta)
    base = re.sub(r"[^a-z0-9-]+", "-", os.path.splitext(os.path.basename(origen))[0].lower()).strip("-") or "auto"
    destino = os.path.join(FLOTA_DIR, base + ".webp")
    im = Image.open(origen)
    if origen.lower().endswith(".webp") and im.width <= 900 and os.path.normcase(origen) == os.path.normcase(destino):
        return base
    im = im.convert("RGBA")
    if im.width > 900: im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=82, method=6)
    return base

AUTOS = []
for i, a in enumerate(FLOTA.get("autos") or []):
    n = (a.get("nombre") or "").strip()
    if not n: error("el auto número %d no tiene nombre" % (i + 1))
    if a.get("categoria") not in CLAVES: error("el auto '%s' no tiene una categoría válida" % n)
    img = preparar_foto(a.get("foto"))
    if not img: error("el auto '%s' no tiene foto" % n)
    AUTOS.append((img, n, a["categoria"], str(a.get("pasajeros") or "").strip() or "5", 4, int(a.get("maletas") or 0)))
if not AUTOS: error("la flota está vacía")
TAM = {f[:-5]: Image.open(os.path.join(FLOTA_DIR, f)).size for f in os.listdir(FLOTA_DIR) if f.endswith(".webp")}
CON_AUTOS = [k for k in CLAVES if any(a[2] == k for a in AUTOS)]   # categorías que tienen al menos un auto

# ===== Datos que aparecen en los textos (teléfonos, horario, cargos, precios) =====
C = CONTACTO
MARCAS = {
    "{{VENTAS}}": html.escape(C["ventas"].strip()), "{{VENTAS_TEL}}": "+" + digitos(C["ventas"]),
    "{{ADMIN}}": html.escape(C["administracion"].strip()), "{{ADMIN_TEL}}": "+" + digitos(C["administracion"]),
    "{{WA}}": digitos(C["ventas"]),
    "{{ABRE}}": hora(C["horario_abre"]), "{{CIERRA}}": hora(C["horario_cierra"]),
    "{{CARGO}}": monto(C["cargo_fuera_de_horario"]), "{{JOVEN}}": monto(C["recargo_conductor_joven"]),
    "{{DEP_MIN}}": monto(C["deposito_minimo"]), "{{DEP_MAX}}": monto(C["deposito_maximo"]),
    "{{PRECIO_MIN}}": monto(min(PRECIOS[k] for k in CON_AUTOS)), "{{PRECIO_SUV}}": monto(PRECIOS["suv"]),
    "{{URL}}": URL, "{{GA_ID}}": GA_ID,
}
def marcar(t):
    for k, v in MARCAS.items(): t = t.replace(k, v)
    return t

IDIOMAS = {
    "es": dict(
        plantilla="index.src.html", carpeta="", raiz="", otro="en/",
        asientos="pasajeros", similar="o similar", puertas="puertas", maletas="maletas", auto="Automático", reservar="Reservar este", desde="Desde", dia="día",
        promo="Promoción",
        cookies='''<div class="cookies" id="cookie-banner" role="dialog" aria-live="polite" aria-label="Aviso de cookies" hidden>
  <p>Usamos solo el almacenamiento necesario para que la página funcione. Si en el futuro activamos herramientas de medición, solo se cargarán si las aceptas. <a href="cookies.html">Más información sobre cookies</a>.</p>
  <div class="row">
    <button class="btn btn-accent" data-cookie="todas">Aceptar</button>
    <button class="btn btn-ghost" data-cookie="necesarias">Solo necesarias</button>
  </div>
</div>''',
        legales=[("privacidad", "privacidad.frag.html", "Política de privacidad", "en/privacy.html"),
                 ("cookies", "cookies.frag.html", "Política de cookies", "en/cookies.html"),
                 ("terminos", "terminos.frag.html", "Términos y condiciones", "en/terms.html")],
        volver="← Volver al inicio",
    ),
    "en": dict(
        plantilla="index.en.src.html", carpeta="en", raiz="../", otro="../",
        asientos="passengers", similar="or similar", puertas="doors", maletas="bags", auto="Automatic", reservar="Book this car", desde="From", dia="day",
        promo="Special offer",
        cookies='''<div class="cookies" id="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie notice" hidden>
  <p>We only use the storage this website needs to work. If we ever add measurement tools, they will only load if you accept them. <a href="cookies.html">Learn more about cookies</a>.</p>
  <div class="row">
    <button class="btn btn-accent" data-cookie="todas">Accept</button>
    <button class="btn btn-ghost" data-cookie="necesarias">Necessary only</button>
  </div>
</div>''',
        legales=[("privacy", "privacy.en.frag.html", "Privacy policy", "../privacidad.html"),
                 ("cookies", "cookies.en.frag.html", "Cookie policy", "../cookies.html"),
                 ("terms", "terms.en.frag.html", "Terms and conditions", "../terminos.html")],
        volver="← Back to home",
    ),
}

def leer(n):
    with open(os.path.join(AQUI, n), encoding="utf-8") as f:
        return f.read()

def escribir(n, txt):
    p = os.path.join(SITIO, n)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(txt)

def promo_html(lang, T):
    """Franja de promoción en el inicio: solo si está activada en el panel y tiene texto."""
    texto = (PROMO.get("texto_en" if lang == "en" else "texto_es") or "").strip()
    if not PROMO.get("activa") or not texto: return ""
    return f'<a class="promo" href="#reservar"><b>{T["promo"]}</b><span>{html.escape(texto)}</span></a>'

def datos_estructurados(idx, lang, cats):
    """Ficha del negocio para Google (schema.org), en el idioma de la página. No se ve en la web."""
    en = lang == "en"
    url = URL + ("/en/" if en else "/")
    tel = tel_google(C["ventas"])
    negocio = {
        "@context": "https://schema.org", "@type": "AutoRental", "@id": URL + "/#negocio",
        "name": "Florida Renta Rápida", "legalName": "Clubs Enterprise, LLC", "url": url,
        "logo": URL + "/img/logo-negativo.svg", "image": URL + "/img/compartir-" + lang + ".webp",
        "telephone": tel,
        "address": {"@type": "PostalAddress", "streetAddress": "2175 NW 34th Ave", "addressLocality": "Miami",
                    "addressRegion": "FL", "postalCode": "33142", "addressCountry": "US"},
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": MARCAS["{{ABRE}}"].zfill(5), "closes": MARCAS["{{CIERRA}}"].zfill(5)}],
        "priceRange": "$%s–$%s" % (monto(min(PRECIOS[k] for k in CON_AUTOS)), monto(max(PRECIOS[k] for k in CON_AUTOS))),
        "currenciesAccepted": "USD", "paymentAccepted": "Visa, Mastercard, Diners Club, Discover",
        "areaServed": [{"@type": "City", "name": c} for c in ("Miami", "Fort Lauderdale", "Orlando")],
        "knowsLanguage": ["es", "en"],
        "contactPoint": {"@type": "ContactPoint", "telephone": tel, "contactType": "reservations",
                         "availableLanguage": ["Spanish", "English"]},
        "makesOffer": [{"@type": "Offer", "name": n, "url": url + "#flota",
            "priceSpecification": {"@type": "UnitPriceSpecification", "price": PRECIOS[k], "priceCurrency": "USD",
                                   "unitCode": "DAY", "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": "DAY"}}}
            for k, n in cats.items()],
    }
    preguntas = re.findall(r'<details name="faq">\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>', idx, re.S)
    limpio = lambda t: html.unescape(re.sub(r"<[^>]+>", "", t)).strip()
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang,
           "mainEntity": [{"@type": "Question", "name": limpio(q),
                           "acceptedAnswer": {"@type": "Answer", "text": limpio(r)}} for q, r in preguntas]}
    js = lambda d: json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return "".join(f'<script type="application/ld+json">{js(d)}</script>\n' for d in (negocio, faq))

def tarjeta(a, lang, T, cats):
    img, n, cat, asi, pue, mal = a
    n, c = html.escape(n), cats[cat]
    asi = html.escape(asi)
    return f'''<article class="auto" data-cat="{cat}">
        <div class="ph"><img src="{T['raiz']}img/flota/{img}.webp" alt="{n}" width="{TAM[img][0]}" height="{TAM[img][1]}" loading="lazy" decoding="async"></div>
        <small>{c}</small>
        <h3>{n}</h3>
        <p class="sim">{T['similar']}</p>
        <ul class="specs">
          <li><svg><use href="#i-seat"/></svg>{asi} {T['asientos']}</li>
          <li><svg><use href="#i-door"/></svg>{pue} {T['puertas']}</li>
          <li><svg><use href="#i-bag"/></svg>{mal} {T['maletas']}</li>
          <li><svg><use href="#i-gear"/></svg>{T['auto']}</li>
          <li><svg><use href="#i-ac"/></svg>A/C</li>
        </ul>
        <p class="precio"><span>{T['desde']}</span> <b>${monto(PRECIOS[cat])}</b><span>/{T['dia']}</span></p>
        <a class="btn" href="#reservar" data-reservar="{n}" data-cat="{c}" data-img="{T['raiz']}img/flota/{img}.webp" data-precio="{monto(PRECIOS[cat])}">{T['reservar']}</a>
      </article>'''

# Versión de CSS/JS según su contenido: si cambian, el navegador descarga la nueva
def version(rel):
    with open(os.path.join(SITIO, rel), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]
V_CSS, V_JS = version("css/estilos.css"), version("js/main.js")

iconos = re.search(r"<!-- Iconos.*?</svg>\n", leer("index.src.html"), re.S).group(0)

for lang, T in IDIOMAS.items():
    cats = {k: (es if lang == "es" else en) for k, es, en in CATS if k in CON_AUTOS}
    idx = leer(T["plantilla"])
    idx = idx.replace("{{ICONOS}}", iconos.strip())
    idx = idx.replace("{{CHIPS}}", "\n      ".join(f'<button class="chip" aria-pressed="false" data-f="{k}">{v}</button>' for k, v in cats.items()))
    idx = idx.replace("{{OPCIONES}}", "".join(f"<option>{v}</option>" for v in cats.values()))
    mitad = (len(AUTOS) + 1) // 2   # la flota va en dos filas que avanzan en sentidos opuestos
    idx = idx.replace("{{FLOTA_A}}", "\n      ".join(tarjeta(a, lang, T, cats) for a in AUTOS[:mitad]))
    idx = idx.replace("{{FLOTA_B}}", "\n      ".join(tarjeta(a, lang, T, cats) for a in AUTOS[mitad:]))
    p = promo_html(lang, T)
    idx = idx.replace("{{PROMO}}", p) if p else idx.replace("    {{PROMO}}\n", "")
    # El CSS va dentro del HTML (una descarga menos = la página aparece antes)
    css = open(os.path.join(SITIO, "css", "estilos.css"), encoding="utf-8").read()
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s*\n\s*", "", css).replace("url(../", "url(" + T["raiz"])
    idx = idx.replace(f'<link rel="stylesheet" href="{T["raiz"]}css/estilos.css">', f"<style>{css}</style>")
    idx = idx.replace('css/estilos.css"', f'css/estilos.css?v={V_CSS}"').replace('js/main.js"', f'js/main.js?v={V_JS}"')
    idx = marcar(idx.replace("{{COOKIES}}", T["cookies"]))
    if NOINDEX:
        idx = idx.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">', 1)
    pre = (T["carpeta"] + "/") if T["carpeta"] else ""
    escribir(pre + "index.html", idx.replace("</head>", datos_estructurados(idx, lang, cats) + "</head>", 1))

    # Páginas legales: reutilizan encabezado, pie y aviso de cookies del index
    cab = re.search(r"<!doctype html>.*?</header>", idx, re.S).group(0)
    pie = re.search(r"<footer>.*", idx, re.S).group(0)
    titulo_home = re.search(r"<title>(.*?)</title>", cab).group(1)
    for archivo, frag, titulo, equivalente in T["legales"]:
        c = cab.replace(f"<title>{titulo_home}</title>", f"<title>{titulo} | Florida Renta Rápida</title>")
        c = re.sub(r'<link rel="preload" as="image"[^>]*>\n', "", c)
        c = re.sub(r'<link rel="alternate"[^>]*>\n', "", c)
        c = re.sub(r'<meta property="og:url"[^>]*>\n', "", c)  # la vista previa usa la dirección de la propia página
        c = re.sub(r'(<link rel="canonical" href=")[^"]*(")', r"\g<1>" + URL + "/" + pre + archivo + r".html\g<2>", c)
        c = re.sub(r'(<meta property="og:title" content=")[^"]*(")', r"\g<1>" + titulo + r" | Florida Renta Rápida\g<2>", c)
        c = c.replace('href="#inicio"', 'href="index.html"')
        for ancla in ("#flota", "#incluye", "#preguntas", "#reservar", "#contacto"):
            c = c.replace(f'href="{ancla}"', f'href="index.html{ancla}"')
        # el botón de idioma lleva a la misma página legal en el otro idioma
        c = re.sub(r'(<a class="lang" href=")[^"]*(")', r"\g<1>" + equivalente + r"\g<2>", c)
        pagina = c + f'\n<main class="legal"><div class="wrap">\n{marcar(leer(frag))}\n<p><a href="index.html">{T["volver"]}</a></p>\n</div></main>\n' + pie
        escribir(pre + archivo + ".html", pagina)

# Resumen para asistentes de IA (llms.txt), con los mismos precios y datos
if os.path.exists(os.path.join(AQUI, "llms.src.txt")):
    es = {k: e for k, e, _ in CATS}
    lineas = []
    for k in CON_AUTOS:
        nombres = [a[1] for a in AUTOS if a[2] == k]
        extra = ", %s pasajeros," % [a[3] for a in AUTOS if a[2] == k][0] if k == "maxivan" else ""
        lineas.append("- %s (%s%s o similar): $%s" % (es[k], ", ".join(nombres), extra, monto(PRECIOS[k])))
    escribir("llms.txt", marcar(leer("llms.src.txt")).replace("{{FLOTA_LLMS}}", "\n".join(lineas)))

print("Listo: sitio/ (español) y sitio/en/ (inglés)")
