# Gestión de Residentes — Centro de Rehabilitación

Aplicación web para administrar residentes de un centro de rehabilitación.
Funciona **sin instalar nada**: se abre con doble clic en cualquier navegador moderno
(Chrome, Edge o Firefox) y guarda la información **en el propio equipo**, sin enviarla
a ningún servidor.

---

## Cómo abrirla

**Opción A — archivo único (recomendada para uso diario)**

Doble clic en **`Gestion_Residentes.html`**. Es un solo archivo autocontenido:
se puede copiar a un pendrive, a otra carpeta o a otro computador.

**Opción B — versión por módulos (para modificar el código)**

Doble clic en **`app/index.html`**. El código está separado en archivos
(`app/css/styles.css` y `app/js/*.js`), lo que facilita editarlo.

> Después de modificar los archivos de `app/`, ejecute `build.ps1` para regenerar
> `Gestion_Residentes.html`:
>
> ```bash
> powershell -ExecutionPolicy Bypass -File build.ps1
> ```

Las dos versiones contienen exactamente el mismo programa. Según el navegador pueden
compartir o no el mismo almacenamiento, así que **use solo una de forma habitual** para
no terminar con la información dividida.

---

## Si no ve los cambios al abrir el archivo

Revise en este orden:

1. **Recargue forzando la actualización.** Con el archivo abierto pulse
   **Ctrl + Shift + R** (o Ctrl + F5). Los navegadores guardan en caché los archivos
   locales y suelen mostrar la versión anterior aunque el archivo ya esté actualizado.

2. **Confirme la versión.** En **Configuración → Respaldo de datos** aparece
   **«Versión del sistema»** con la fecha y hora de compilación. Si no coincide con la
   última, está viendo una copia antigua o en caché.

3. **Revise qué archivo abrió.** Debe ser
   `Escritorio\Claude\Gestion_Residentes.html`. Si abrió una copia guardada en
   Descargas o en otra carpeta, esa no se actualiza sola.

4. **Si faltan los residentes**, mire **Configuración → «Nómina del centro»**: indica
   cuántos de los 33 están cargados. La carga automática solo ocurre cuando no hay
   ninguna ficha registrada; si ya había datos (por ejemplo, datos de ejemplo), use el
   botón **«Cargar nómina del centro»**.

5. **Si modificó archivos de `app/`**, recuerde ejecutar `build.ps1`: el archivo único
   no se actualiza solo.

---

## Módulos

| Módulo | Qué permite hacer |
|---|---|
| **Dashboard** | Residentes activos y presentes, nuevos ingresos, alertas de conducta e indicadores generales del centro. Cada indicador es **pulsable** y abre su sección ya filtrada. |
| **Residentes** | Crear la ficha completa, fecha de ingreso, cargo/nivel/grupo, brigadas (una o varias), contacto de emergencia y egreso. |
| **Evoluciones** | Progreso de etapa de cada residente: días cumplidos sobre los exigidos, fecha prevista de progresión, línea de tiempo del programa y registro de los cambios de etapa. |
| **Conducta** | Faltas e incidentes con gravedad, descripción, medida aplicada, estado del caso y seguimiento. Cada registro se puede **cerrar como resuelto**, y queda en el informe del residente. |
| **Salidas y retornos** | Fecha y hora de salida, retorno previsto, retorno real, condición en que regresa y duración. |
| **Llamadas** | Cantidad de llamadas por día y por residente, con control diario y tope configurable. |
| **Tareas y brigadas** | Listado de brigadas con sus encargados y botón para **informar incumplimiento**; tareas asignadas, delegación a otro residente, estado, evaluación y cumplimiento por brigada. |
| **Reportes** | Informes semanales, mensuales, de egreso y generales del centro, listos para imprimir o guardar como PDF. |
| **Configuración** | Datos del centro, brigadas, respaldo de la información y datos de ejemplo. |

---

## Indicadores del Dashboard

