# Prompt para agente de frontend — Dashboard de Líderes (Seguimientos v2)

## Contexto del proyecto

Estamos trabajando en el widget de **Seguimientos v2** que se embebe en Odoo para ayudar a las Asesoras Familiares (AFs) con sus seguimientos comerciales. Ya tenemos implementado:

- Un widget existente que se inyecta en Odoo
- Un **botón flotante circular abajo a la izquierda** que abre un modal con la herramienta de seguimientos para AFs

## Lo que vamos a sumar

Una **nueva sección completamente separada**: un **dashboard de control para líderes de equipo** (Eva, Mariluz, Jordi y yo como builder). No es la misma audiencia que las AFs, no es la misma herramienta, no comparten modal.

### Cambios visibles para el usuario final

1. **Nuevo botón flotante circular** ubicado **encima del botón actual de seguimientos**, mismo diseño pero un poco más chico o con un tono ligeramente más oscuro para diferenciarlo visualmente sin romper consistencia.
2. **Solo visible para usuarios autorizados** (whitelist por email, ver detalle más abajo).
3. Al clicarlo, abre un **modal nuevo, completamente independiente** del modal de seguimientos, con el dashboard de control.

---

## Control de acceso

El botón del dashboard de líderes **solo debe aparecer** para usuarios cuyo email esté en la siguiente whitelist:

```js
const LEADER_EMAILS = new Set([
  "alejandro.vivas@qida.es",
  "eva.fernandez.arratia@qida.es",
  "jordi.castillo@qida.es",
  "mariluz.guerrero@qida.es"
]);
```

**Lógica de uso en init del widget**, después de `get_session_info`:

```js
const session = await odooSession();
const isLeader = LEADER_EMAILS.has(session.username);

if (isLeader) {
  // Renderizar AMBOS botones: el de seguimientos (que ya existe) y el de dashboard de líderes (nuevo)
  // El dashboard se muestra arriba del botón de seguimientos
}
// Si no es leader, comportamiento actual sin cambios (solo botón de seguimientos)
```

**Importante**: las AFs normales (no leaders) deben seguir viendo exactamente lo que ven hoy. El botón nuevo no debe aparecerles bajo ninguna circunstancia.

---

## Stack técnico (heredado del widget actual)

- **HTML + JavaScript vanilla**, todo en archivos `.js`
- Sin React, sin Tailwind, sin build step
- **ApexCharts vía CDN** para las gráficas: `https://cdn.jsdelivr.net/npm/apexcharts`
- CSS inline o en `<style>` inyectado por JS
- Sin dependencias adicionales más allá de las que ya usa el widget actual

---

## Especificación funcional del Dashboard

### Contexto de usuarios del dashboard

- **Eva Fernández** (Head of AF): ve todo el equipo, MAD + CAT
- **Mariluz Guerrero** (Manager AFs Madrid): ve solo equipo MAD
- **Jordi Castillo** (Manager AFs Cataluña): ve solo equipo CAT
- **Alejandro Vivas** (yo, AI Product Builder): ve todo, para desarrollo y demos

**Para esta primera versión MVP de demo: todos los leaders ven todos los datos.** El filtrado por permisos (Mariluz solo MAD, etc.) se implementa más adelante. En esta versión, el selector de localidad en el header sirve para que cada uno filtre manualmente.

### Objetivo del dashboard

Que el líder identifique de un vistazo:
- Qué AFs necesitan atención
- Qué leads se están enfriando
- Preparar 1:1s sin entrar AF por AF en Odoo

### Datos

**Toda la información es MOCK / ficticia**. No conectar a backend real. Datos hardcodeados como constantes al inicio del archivo.

---

## Estructura visual del Dashboard

### Identidad visual

