# Dashboard qPCR ΔΔCt (método tipo Taylor)

Dashboard web frontend-only para análisis de expresión génica qPCR con cálculo de
ΔΔCt, normalización por housekeeping y visualización en log2. Está diseñado para
funcionar en GitHub Pages (sin backend ni almacenamiento persistente).

## Características

- Carga de archivos `.xlsx` o `.csv` directamente en el navegador.
- Selección de hoja (si aplica) y mapeo guiado de columnas.
- Definición de grupo control y múltiples genes target.
- Cálculo por gen: ΔCt, 2^ΔCt, expresión normalizada y log2.
- Resultados en formato largo (intermedio) y ancho (consolidado).
- Visualización interactiva (boxplot o scatter con jitter) por gen.
- Descarga de resultados en `.xlsx`.

## Requisitos

- Navegador moderno.
- Conexión a internet para cargar las librerías vía CDN (SheetJS y Plotly).

## Uso

1. Abrir `index.html` en un servidor estático (por ejemplo GitHub Pages).
2. Cargar un archivo `.xlsx` o `.csv`.
3. Seleccionar la hoja si el archivo tiene más de una.
4. Mapear columnas:
   - Identificador de muestra
   - Grupo
   - Ct housekeeping
   - Uno o más Ct de genes target
5. Definir el grupo control.
6. Ejecutar el análisis.
7. Explorar el gráfico por gen y descargar las tablas.

## Lógica de cálculo (por gen)

- Se usa el mismo housekeeping y el mismo grupo control para todos los genes.
- Para cada muestra válida:
  - ΔCt_housekeeping = Ct_housekeeping_muestra − promedio_control_housekeeping
  - ΔCt_target = Ct_target_muestra − promedio_control_target
  - HK_exp = 2^(ΔCt_housekeeping)
  - Target_exp = 2^(ΔCt_target)
  - normalized_expression = Target_exp / HK_exp
  - log2_expression = log2(normalized_expression)

## Validaciones

- Una muestra solo se procesa si tiene:
  - Identificador válido
  - Grupo válido
  - Ct housekeeping numérico
  - Ct target numérico
- El grupo control debe existir y tener al menos una muestra válida por gen.
- No se calculan replicados técnicos (se asume que el Ct ya está promediado).

## Estructura del proyecto

```
/
├── index.html
├── style.css
├── app.js
├── utils/
│   ├── parser.js
│   ├── analysis.js
│   └── plots.js
└── README.md
```

## Desarrollo local

Levante un servidor simple:

```bash
python -m http.server 8000
```

Luego abra `http://localhost:8000`.

## Licencia

Uso interno / académico. Ajuste según las necesidades del proyecto.
