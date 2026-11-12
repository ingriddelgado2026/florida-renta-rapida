# Florida Renta Rápida

Web de alquiler de autos: https://floridarentarapida.com

- `datos/`: precios, flota, contacto y promoción. Se cambian desde el panel (https://app.pagescms.org).
- `fuente/`: plantillas y `construir.py`, que arma la web.
- `sitio/`: imágenes, estilos y scripts; aquí queda la web armada.

Cada vez que se guarda un cambio, GitHub Actions ejecuta `python fuente/construir.py` y publica `sitio/` en GitHub Pages.