Los ocho recuadros del resumen son pulsables: al hacer clic llevan a la sección
correspondiente **con el filtro ya aplicado**, de modo que el listado muestra exactamente
lo que anunciaba el número.

| Indicador | Lleva a |
|---|---|
| Residentes activos | Residentes, filtrados por activos |
| Presentes en el centro | Residentes presentes (sin salida vigente) |
| Ingresos (30 días) | Residentes ingresados en los últimos 30 días |
| Alertas activas | Baja al panel «Alertas y situaciones a revisar» y lo resalta |
| Etapas por evaluar | Evoluciones, filtrado por quienes tienen la etapa por actualizar o el plazo cumplido |
| Llamadas hoy | Registro de llamadas de hoy |
| Tareas pendientes | Tareas con estado Pendiente |
| Egresos del mes | Residentes egresados durante el mes en curso |

También son pulsables las etiquetas de los gráficos **«Residentes por etapa»** y
**«Distribución por brigada»**: cada una abre el listado filtrado por esa etapa o brigada.

Al llegar por uno de estos enlaces, los desplegables de la sección quedan marcados con el
filtro aplicado, así que se ve de inmediato qué se está mostrando y se puede modificar.

> «Llamadas hoy» cuenta **llamadas** y el listado muestra **registros**: un registro de
> tres llamadas cuenta como 3 en el indicador y como una fila en la tabla. El encabezado
> de la sección muestra ambas cifras.

---

## Incumplimiento de brigada

En **Tareas y brigadas**, la primera tarjeta lista las 18 brigadas con su encargado, las
tareas registradas y los incumplimientos de los últimos 30 días. Cada una tiene el botón
**«⚠️ Informar incumplimiento»**.

Al usarlo se abre un formulario que pide la fecha, la descripción de lo que no se cumplió
y, opcionalmente, la medida aplicada. Al guardar se crea automáticamente en **Conducta**
una **falta grave** del tipo «Incumplimiento de tareas», vinculada a la brigada.

- Si la brigada tiene **varios encargados** (Liviano Pesado), vienen todos marcados y se
  crea un registro por cada uno; puede desmarcar a quien no corresponda.
- Si la brigada es **colectiva** (Exterior, Huerto, Leña), se ofrecen los residentes de
  Nivel 1, 2 y 3 sin marcar ninguno: hay que indicar a quién se imputa.

Desde ahí la falta sigue el circuito normal de conducta: aparece en las alertas del
Dashboard, suma para la reincidencia y se cierra cuando corresponda.

---

## Registro de faltas

Para registrar una falta bastan **cuatro campos**: residente, gravedad, tipo y qué
ocurrió. La fecha se toma del día en curso. Todo lo demás —hora, lugar, medida aplicada y
quién reporta— está plegado bajo **«Agregar más detalles (opcional)»** y se puede
completar después al editar el registro o al cerrar el caso.

Los **tipos de falta** y las **medidas** que ofrecen los formularios se editan en
**Configuración**: se agregan, se renombran y se quitan según los use el centro. Al
renombrar uno, los registros que ya lo usaban se actualizan solos; al quitarlo, conservan
el texto pero deja de ofrecerse.

---

## Cierre de casos de conducta

Cada registro de conducta tiene el botón **«✓ Resolver»**. Al cerrarlo se pide la fecha
de resolución, quién lo cierra y el **resultado del caso** (cómo se resolvió, si se
cumplió la medida, la actitud del residente).

Una vez cerrado:

- El registro queda con estado **Resuelto** y la fecha de cierre a la vista.
- Se incorpora al **informe personal del residente**, en la sección
  **«Faltas resueltas en el período»**, con el hecho, la medida y el resultado completo.
- El resumen del informe muestra cuántos casos se cerraron.

Un caso ocurrido antes del período pero **resuelto dentro de él** aparece igualmente en
ese informe, que es donde interesa dejar constancia del cierre. Si hace falta corregir,
el botón **↺** reabre el caso y lo deja en seguimiento.

