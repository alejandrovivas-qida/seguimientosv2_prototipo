# Fixes Dashboard de Líderes — v1.12.1

## Contexto

v1.12.0 publicada y probada. Funciona el flujo base (whitelist, lazy ApexCharts, modal independiente, filtros que afectan todo). Necesito ajustes de UX y de coherencia de datos antes de la demo del martes con Alba y Marina.

**Bump**: `v1.12.0 → v1.12.1`.

---

## Fixes a aplicar

### 🔴 Fix #1 — Scroll del modal roto

**Problema**: el modal del leader dashboard NO permite scroll vertical. La tabla "AFs del equipo" queda cortada y no hay forma de verla completa.

**Causa probable**: falta `overflow-y: auto` en `.qida-shell` o `#qida-content`, o el `max-height` está mal calculado.

**Fix**: el contenido del modal debe ser scrolleable verticalmente cuando supere la altura del viewport. El header debe quedar fijo arriba (sticky) si es posible. Verificar que no rompa el modal AF original.

### 🔴 Fix #2 — Filtros apilados en 3 filas

**Problema**: los filtros (localidad, team-lead, search) están apilados verticalmente ocupando ~150px inútiles. El botón "Exportar" está separado a la derecha.

**Fix**: todos los filtros en una sola fila horizontal:
```
[Selector localidad] [Selector team-lead] [Search AF...]        [Exportar]
```

CSS: `display: flex; gap: 12px; align-items: center; flex-wrap: wrap;`. "Exportar" alineado a la derecha con `margin-left: auto`.

Los selectores y el search no necesitan ser tan anchos. Ancho razonable tipo 220px cada uno.

### 🔴 Fix #3 — Modal demasiado chico, mucho margen lateral

**Problema**: el modal tiene márgenes laterales y verticales grandes. Se aprovecha mal el viewport.

**Fix**: hacer el modal más grande:
- `width: 95vw`
- `height: 92vh`
- `max-width: 1600px`
- `max-height: 92vh`
- Márgenes mínimos arriba/abajo y a los costados

**Importante**: aplicar SOLO cuando `state.view === 'leadersDashboard'`. El modal AF original mantiene sus dimensiones actuales. NO romper el modal AF.

### 🟡 Fix #4 — Eliminar deltas falsos de los KPIs

**Problema**: los KPIs muestran:
- "+6,2% vs semana anterior"
- "+2,4 pp"
- "Estable"
- "del equipo filtrado"

**Decisión de v1.12.0 que no se respetó**: NO debe haber deltas / indicadores de cambio temporal. No tenemos baseline histórico real.

**Fix**: eliminar todos los deltas. Mantener solo subtítulos descriptivos en gris pequeño:

| KPI | Valor | Subtítulo |
|-----|-------|-----------|
| Leads totales en cartera | 487 | "snapshot actual" |
| % cartera con <3 seguimientos | 34% | "165 leads" |
| Conversión del equipo | 8.2% | "últimos 30 días" |
| AFs en zona de riesgo | 2 de 16 | "Sobrecarga o bajo seguimiento" |

