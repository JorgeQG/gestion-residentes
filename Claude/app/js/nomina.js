/* ============================================================
   nomina.js — nómina inicial de residentes del centro
   ============================================================
   Listado entregado por el centro (33 residentes) para cargarlo
   de una sola vez. La carga es idempotente: compara por R.U.T. y
   agrega únicamente los que todavía no existen en el sistema, por
   lo que se puede volver a ejecutar sin duplicar fichas.

   Se ejecuta automáticamente la primera vez que se abre la
   aplicación en un equipo. También puede lanzarse a mano desde
   Configuración → «Cargar nómina del centro».

   Para dejar de usarla: elimine este archivo y su etiqueta
   <script> en index.html.
   ============================================================ */

const NOMINA = {

  /* Fechas normalizadas desde el formato mes/día/año de la planilla original. */
  RESIDENTES: [
    { nombre: 'Iván Andrés Valenzuela Escobedo',        rut: '19.160.926-3', etapa: 'Operador',          ingreso: '2026-01-18' },
    { nombre: 'Rodrigo Javier Juri Contreras',          rut: '19.564.729-1', etapa: 'Asistente',         ingreso: '2026-01-19' },
    { nombre: 'Sebastián Antonio Borquez López',        rut: '20.301.439-2', etapa: 'Delegado',          ingreso: '2026-02-18' },
    { nombre: 'Miguel Ángel Fernández Sanhueza',        rut: '19.533.344-0', etapa: 'Encargado de Casa', ingreso: '2025-12-27' },
    { nombre: 'Jérome Flores Jeanpierre',               rut: '21.869.649-1', etapa: 'Reeducado',         ingreso: '2025-06-07' },
    { nombre: 'Clemente Donoso Barthe',                 rut: '19.539.646-9', etapa: 'Nivel 2',           ingreso: '2025-08-14' },
    { nombre: 'David Abraham Gamboa Baeza',             rut: '18.661.333-3', etapa: 'Nivel 3',           ingreso: '2025-09-06' },
    { nombre: 'Guillermo Antonio Durán Pooley',         rut: '20.638.395-K', etapa: 'Nivel 2',           ingreso: '2025-09-11' },
    { nombre: 'Fabián Esteban Ramírez Velasco',         rut: '21.204.324-9', etapa: 'Nivel 3',           ingreso: '2025-09-24' },
    { nombre: 'Patricio Andrés Herrera Matus',          rut: '19.560.748-6', etapa: 'Nivel 3',           ingreso: '2025-10-26' },
    { nombre: 'Vicente José Nicolás Salamanca Flores',  rut: '22.345.455-0', etapa: 'Nivel 2',           ingreso: '2025-11-13' },
    { nombre: 'Benjamín Correa Schoennenbeck',          rut: '22.284.778-8', etapa: 'Nivel 3',           ingreso: '2025-11-05' },
    { nombre: 'Exequiel Alexis Zúñiga Rojas',           rut: '18.267.591-1', etapa: 'Nivel 3',           ingreso: '2026-06-17' },
    { nombre: 'Jorge José María Quezada González',      rut: '17.615.710-0', etapa: 'Nivel 2',           ingreso: '2025-12-29' },
    { nombre: 'Julio César Sierralta',                  rut: '26.026.373-0', etapa: 'Nivel 1',           ingreso: '2026-01-09' },
    { nombre: 'Adrián Fernando Contreras Cerda',        rut: '19.209.514-K', etapa: 'Nivel 1',           ingreso: '2026-02-26' },
    { nombre: 'Antonio Carlos Hirose Vallejos',         rut: '19.617.882-1', etapa: 'Nivel 1',           ingreso: '2026-04-07' },
    { nombre: 'Juan Alexis Molina Godoy',               rut: '19.634.647-3', etapa: 'Grupo 1',           ingreso: '2026-03-09' },
    { nombre: 'Wilson Bernardo Villagrán Cruces',       rut: '19.231.653-7', etapa: 'Grupo 1',           ingreso: '2026-03-15' },
    { nombre: 'Manuel Joaquín Ponce Vergara',           rut: '10.832.231-4', etapa: 'Grupo 1',           ingreso: '2026-03-20' },
    { nombre: 'Johan Patricio Morales Villagra',        rut: '19.381.847-1', etapa: 'Grupo 2',           ingreso: '2026-06-08' },
    { nombre: 'Rodrigo Andrés Beltrán Politeo',         rut: '17.697.502-4', etapa: 'Grupo 1',           ingreso: '2026-03-26' },
    { nombre: 'Camilo Nicolás Carvajal Díaz',           rut: '19.353.716-2', etapa: 'Grupo 2',           ingreso: '2026-04-10' },
    { nombre: 'Andrés Felipe Vega Valencia',            rut: '24.681.339-6', etapa: 'Grupo 2',           ingreso: '2026-06-29' },
    { nombre: 'Miguel Ángel Cofré Silva',               rut: '16.647.192-3', etapa: 'Grupo 3',           ingreso: '2026-06-24' },
    { nombre: 'Jorge Andrés Briones Ferrer',            rut: '9.703.925-9',  etapa: 'Grupo 3',           ingreso: '2026-07-05' },
    { nombre: 'Darío Ignacio Saavedra Pacheco',         rut: '19.012.587-4', etapa: 'Grupo 4',           ingreso: '2026-07-19' },
    { nombre: 'José Octavio Gonzales Riquelme',         rut: '15.589.256-2', etapa: 'Grupo 4',           ingreso: '2026-07-31' },
    { nombre: 'Yerell Alejandro Martínez García',       rut: '18.777.134-K', etapa: 'Grupo 4',           ingreso: '2026-08-04' },
    { nombre: 'José Francisco Yustiz Vargas',           rut: '26.436.021-8', etapa: 'Grupo 4',           ingreso: '2026-08-17' },
    { nombre: 'Marco Antonio Gamboa Padilla',           rut: '15.798.168-4', etapa: 'Grupo 4',           ingreso: '2026-08-19' },
    { nombre: 'Luis Alfredo Pérez Aranda',              rut: '19.201.819-6', etapa: 'Grupo 4',           ingreso: '2026-08-20' },
    { nombre: 'Simón Rodrigo Navarrete Ulloa',          rut: '16.306.587-8', etapa: 'Compromiso',        ingreso: '2026-08-27' }
  ],

  /* ------------------------------------------------------------------
     Brigadas del centro
     ------------------------------------------------------------------
     Se conservan los nombres tal como los entregó el centro; solo se
     ajustó el uso de mayúsculas y las tildes.

     Un residente puede tener más de una brigada (por ejemplo Mantención
     y Lavandería) y una brigada puede tener más de un encargado
     (Liviano Pesado). Exterior, Huerto y Leña no tienen encargado
     individual: están a cargo de los Niveles.
     ------------------------------------------------------------------ */

  BRIGADAS: [
    'Sargento', 'Quincho', 'Cap de Cocina', 'Ayudante Cocina', 'Exterior',
    'Contorno', 'Liviano Pesado', 'Mantención', 'Baños', 'Panadería',
    'Ayudante de Panadería', 'Recolector Basura', 'Living Comedor Pasillo',
    'Lavandería', 'Animales', 'Pool Entrada', 'Huerto', 'Leña'
  ],

  COLECTIVAS: { 'Exterior': 'Niveles', 'Huerto': 'Niveles', 'Leña': 'Niveles' },

  /** Asignación por R.U.T., para no depender de cómo esté escrito el nombre. */
  ASIGNACIONES: {
    '19.012.587-4': ['Sargento'],                    // Darío Ignacio Saavedra Pacheco
    '26.436.021-8': ['Quincho'],                     // José Francisco Yustiz Vargas
    '19.381.847-1': ['Cap de Cocina'],               // Johan Patricio Morales Villagra
    '18.777.134-K': ['Ayudante Cocina'],             // Yerell Alejandro Martínez García
    '19.201.819-6': ['Contorno'],                    // Luis Alfredo Pérez Aranda
    '9.703.925-9':  ['Liviano Pesado'],              // Jorge Andrés Briones Ferrer
    '10.832.231-4': ['Liviano Pesado', 'Animales'],  // Manuel Joaquín Ponce Vergara
    '17.697.502-4': ['Mantención', 'Lavandería'],    // Rodrigo Andrés Beltrán Politeo
    '24.681.339-6': ['Baños'],                       // Andrés Felipe Vega Valencia
    '19.353.716-2': ['Panadería'],                   // Camilo Nicolás Carvajal Díaz
    '15.798.168-4': ['Ayudante de Panadería'],       // Marco Antonio Gamboa Padilla
    '16.647.192-3': ['Recolector Basura'],           // Miguel Ángel Cofré Silva
    '19.231.653-7': ['Living Comedor Pasillo'],      // Wilson Bernardo Villagrán Cruces
    '15.589.256-2': ['Pool Entrada']                 // José Octavio Gonzales Riquelme
  },

  /** Lista de brigadas del catálogo anterior, para detectar la migración. */
  BRIGADAS_ANTERIORES: [
    'Cocina', 'Aseo general', 'Mantención', 'Lavandería',
    'Jardín y patio', 'Comedor', 'Dormitorios', 'Bodega'
  ],

  /** Deja el R.U.T. en solo dígitos + dígito verificador, para comparar. */
  claveRut(rut) {
    return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
  },

  /**
   * Agrega los residentes de la nómina que aún no estén registrados.
   * La comparación se hace por R.U.T., de modo que se puede repetir sin
   * generar fichas duplicadas.
   */
  cargar() {
    const existentes = new Set(
      DB.todos('residentes').map(r => NOMINA.claveRut(r.documento)).filter(Boolean)
    );

    let agregados = 0, omitidos = 0;
    NOMINA.RESIDENTES.forEach(p => {
      if (existentes.has(NOMINA.claveRut(p.rut))) { omitidos++; return; }
      DB.crear('residentes', {
        nombre: p.nombre,
        documento: p.rut,
        etapa: p.etapa,
        fechaIngreso: p.ingreso,
        brigadas: (NOMINA.ASIGNACIONES[p.rut] || []).slice(),
        estado: 'Activo'
      });
      agregados++;
    });

    DB.guardarConfig({ nominaCargada: true });
    return { agregados, omitidos };
  },

  /**
   * Deja el catálogo de brigadas del centro en la configuración, conservando
   * las que el usuario haya agregado por su cuenta.
   */
  actualizarCatalogo() {
    const actuales = DB.config.brigadas || [];
    const propias = actuales.filter(b =>
      !NOMINA.BRIGADAS.includes(b) && !NOMINA.BRIGADAS_ANTERIORES.includes(b));
    DB.guardarConfig({
      brigadas: NOMINA.BRIGADAS.concat(propias),
      brigadasColectivas: Object.assign({}, NOMINA.COLECTIVAS, DB.config.brigadasColectivas || {})
    });
  },

  /**
   * Asigna las brigadas a las fichas ya existentes, buscándolas por R.U.T.
   * No toca a quien ya tenga brigadas asignadas, para no pisar cambios
   * hechos a mano. Devuelve el detalle de lo aplicado.
   */
  aplicarBrigadas() {
    NOMINA.actualizarCatalogo();

    const porRut = {};
    Object.keys(NOMINA.ASIGNACIONES).forEach(rut => {
      porRut[NOMINA.claveRut(rut)] = NOMINA.ASIGNACIONES[rut];
    });

    let asignados = 0, conservados = 0, noEncontrados = 0;
    const vistos = new Set();

    DB.todos('residentes').forEach(r => {
      const clave = NOMINA.claveRut(r.documento);
      const brigadas = porRut[clave];
      if (!brigadas) return;
      vistos.add(clave);
      if (DB.brigadasDe(r).length) { conservados++; return; }
      DB.actualizar('residentes', r.id, { brigadas: brigadas.slice() });
      asignados++;
    });

    Object.keys(porRut).forEach(k => { if (!vistos.has(k)) noEncontrados++; });

    DB.guardarConfig({ brigadasAsignadas: true });
    return { asignados, conservados, noEncontrados };
  },

  /** Carga automática la primera vez que se usa la aplicación en un equipo. */
  autoCargar() {
    if (!DB.config.nominaCargada) {
      if (DB.todos('residentes').length) {
        // Ya hay fichas creadas a mano: no se interviene con la nómina.
        DB.guardarConfig({ nominaCargada: true });
      } else {
        NOMINA.actualizarCatalogo();
        NOMINA.cargar();
        DB.guardarConfig({ brigadasAsignadas: true });
        return;
      }
    }
    // Fichas creadas antes de que existieran las brigadas del centro:
    // se completan una sola vez.
    if (!DB.config.brigadasAsignadas) NOMINA.aplicarBrigadas();
  }
};

