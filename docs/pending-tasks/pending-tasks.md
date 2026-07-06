# List of pending tasks

They must be mark as done when thery are implemented.

## Pending tasks

[x] Implementación de revisión de PRs mediante github actions. Tras la implementación de una tarea, se crearán las prs correspondientes.
De forma automática se debe lanzar una revisión de la misma.

[] Los componentes deben estar ubicados dentro de una carpeta con su mismo nombre. Por ejemplo:
├── ui/components
        ├── button/
            ├── button.ts // solo componente representacional, sin lógica
            ├── button.types.ts
            ├── button.hook.ts //hooks que solo se usan dentro del componente
            ├── _tests_ 
                ├── button.test.ts //por regla general no serán testeados
                ├── button.hook.test.ts
Debemos especificar esto en readme.md y agents.md para dar constancia.