- Estilo limpio, profesional, **NO infantil ni con colores saturados**
- Paleta sobria: blancos, grises neutros, un color de acento azul `#3B82F6`
- Colores semánticos para temperatura y estados:
  - Caliente: `#EF4444` | Templado: `#F59E0B` | Frío: `#3B82F6`
  - OK: verde `#10B981` | Atención: ámbar `#F59E0B` | Sobrecarga: rojo `#EF4444`
- Tipografía: `Inter, system-ui, -apple-system, sans-serif`
- Cards con `border-radius: 12px`, sombras sutiles
- **Inspiración**: dashboards tipo Linear, Vercel, Stripe

### Header del modal

- Título: "Seguimientos v2 · Panel de líderes"
- Lado derecho: selector de localidad (Todos / Madrid / Cataluña) + selector de team lead (Todos / Mariluz / Jordi)
- Botón de cerrar el modal (X) arriba a la derecha

### Fila 1 — 4 KPIs principales (cards horizontales)

| Card | Valor mock | Subtítulo (gris pequeño) |
|------|-----------|--------------------------|
| Leads totales en cartera | 487 | "snapshot actual" |
| % cartera con <3 seguimientos | 34% | "165 leads" |
| Conversión del equipo | 8.2% | "últimos 30 días" |
| AFs en zona de riesgo | 2 de 8 | "Sobrecarga o bajo seguimiento" |

**Sin deltas / sin flechitas de cambio**. No tenemos baseline histórico real.

### Fila 2 — 2 gráficas ApexCharts (50/50)

**Izquierda: Donut de distribución por temperatura**
- 3 segmentos: Calientes 98 (20%), Templados 156 (32%), Fríos 233 (48%)
- En el centro: total 487 con label "Leads totales"
- Leyenda lateral con cuadrados de color + nombre + número + %

**Derecha: Area chart de % cartera con seguimiento adecuado, últimas 8 semanas**
- Eje X: "Sem 14" a "Sem 21"
- Eje Y: 0-100%
- Una serie: `[38, 41, 44, 48, 52, 58, 63, 66]`
- **Annotation horizontal punteada en 68%** marcando el target
- Color azul de acento

### Fila 3 — Tabla de detalle por AF

Header de la tabla:
- Título "Detalle por AF" a la izquierda
- A la derecha: input de búsqueda (filtra por nombre en tiempo real) + botón "Exportar" (visual, sin acción real)

Columnas (10):
1. AF (avatar circular con iniciales + nombre)
2. Localidad (badge MAD/CAT)
3. Leads en cartera (número + barra de progreso fina, escala 0-100)
4. 🔴 Calientes (número, fondo rojo tenue)
5. 🟡 Templados (número, fondo ámbar tenue)
6. 🔵 Fríos (número, fondo azul tenue)
7. % con <3 seguimientos (color del texto: rojo si >40%, ámbar si 25-40%, verde si <25%)
8. Interacciones / lead (decimal)
9. Conversión (%)
10. Estado (badge OK / Atención / Sobrecarga)

**Datos mock**:

```js
const afs = [
  { nombre: "Alba Álvarez",    localidad: "CAT", cartera: 62, calientes: 18, templados: 22, frios: 22, bajoSeg: 18, intPorLead: 3.2, conversion: 11.2, estado: "OK" },
  { nombre: "Natalia Godoy",   localidad: "MAD", cartera: 78, calientes: 14, templados: 24, frios: 40, bajoSeg: 42, intPorLead: 1.8, conversion: 7.4,  estado: "Atención" },
  { nombre: "Graciela Mateos", localidad: "MAD", cartera: 71, calientes: 12, templados: 25, frios: 34, bajoSeg: 35, intPorLead: 2.4, conversion: 8.9,  estado: "OK" },
  { nombre: "Sandra Casol",    localidad: "CAT", cartera: 89, calientes: 9,  templados: 20, frios: 60, bajoSeg: 58, intPorLead: 1.4, conversion: 5.2,  estado: "Sobrecarga" },
  { nombre: "Eva Martínez",    localidad: "MAD", cartera: 54, calientes: 16, templados: 19, frios: 19, bajoSeg: 22, intPorLead: 3.0, conversion: 10.1, estado: "OK" },
  { nombre: "María Díaz",      localidad: "CAT", cartera: 68, calientes: 11, templados: 24, frios: 33, bajoSeg: 38, intPorLead: 2.1, conversion: 8.0,  estado: "Atención" },
  { nombre: "Natalia Narro",   localidad: "MAD", cartera: 45, calientes: 14, templados: 16, frios: 15, bajoSeg: 15, intPorLead: 3.4, conversion: 12.3, estado: "OK" },
  { nombre: "Paloma Ruiz",     localidad: "CAT", cartera: 49, calientes: 8,  templados: 15, frios: 26, bajoSeg: 48, intPorLead: 1.6, conversion: 6.8,  estado: "Atención" }
];
```