Acciones['cargar-nomina'] = () => {
  UI.confirmar({
    title: 'Cargar nómina del centro',
    submit: 'Cargar',
    body: `Se agregarán los <b>${NOMINA.RESIDENTES.length} residentes</b> de la nómina
      que todavía no estén registrados.<br>
      <span class="muted small">La comparación se hace por R.U.T., así que no se crean
      fichas duplicadas ni se modifican las existentes.</span>`,
    onSubmit: () => {
      NOMINA.actualizarCatalogo();
      const r = NOMINA.cargar();
      const b = NOMINA.aplicarBrigadas();
      UI.toast(r.agregados || b.asignados
        ? `${r.agregados} residente(s) agregado(s), ${b.asignados} con brigada asignada.`
        : 'La nómina ya estaba completa; no hubo cambios.');
      App.pintar();
    }
  });
};

Acciones['asignar-brigadas'] = () => {
  UI.confirmar({
    title: 'Asignar brigadas de la nómina',
    submit: 'Asignar',
    body: `Se asignarán las brigadas del centro a los residentes de la nómina que
      todavía no tengan ninguna.<br>
      <span class="muted small">No se modifica a quienes ya tengan brigadas asignadas,
      así que no se pierden los cambios hechos a mano.</span>`,
    onSubmit: () => {
      const r = NOMINA.aplicarBrigadas();
      UI.toast(r.asignados
        ? `${r.asignados} residente(s) actualizado(s)${r.conservados ? `, ${r.conservados} sin cambios.` : '.'}`
        : 'Todos los residentes de la nómina ya tenían brigadas asignadas.');
      App.pintar();
    }
  });
};