---

## Progreso de etapa

En **Evoluciones** se administra el avance de cada residente dentro
del programa.

### La etapa la determinan los días de tratamiento

| Etapa | Duración | Días de tratamiento |
|---|---|---|
| Compromiso | 15 días | del día 0 al 14 |
| Grupo 4 | 45 días (1,5 meses) | del 15 al 59 |
| Grupo 3 | 45 días (1,5 meses) | del 60 al 104 |
| Grupo 2 | 45 días (1,5 meses) | del 105 al 149 |
| Grupo 1 | 30 días (1 mes) | del 150 al 179 |
| Nivel 1 | 60 días (2 meses) | del 180 al 239 |
| Nivel 2 | 60 días (2 meses) | del 240 al 299 |
| **Nivel 3 (optativo)** | Sin plazo | reinserción **laboral** desde los 10 meses (300 días) · reinserción **social** desde los 11 meses (330 días) |
| Reeducado y los cargos | Sin plazo | por evaluación del equipo |

La escalera con plazos va del ingreso hasta **Nivel 2: 300 días (10 meses)**. Ahí termina
lo que impone el calendario.

**Nivel 3 es optativo.** Al cumplir los 10 meses el sistema avisa que el residente *puede
optar* a reinserción laboral, y a los 11 meses también a reinserción social; nunca lo sube
solo, porque entrar es decisión del residente y del equipo. Al registrar el cambio a Nivel
3 se pide la **modalidad**, que queda en la ficha, en la línea de tiempo y en los informes.
Si el equipo decide adelantarla, el sistema la registra igual y avisa desde qué fecha
correspondía.

> El centro cuenta los meses de 30 días: 1,5 meses = 45 días, 2 meses = 60, 10 meses = 300.

El sistema calcula solo desde cuándo está cada residente en su etapa: si el equipo no
registró la fecha, la deduce del plan (quien está en Grupo 3 la empezó en su día 60 de
tratamiento). Por eso ya no hace falta corregir fechas a mano una por una; el botón 📅
queda para los casos en que alguien progresó antes o después de lo previsto.

Las duraciones están en `DB.DURACIONES` (archivo `app/js/db.js`) y el orden de las etapas
en `DB.ETAPAS`: si el programa cambia, basta con editar esas dos listas.

### Qué muestra

Un listado ordenado por urgencia —primero quienes quedaron por detrás del tiempo cumplido,
después quienes cumplieron el plazo y los próximos— con los días de tratamiento, la etapa
registrada, **la que corresponde por tiempo**, los días transcurridos sobre los exigidos,
una barra de avance y la fecha prevista de la próxima progresión. Se puede filtrar por
estado —etapa por actualizar, plazo cumplido, próximo a progresar, puede optar a Nivel 3,
en curso o sin plazo definido— y descargar todo con **«⬇ Exportar CSV»**.

Esta pantalla no lleva registros de observaciones diarias: la sección **Evoluciones**
administra únicamente el paso por las etapas del programa.

Cada residente tiene además una **línea de tiempo** (botón 📈, y también en su ficha) con
las trece etapas del programa: las cumplidas con sus fechas reales, la actual con la
barra de avance y las que faltan.

### Actualizar la etapa según el tiempo

Cuando la etapa registrada queda por detrás de los días cumplidos, el residente aparece
marcado como **etapa por actualizar**. El botón **«⏱️ Actualizar»** lo sube a la que le
corresponde y deja registrada **cada etapa intermedia** con la fecha exacta en que la
cumplió, de modo que su línea de tiempo queda completa. El botón **«⏱️ Actualizar N por
tiempo»** de la barra superior hace lo mismo con todos de una vez, mostrando antes la
lista de quiénes cambian y a qué etapa.