Comportamiento:
- Sortable por clic en encabezado (indicador ↑/↓)
- Hover destaca la fila
- Cursor pointer sugiere drill-down (sin acción en mock)
- Búsqueda filtra en tiempo real

---

## Lo que NO debe tener

- ❌ Conexión con backend, todo es mock
- ❌ Mezclar con el modal de seguimientos existente
- ❌ Aparecer para usuarios no listados en la whitelist
- ❌ Deltas tipo "+12% vs semana anterior"
- ❌ Sidebar de navegación, logos de empresa ficticia
- ❌ Más de 2 gráficas grandes
- ❌ Modo dark
- ❌ Emojis literales como decoración (los 🔴🟡🔵 son referencia, usar dots CSS)

---

## Lo que necesito de vos AHORA

**No quiero que escribas código todavía.** Necesito que primero me devuelvas un **plan de implementación** que cubra:

### 1. Análisis del estado actual

- ¿Cómo está estructurado hoy el archivo del widget? ¿Hay un único `.js` o múltiples?
- ¿Dónde está exactamente el botón flotante actual y cómo se inicializa?
- ¿Qué funciones / hooks de Odoo se usan hoy (`get_session_info`, render del modal, etc.)?

### 2. Estrategia de integración

- ¿Dónde añadís el chequeo de whitelist? ¿En qué punto del lifecycle del widget?
- ¿El nuevo botón y el nuevo modal viven en el mismo `.js` que el actual, en otro archivo separado, o en un módulo nuevo? Justificar.
- ¿Cómo evitamos que código del dashboard de líderes se cargue para usuarios que no son leaders? (lazy load vs siempre cargado pero oculto)

### 3. Estructura propuesta del código

- Lista de archivos a crear / modificar
- Funciones principales que vas a crear (firma + qué hacen)
- Cómo se inyecta ApexCharts si no estaba ya cargado
- Cómo se gestiona el estado del dashboard (filtros, sorting, búsqueda)

### 4. Plan de implementación en pasos

Secuencia ordenada de pasos para llegar al MVP funcional. Para cada paso:
- Qué hace
- Qué archivos toca
- Qué se puede probar después de completarlo

### 5. Riesgos y consideraciones

- ¿Hay riesgo de conflicto de estilos CSS entre el modal de seguimientos y el modal del dashboard?
- ¿Cómo asegurás que el dashboard no afecta el rendimiento del widget actual cuando está cerrado?
- ¿Algún punto donde necesites decisión de mi parte antes de avanzar?

### 6. Preguntas abiertas

Listame las dudas o decisiones que necesites confirmar conmigo antes de empezar a codear.

---

## Criterios de aceptación del plan

- Plan claro y secuencial, no salto inmediato a código
- Identifica riesgos sin maquillarlos
- Propone decisiones técnicas con justificación breve
- Marca explícitamente lo que es decisión mía vs lo que vos resolvés

Cuando me devuelvas el plan lo revisamos juntos, ajustamos lo que haga falta, y recién ahí empezás a codear.
