# Estudio de Contenido Académico — Teach & Joy

Sistema de autoría y gestión de contenido académico para cursos y diplomados.

## Inicio rápido

```bash
cd tj-studio
npm install
npm run dev
```

Luego abre `http://localhost:5173` en tu navegador.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Tecnologías

- React 18 + TypeScript
- Vite
- Tailwind CSS
- TipTap (editor enriquecido)
- Lucide React (iconos)
- React Router DOM

## Funcionalidades incluidas

### Gestión Académica
- Drag & drop para reordenar diplomados/cursos y módulos
- Formulario completo de oferta: Fecha/Edición, Autor(es)/Institución, Modalidad, Duración, Público objetivo, Requisitos, Propósito general
- Módulos con nombre y objetivos
- Temas agrupados por oferta y módulo (sin repetición)
- Control de permisos por perfil (admin/coordinador/editor)

### Editor de Temas
- Editor TipTap con barra de herramientas completa
- Inserción de tablas con +Fila, +Columna, -Fila, -Columna
- Imágenes con control de escala en documento
- Bloques especiales del snippet de identidad corporativa
- Referencia bibliográfica desde el editor (existentes o nueva)
- Exportación HTML con identidad corporativa / snippet

### Repositorio
- Árbol de carpetas y subcarpetas
- Control de acceso por perfil (admin decide quién ve qué)
- Subida de archivos múltiples

### Bibliografía
- Organizada por oferta educativa y módulo
- Estilos APA y Vancouver
- Todos los tipos de fuente

### Identidades Corporativas (solo admin)
- Importar desde JSON (formato Teach & Joy)
- Configurar colores, tipografía, estilo de botones
- Snippets HTML para exportación Moodle
- Detección automática de bloques especiales (Tip, Perla, Nota, etc.)

### Vista Previa
- Modo Estudio
- Modo Moodle (simulación del LMS)
- Modo Móvil

## Perfiles de usuario (demo)

| Usuario | Rol | Acceso |
|---------|-----|--------|
| Dr. Carlos Admin | Administrador | Todo |
| Dra. Ana Coordinadora | Coordinador | Gestión académica propia |
| Dr. Miguel Profesor | Editor | Solo sus temas asignados |
| Dra. Laura Editora | Editor | Solo sus temas asignados |