Los residentes que van **por delante del plan** (un Nivel o un cargo alcanzado antes de
los 300 días) no se tocan, ni tampoco quienes ya están en Nivel 3 o en un cargo: ese
avance es decisión del equipo, no del calendario.

### Registrar el cambio de etapa

El botón **«⬆ Cambiar etapa»** propone la etapa siguiente, pide la fecha y el motivo, y
deja constancia en el historial: cierra el tramo anterior y abre el nuevo. Sirve también
para registrar **retrocesos**. Cambiar la etapa desde la ficha del residente produce el
mismo registro, para que el cálculo no se desincronice.

### Alertas

Al cumplirse el tiempo de Nivel 2 aparece *«… puede optar a Nivel 3»*, con las modalidades
ya disponibles. El sistema no vuelve a insistir con «cumplió el plazo» en ese punto, porque
quedarse en Nivel 2 es una opción legítima.

Si el tiempo indica una etapa más avanzada que la registrada, aparece *«… debería estar en
…»*. Si la etapa está al día, avisa cuando faltan 7 días o menos (*«… está próximo a
progresar»*) y al cumplirse el plazo (*«… cumplió el plazo de …»*). Todas llevan a esta
pantalla.

---

## Alertas automáticas

Las alertas **se ocultan al pulsar «Ver»**, para poder ir despejando las ya atendidas.
Vuelven a aparecer si la situación empeora: una falta más, un día más de atraso en un
retorno. El contador «atendidas» del panel permite volver a mostrarlas todas.

El sistema revisa los datos cada vez que se abre una pantalla y avisa por:

- Residentes que **no han retornado** al centro tras la fecha/hora prevista.
- **Faltas graves o gravísimas** registradas en los últimos 7 días.
- **Reincidencia conductual**: 3 o más faltas en 30 días (con puntaje de gravedad
  acumulado: leve = 1, grave = 3, gravísima = 5).
- **Tareas pendientes vencidas**.
- Residentes que **superaron el máximo de llamadas** diarias configurado.
- Residentes **próximos a progresar de etapa** o con el plazo ya cumplido.

En el menú lateral hay dos contadores, y cada uno cuenta solo lo suyo:

- El de **Dashboard** es el total de alertas de todos los tipos anteriores.
- El de **Conducta** cuenta únicamente las alertas conductuales: faltas graves o
  gravísimas de los últimos 7 días y residentes reincidentes.

Las faltas **leves** no generan alerta, por lo que no aparecen en ese contador; el total
de registros de conducta se ve en el encabezado de la propia sección. Al pasar el cursor
sobre cada contador se indica qué está contando.

---

## Cuentas de acceso

Al abrir la aplicación se pide usuario y contraseña. Hay **10 cuentas** creadas
automáticamente la primera vez:

### Acceso total (todas las secciones)

| Usuario | Persona |
|---|---|
| `director` | Dirección del centro |
| `asistente` | Rodrigo Javier Juri Contreras |
| `delegado` | Sebastián Antonio Borquez López |

### Acceso limitado (tareas, llamadas, salidas y conducta)

Una cuenta por cada residente de Nivel 1 y Nivel 2:

| Usuario | Persona | Nivel |
|---|---|---|
| `julio.sierralta` | Julio César Sierralta | Nivel 1 |
| `adrian.contreras` | Adrián Fernando Contreras Cerda | Nivel 1 |
| `antonio.hirose` | Antonio Carlos Hirose Vallejos | Nivel 1 |
| `clemente.barthe` | Clemente Donoso Barthe | Nivel 2 |
| `guillermo.duran` | Guillermo Antonio Durán Pooley | Nivel 2 |
| `vicente.salamanca` | Vicente José Nicolás Salamanca Flores | Nivel 2 |
| `jorge.quezada` | Jorge José María Quezada González | Nivel 2 |

> **Contraseña inicial: el mismo nombre de usuario.** Por ejemplo, `director` entra con
> la contraseña `director`. En el primer ingreso el sistema pide definir una contraseña
> propia; hasta que se cambie, la cuenta aparece marcada como «Contraseña inicial» en
> Usuarios y accesos.

