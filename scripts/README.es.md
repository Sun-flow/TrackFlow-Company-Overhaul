# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts

| Script | Qué hace |
| ------ | -------- |
| `check-memory.py` | Revisa el memory bank (`AGENTS.md` y `memory-bank/`): archivos que faltan, rutas rotas, archivos que superan su límite de palabras y elementos de estado sin fecha, y lista el trabajo en curso en otras ramas. `python3 scripts/check-memory.py` (solo necesita Python 3 y git). No lo edites: viene con el diseño del memory bank y se reemplaza entero cuando ese diseño cambia (`memory-bank/README.md`). |
| `site-check.py` | Sirve un sitio estático, hace capturas de cada página a 375/768/1024/1440px y falla con errores de consola, scroll horizontal o violaciones de axe-core. `python3 scripts/site-check.py --help`. Requiere `pip3 install -r scripts/requirements.txt`. |