(El "2 de 16" se actualiza al cambiar el mock a 16 AFs, ver Fix #6.)

### 🟡 Fix #5 — Filtro de localidad por defecto = "Todas"

**Problema**: el dashboard abre con "Cataluña" preseleccionado en el filtro de localidad.

**Fix**: `state.leaderDash.locFilter = 'all'` al inicializar. El dashboard arranca mostrando TODAS las AFs, todas las localidades. Solo si el usuario aplica un filtro, se aplica.

### 🟡 Fix #6 — Mock con nombres reales de AFs (16 filas)

**Problema**: el mock tiene 8 AFs ficticias. La data real del proyecto tiene 16 AFs con nombres reales.

**Fix**: reemplazar `MOCK_LEADER_AFS` con las 16 AFs reales. Mantener las mismas columnas pero con números mock realistas y coherentes (variedad de estados, no todos OK ni todos en alerta).

**Nuevo mock**:

```js
const MOCK_LEADER_AFS = [
  { nombre: "Ana Pinilla",          localidad: "MAD", cartera: 82, calientes: 18, templados: 28, frios: 36, bajoSeg: 24, intPorLead: 3.1, conversion: 10.4, estado: "OK" },
  { nombre: "María Aridane Asiaín", localidad: "MAD", cartera: 74, calientes: 16, templados: 25, frios: 33, bajoSeg: 27, intPorLead: 2.9, conversion: 9.7,  estado: "OK" },
  { nombre: "Graciela Mateos",      localidad: "MAD", cartera: 71, calientes: 12, templados: 25, frios: 34, bajoSeg: 35, intPorLead: 2.4, conversion: 8.9,  estado: "OK" },
  { nombre: "Mariluz Guerrero",     localidad: "MAD", cartera: 38, calientes: 10, templados: 14, frios: 14, bajoSeg: 18, intPorLead: 3.2, conversion: 9.5,  estado: "OK" },
  { nombre: "Inma Juárez López",    localidad: "CAT", cartera: 65, calientes: 13, templados: 22, frios: 30, bajoSeg: 32, intPorLead: 2.5, conversion: 8.4,  estado: "OK" },
  { nombre: "Ana Bezares",          localidad: "BIL", cartera: 58, calientes: 11, templados: 19, frios: 28, bajoSeg: 34, intPorLead: 2.3, conversion: 8.1,  estado: "Atención" },
  { nombre: "María Díaz",           localidad: "MAD", cartera: 68, calientes: 11, templados: 24, frios: 33, bajoSeg: 38, intPorLead: 2.1, conversion: 8.0,  estado: "Atención" },
  { nombre: "Paloma Gálvez",        localidad: "CAT", cartera: 49, calientes: 8,  templados: 15, frios: 26, bajoSeg: 48, intPorLead: 1.6, conversion: 6.8,  estado: "Atención" },
  { nombre: "Alba Álvarez Rubio",   localidad: "CAT", cartera: 62, calientes: 18, templados: 22, frios: 22, bajoSeg: 18, intPorLead: 3.2, conversion: 11.2, estado: "OK" },
  { nombre: "Natalia Narro",        localidad: "MAD", cartera: 45, calientes: 14, templados: 16, frios: 15, bajoSeg: 15, intPorLead: 3.4, conversion: 12.3, estado: "OK" },
  { nombre: "Asun Herrera Teixidó", localidad: "CAT", cartera: 53, calientes: 9,  templados: 18, frios: 26, bajoSeg: 41, intPorLead: 1.9, conversion: 7.2,  estado: "Atención" },
  { nombre: "Pilar Comyn",          localidad: "MAD", cartera: 47, calientes: 7,  templados: 16, frios: 24, bajoSeg: 45, intPorLead: 1.7, conversion: 6.5,  estado: "Atención" },
  { nombre: "Natalia Godoy",        localidad: "MAD", cartera: 78, calientes: 14, templados: 24, frios: 40, bajoSeg: 42, intPorLead: 1.8, conversion: 7.4,  estado: "Atención" },
  { nombre: "Sandra Casol",         localidad: "CAT", cartera: 89, calientes: 9,  templados: 20, frios: 60, bajoSeg: 58, intPorLead: 1.4, conversion: 5.2,  estado: "Sobrecarga" },
  { nombre: "Marina Costa",         localidad: "CAT", cartera: 42, calientes: 12, templados: 14, frios: 16, bajoSeg: 19, intPorLead: 2.8, conversion: 1.4,  estado: "OK" },
  { nombre: "Rubén Fernández",      localidad: "MAD", cartera: 56, calientes: 12, templados: 19, frios: 25, bajoSeg: 30, intPorLead: 2.6, conversion: 8.7,  estado: "OK" },
  { nombre: "Sandra Muro",          localidad: "VAL", cartera: 51, calientes: 10, templados: 18, frios: 23, bajoSeg: 35, intPorLead: 2.2, conversion: 7.6,  estado: "Atención" },
  { nombre: "Maylan Almeida",       localidad: "MAD", cartera: 44, calientes: 9,  templados: 15, frios: 20, bajoSeg: 36, intPorLead: 2.0, conversion: 7.0,  estado: "Atención" },
  { nombre: "Andrea Mahia",         localidad: "COR", cartera: 39, calientes: 7,  templados: 13, frios: 19, bajoSeg: 38, intPorLead: 1.9, conversion: 6.9,  estado: "Atención" }
];
```

**Nota sobre Marina Costa**: tiene conversión 1.4% (es coach, no AF de campo, baja conversión esperada). Dejarla así, es un outlier real conocido en el negocio.

**Localidades nuevas en el filtro**: agregar BIL (Bilbao), VAL (Valencia), COR (Coruña) al selector de localidad. Opciones del select:
- Todas las localidades
- MAD (Madrid)
- CAT (Cataluña)
- BIL (Bilbao)
- VAL (Valencia)
- COR (Coruña)

### 🟢 Fix #7 — Gráfica de tendencia: replanteo completo

**Problema actual**:
1. Título "Tendencia de conversión (14 días)" — granularidad incorrecta, los líderes piensan en meses, no en días.
2. Eje Y muestra valores 135-165 sin unidad clara, no parece % de conversión.
3. No hay forma de cambiar la métrica visualizada.

**Fix**: la gráfica debe tener un **toggle / switch** entre dos métricas:

**Métrica A (default al abrir): Conversión mensual del equipo**
- Eje X: últimos 6 meses (etiquetas: "Dic 25", "Ene 26", "Feb 26", "Mar 26", "Abr 26", "May 26")
- Eje Y: porcentaje de conversión (0% a 12%)
- Datos mock: `[6.8, 7.1, 7.4, 7.8, 8.0, 8.2]`
- Línea horizontal punteada en **8% como target de negocio**
- Label de la línea target: "Target 8%"
- Título: "Conversión mensual del equipo"

**Métrica B (alternativa): Cobertura de seguimientos**
- Eje X: últimos 6 meses (mismas etiquetas)
- Eje Y: porcentaje (0% a 100%)
- Datos mock: `[37, 42, 48, 54, 61, 66]` (tendencia ascendente hacia el objetivo del proyecto)
- Línea horizontal punteada en **68% como target del PRD**
- Label de la línea target: "Target 68%"
- Título: "% cartera con ≥3 seguimientos"

**Cómo cambiar entre métricas**:
- Dos botones tipo "pill" o "tab" arriba a la derecha del card de la gráfica (al lado del título).
- Estado activo: azul de acento `#3B82F6` con texto blanco.
- Estado inactivo: gris claro con texto gris oscuro.
- Texto de los botones: "Conversión" y "Cobertura".
- Cambiar entre uno y otro NO debe destruir/recrear todo el card, solo updatear la serie de ApexCharts con `chart.updateOptions()` o `chart.updateSeries()`.

**State nuevo**:
```js
state.leaderDash.trendMetric = 'conversion'; // 'conversion' | 'coverage'
```

**Persistencia**: durante la sesión (igual que filtros).

---

## Cosas que NO hay que tocar

- Whitelist de leaders.
- Lógica de inyección lazy de ApexCharts.
- Donut de temperatura (funciona bien).
- Modal AF original (que no se rompa con los cambios de modal grande).
- Tampermonkey, GTM loader, index.html.

---

## Validación / smoke test

Al abrir el modal del leader dashboard:

1. **Modal grande**: usa casi toda la pantalla, márgenes mínimos.
2. **Scroll funciona**: la tabla de AFs se ve completa, se puede scrollear.
3. **Filtros en una fila**: localidad, team-lead, search horizontales. Exportar alineado a la derecha.
4. **KPIs sin deltas**: solo número grande + subtítulo descriptivo en gris.
5. **Filtro localidad arranca en "Todas"**: al abrir el dashboard, se ven las 19 AFs.
6. **Tabla con 19 AFs reales**: Ana Pinilla, María Aridane, etc.
7. **Filtro localidad MAD**: KPIs, donut, gráfica de tendencia Y tabla se filtran a MAD.
8. **Gráfica de tendencia arranca con "Conversión"**: 6 meses en eje X, target 8%.
9. **Click en "Cobertura"**: switch a la otra métrica, target 68%, datos diferentes.
10. **ESC cierra**, reabrir conserva filtros y métrica seleccionada.

---

## Output esperado

1. `qida-widget.v1.js` v1.12.1.
2. Bloque "Cambios v1.12.1" en docstring.
3. Mock actualizado a 19 filas con nombres reales.
4. State `state.leaderDash.trendMetric` con switcher funcional.
5. CSS ajustado para modal grande, filtros en una fila, scroll OK.
6. `node --check` exit 0.
7. **Sin commits, sin push**. Alejandro publica.