Las cuentas limitadas ven solo esas cuatro secciones —no acceden a fichas de residentes,
evoluciones, reportes ni configuración— y **no pueden eliminar registros**: pueden crear
y editar, pero borrar queda reservado a la dirección.

En **Usuarios y accesos** (solo con acceso total) se crean cuentas nuevas, se cambia el
nivel de acceso, se corrigen nombres de usuario, se restablecen contraseñas y se
desactivan cuentas. El botón **«Crear cuentas de Nivel 1 y 2»** genera las que falten
cuando un residente sube de nivel.

Para cambiar su propia contraseña, cada persona pulsa su nombre al pie del menú lateral.
La sesión se cierra al cerrar el navegador.

### Hasta dónde protege este login

La aplicación funciona **sin servidor**, dentro del navegador del equipo. Por lo tanto:

- **Sí sirve** para separar roles, evitar que alguien entre por error a una sección que
  no le corresponde y dejar registro de quién es cada usuario.
- **No protege** los datos frente a alguien con conocimientos técnicos que tenga acceso
  al computador: puede inspeccionar el archivo con las herramientas del navegador o leer
  el respaldo `.json`.

Las contraseñas no se guardan en texto plano —se almacena un resumen SHA-256 con sal,
repetido 3000 veces—, pero eso no cambia lo anterior. La protección real de la
información clínica sigue siendo **el equipo con cuenta de Windows protegida por
contraseña** y los respaldos guardados en una carpeta de acceso restringido. Para un
control de acceso verdadero haría falta un servidor con base de datos y sesiones.

---

## Nómina de residentes

Los **33 residentes** del centro vienen precargados: la primera vez que se abre la
aplicación en un equipo se crean solos, con nombre, R.U.T., cargo/nivel/grupo y fecha
de ingreso.

La lista vive en [app/js/nomina.js](app/js/nomina.js). Si necesita volver a cargarla
(por ejemplo en otro computador que ya tiene datos), use
**Configuración → «Cargar nómina del centro»**: compara por R.U.T. y agrega solo los
que falten, así que se puede repetir sin duplicar fichas ni tocar las existentes.

Si borra todos los datos a propósito, la nómina **no** vuelve a aparecer sola;
recárguela con ese botón cuando quiera.

### Brigadas

Las **18 brigadas** del centro vienen cargadas y asignadas a sus encargados:

| Brigada | A cargo de |
|---|---|
| Sargento | Darío Saavedra |
| Quincho | José Yustiz |
| Cap de Cocina | Johan Morales |
| Ayudante Cocina | Yerell Martínez |
| Contorno | Luis Pérez |
| Liviano Pesado | Jorge Briones y Manuel Ponce |
| Mantención | Rodrigo Beltrán |
| Baños | Andrés Vega |
| Panadería | Camilo Carvajal |
| Ayudante de Panadería | Marco Gamboa |
| Recolector Basura | Miguel Cofré |
| Living Comedor Pasillo | Wilson Villagrán |
| Lavandería | Rodrigo Beltrán |
| Animales | Manuel Ponce |
| Pool Entrada | José Gonzales |
| Exterior, Huerto y Leña | Niveles (responsabilidad colectiva) |

Dos particularidades que el sistema contempla:

- **Un residente puede tener varias brigadas.** En la ficha se marcan con casillas, no
  con una lista desplegable. Rodrigo Beltrán está en Mantención y Lavandería; Manuel
  Ponce, en Liviano Pesado y Animales.
- **Una brigada puede tener varios encargados**, como Liviano Pesado.
- **Exterior, Huerto y Leña** no tienen encargado individual: figuran como
  responsabilidad de los **Niveles**, y así se muestran en Configuración. No se
  asignaron a residentes concretos porque la planilla no los nombra.

