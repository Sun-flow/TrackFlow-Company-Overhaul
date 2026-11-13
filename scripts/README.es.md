# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts

| Script | Qué hace |
| ------ | -------- |
| `check-memory.py` | Revisa el memory bank (`AGENTS.md` y `memory-bank/`): archivos que faltan, rutas rotas, archivos que superan su límite de palabras y elementos de estado sin fecha, y lista el trabajo en curso en otras ramas. `python3 scripts/check-memory.py` (solo necesita Python 3 y git). No lo edites: viene con el diseño del memory bank y se reemplaza entero cuando ese diseño cambia (`memory-bank/README.md`). |
| `wire-cloud-hooks.py` | Hace que los hooks del testing kit se ejecuten cuando Claude arranca en la carpeta que contiene este repo, como hace un hilo de proyecto: escribe el `.claude/settings.json` de esa carpeta a partir del del repo y enlaza su `.claude/testing-kit` al del repo. El entorno en la nube del proyecto lo ejecuta antes de que arranque Claude: `python3 TrackFlow-Company-Overhaul/scripts/wire-cloud-hooks.py`. Solo necesita Python 3. |
| `site-check.py` | Sirve un sitio estático, hace capturas de cada página a 375/768/1024/1440px y falla con errores de consola, scroll horizontal o violaciones de axe-core. `python3 scripts/site-check.py --help`. Requiere `pip3 install -r scripts/requirements.txt`. |