En **Configuración → Brigadas** se ve quién está a cargo de cada una. El botón
**«Asignar según nómina»** vuelve a aplicar estas asignaciones a quienes no tengan
ninguna, sin tocar las que se hayan cambiado a mano.

### Clasificación de residentes

El campo «cargo, nivel o grupo» usa la clasificación real del centro, ordenada desde
el ingreso hasta la etapa más avanzada:

`Compromiso → Grupo 4 → Grupo 3 → Grupo 2 → Grupo 1 → Nivel 1 → Nivel 2 → Nivel 3 →
Reeducado → Delegado → Encargado de Casa → Asistente → Operador`

Ese orden se dedujo de las fechas de ingreso y afecta solo cómo se ordenan las listas
y el gráfico del Dashboard. Para cambiarlo, reordene el arreglo `ETAPAS` en
[app/js/db.js](app/js/db.js) y vuelva a ejecutar `build.ps1`.

---

## Primeros pasos

1. Abra la aplicación y vaya a **Configuración**.
2. Escriba el **nombre del centro**, el profesional responsable por defecto y el
   máximo de llamadas por día (use `0` si no desea límite).
3. Ajuste la lista de **brigadas** según cómo se organiza el centro.
4. Complete las fichas de los residentes ya cargados con los datos que falten
   (fecha de nacimiento, teléfono, contacto de emergencia, sustancia, brigada).
5. Revise **Evoluciones**: si alguien aparece con la **etapa por actualizar**, use «⏱️ Actualizar» para dejarla acorde a sus días de tratamiento.
6. Empiece el registro diario: conducta, salidas, llamadas y tareas.

Si quiere explorar el sistema con datos inventados antes de usarlo en serio, pulse
**«Cargar datos de ejemplo»** en Configuración.

Desde la ficha de cada residente, los botones rápidos (Cambiar etapa, Falta, Salida,
Llamada, Tarea) abren el formulario con el residente ya seleccionado.

---

## Respaldos — importante

La información se guarda en el **almacenamiento local del navegador**, en este equipo.
Esto significa que:

- Los datos **no salen del computador** y nadie los ve por internet.
- Si se borra el historial y los datos de sitios del navegador, se usa otro navegador,
  o se abre la aplicación en otro equipo, **la información no estará ahí**.

Por eso: en **Configuración → Exportar respaldo (.json)** descargue una copia con
frecuencia (idealmente al final de cada jornada) y guárdela en una carpeta segura,
en la nube o en un pendrive. Para recuperarla, use **Restaurar respaldo**, que permite
reemplazar todos los datos o solo agregar los registros que falten.

Cada módulo permite además **exportar a CSV** (se abre en Excel) lo que se esté viendo
en pantalla, respetando los filtros aplicados.

---

## Informes

En **Reportes** elija el tipo de informe, el residente y el período:

- **Semanal / Mensual (por residente)**: resumen del período, evolución en el programa
  (etapa, plazo y cambios registrados), conducta,
  salidas, llamadas y tareas.
- **De egreso**: incluye además la síntesis de toda la estadía y las condiciones de egreso.
- **General del centro**: población atendida, movimientos, actividad registrada,
  conducta del período y un detalle comparativo por residente.

Todos los informes tienen un campo de **conclusiones editable** (se escribe directamente
sobre el informe) y espacio para firmas. Con **«Imprimir / PDF»** se guarda como PDF
eligiendo «Guardar como PDF» en el diálogo de impresión; con **«Descargar HTML»** se
obtiene el informe como archivo para enviar o archivar.

---

## Uso en teléfonos y tablets

La interfaz se adapta al tamaño de la pantalla:

- **Menú lateral deslizante**: en pantallas angostas se oculta y se abre con el botón ☰.
- **Tablas convertidas en fichas**: en vez de desplazarse hacia el lado, cada registro se
  muestra como una tarjeta con sus campos etiquetados.
- **Formularios en una columna**, a pantalla completa, con campos de 16 px para que
  el iPhone no haga zoom al escribir.
- **Informes adaptados**: encabezado, indicadores y firmas se reordenan en vertical.
  Al imprimir siempre se usa el formato de escritorio, sin importar el dispositivo.

Verificado sin desbordes horizontales en 320, 375, 414, 768 y 1280 px de ancho.

### Cómo abrirla en el teléfono

El archivo debe estar **en el teléfono**: cópielo por cable, WhatsApp, correo o nube,
y ábralo desde la aplicación de archivos (en Android suele bastar con tocarlo; en iPhone,
desde «Archivos»). En el navegador puede usar «Agregar a pantalla de inicio» para que
quede como un icono más.

> **Importante:** cada dispositivo guarda **su propia base de datos**. Si registra en el
> computador y en el teléfono, serán dos conjuntos de datos separados. Para pasar
> información de uno a otro use **Exportar respaldo** en un dispositivo y
> **Restaurar respaldo** en el otro.

---

## Cambiar el logotipo

El logo aparece en la barra lateral, en el icono de la pestaña del navegador y en el
encabezado de todos los informes.

Para reemplazarlo:

1. Guarde la nueva imagen como **`app/Logo_comunidad_SPC.png`** (PNG cuadrado, de
   preferencia con fondo transparente para que se vea bien en tema claro y oscuro).
2. Ejecute:

   ```bash
   powershell -ExecutionPolicy Bypass -File build.ps1
   ```

El script reduce la imagen a 256 px, la incrusta como texto dentro de `app/js/logo.js`
y regenera `Gestion_Residentes.html`. Así el archivo único sigue funcionando aunque se
copie solo, sin la carpeta de imágenes.

---

## Consideraciones sobre datos sensibles

La información clínica de los residentes es especialmente sensible. Recomendaciones:

- Use la aplicación en un equipo del centro con **cuenta de usuario protegida por contraseña**.
- Guarde los respaldos `.json` en una ubicación de acceso restringido.
- Al descartar o prestar el equipo, borre los datos desde
  **Configuración → Borrar todos los datos** y elimine los respaldos.

---

## Estructura del proyecto

```
Gestion_Residentes.html     Aplicación en un solo archivo (generada por build.ps1)
build.ps1                   Incrusta el logo y genera el archivo único a partir de app/
app/
  index.html                Estructura de la página
  Logo_comunidad_SPC.png    Logotipo del centro (imagen original)
  css/styles.css            Estilos, tema claro/oscuro y estilos de impresión
  js/
    logo.js                 Logotipo incrustado — GENERADO por build.ps1, no editar
    version.js              Sello de compilación — GENERADO por build.ps1, no editar
    auth.js                 Cuentas de acceso, contraseñas y permisos por rol
    nomina.js               Nómina inicial de los 33 residentes del centro
    utils.js                Utilidades: fechas, texto, formularios, modales, tablas
    db.js                   Almacenamiento local, catálogos y consultas de dominio
    alertas.js              Motor de alertas
    app.js                  Enrutador, navegación y acciones globales
    dashboard.js            Panel general
    residentes.js           Fichas y ficha detalle
    progreso.js             Evoluciones: avance de etapa, línea de tiempo y cambios
    conducta.js             Faltas, incidentes y medidas
    salidas.js              Salidas y retornos
    llamadas.js             Registro telefónico
    tareas.js               Tareas, delegación y brigadas
    reportes.js             Generación de informes
    configuracion.js        Ajustes, respaldo y datos de ejemplo
```

---

## Si más adelante se necesita acceso desde varios computadores

Esta versión está pensada para **un equipo**. Para que varias personas trabajen sobre
la misma base al mismo tiempo haría falta un servidor con base de datos y control de
usuarios. La estructura actual lo permite: `db.js` concentra todo el acceso a datos,
por lo que reemplazarlo por llamadas a una API no obliga a reescribir el resto.
