/* ============================================================
   db.js — almacenamiento local, catálogos y consultas derivadas
   ============================================================
   Los datos se guardan en localStorage del navegador. No salen
   del equipo. Use Configuración → Respaldo para exportar copias.
   ============================================================ */

const DB = (() => {

  const CLAVE = 'crc_gestion_residentes_v1';

  const CONFIG_DEF = {
    centro: 'Centro de Rehabilitación',
    lema: 'Sistema de Gestión de Residentes',
    responsable: '',
    maxLlamadasDia: 2,
    brigadas: [
      'Sargento', 'Quincho', 'Cap de Cocina', 'Ayudante Cocina', 'Exterior',
      'Contorno', 'Liviano Pesado', 'Mantención', 'Baños', 'Panadería',
      'Ayudante de Panadería', 'Recolector Basura', 'Living Comedor Pasillo',
      'Lavandería', 'Animales', 'Pool Entrada', 'Huerto', 'Leña'
    ],
    /* Brigadas que no tienen un encargado individual sino un grupo del centro. */
    brigadasColectivas: {
      'Exterior': 'Niveles',
      'Huerto': 'Niveles',
      'Leña': 'Niveles'
    },
    /* Catálogos editables desde Configuración */
    tiposFalta: [
      'Incumplimiento de horario',
      'Incumplimiento de tareas',
      'Falta de respeto a compañero',
      'Falta de respeto a personal',
      'Agresión verbal',
      'Agresión física',
      'Consumo o sospecha de consumo',
      'Ingreso de sustancias u objetos prohibidos',
      'Salida no autorizada',
      'Uso indebido de teléfono',
      'Daño a bienes del centro',
      'Incidente de salud / accidente',
      'Otro'
    ],
    medidas: [
      'Llamado de atención verbal',
      'Amonestación escrita',
      'Reflexión escrita',
      'Trabajo comunitario adicional',
      'Suspensión de salidas',
      'Suspensión de llamadas',
      'Retroceso de etapa',
      'Evaluación por equipo técnico',
      'Egreso disciplinario',
      'Sin medida (registro informativo)'
    ],
    /* Alertas ya atendidas: { clave: fecha en que se marcó } */
    alertasVistas: {},
    tema: 'light'
  };

  const vacio = () => ({
    version: 1,
    config: JSON.parse(JSON.stringify(CONFIG_DEF)),
    residentes: [],
    conductas: [],
    salidas: [],
    llamadas: [],
    tareas: [],
    usuarios: [],
    etapas: []
  });

  let estado = vacio();
  let disponible = true;

  /* ---------- persistencia ---------- */

  function cargar() {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) {
        const d = JSON.parse(raw);
        estado = Object.assign(vacio(), d);
        estado.config = Object.assign({}, CONFIG_DEF, d.config || {});
      }
    } catch (e) {
      disponible = false;
      console.warn('No se pudo leer el almacenamiento local:', e);
    }
  }

  let avisoDado = false;

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      disponible = false;
      // El aviso se muestra una sola vez para no saturar la pantalla.
      if (!avisoDado) {
        avisoDado = true;
        console.error(e);
        if (typeof UI !== 'undefined') {
          UI.toast('Este navegador no permite guardar datos. Los cambios se perderán al cerrar: exporte un respaldo.', 'err');
        }
      }
      return false;
    }
  }

  cargar();

  /* ---------- CRUD genérico ---------- */

  const api = {

    get config() { return estado.config; },
    get almacenamientoOK() { return disponible; },

    guardarConfig(patch) {
      Object.assign(estado.config, patch);
      guardar();
    },

    todos(col) {
      return (estado[col] || []).slice();
    },

    obtener(col, id) {
      return (estado[col] || []).find(x => x.id === id) || null;
    },

    /** Devuelve los registros de una colección asociados a un residente. */
    de(col, residenteId) {
      return (estado[col] || []).filter(x => x.residenteId === residenteId);
    },

    crear(col, obj) {
      const item = Object.assign({}, obj, {
        id: obj.id || U.uid(col.slice(0, 3)),
        creado: new Date().toISOString()
      });
      estado[col].push(item);
      guardar();
      return item;
    },

    actualizar(col, id, patch) {
      const i = estado[col].findIndex(x => x.id === id);
      if (i < 0) return null;
      estado[col][i] = Object.assign({}, estado[col][i], patch, {
        modificado: new Date().toISOString()
      });
      guardar();
      return estado[col][i];
    },

    eliminar(col, id) {
      const n = estado[col].length;
      estado[col] = estado[col].filter(x => x.id !== id);
      // Al eliminar un residente se eliminan sus registros asociados.
      if (col === 'residentes') {
        ['etapas', 'conductas', 'salidas', 'llamadas', 'tareas'].forEach(c => {
          estado[c] = estado[c].filter(x => x.residenteId !== id);
        });
      }
      guardar();
      return estado[col].length < n;
    },

    /* ---------- respaldo ---------- */

    exportar() {
      return JSON.stringify(estado, null, 2);
    },

    importar(json, modo) {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.residentes)) throw new Error('El archivo no tiene el formato esperado.');
      if (modo === 'fusionar') {
        ['residentes', 'etapas', 'conductas', 'salidas', 'llamadas', 'tareas'].forEach(c => {
          const existentes = new Set(estado[c].map(x => x.id));
          (d[c] || []).forEach(x => { if (!existentes.has(x.id)) estado[c].push(x); });
        });
      } else {
        estado = Object.assign(vacio(), d);
        estado.config = Object.assign({}, CONFIG_DEF, d.config || {});
      }
      guardar();
    },

    borrarTodo() {
      estado = vacio();
      guardar();
    },

    resumenVolumen() {
      return {
        residentes: estado.residentes.length,
        etapas: estado.etapas.length,
        conductas: estado.conductas.length,
        salidas: estado.salidas.length,
        llamadas: estado.llamadas.length,
        tareas: estado.tareas.length
      };
    },

    /* ---------- consultas de dominio ---------- */

    residente(id) { return api.obtener('residentes', id); },

    nombreDe(id) {
      const r = api.residente(id);
      return r ? r.nombre : 'Residente eliminado';
    },

    /** Residentes no egresados. */
    activos() {
      return api.todos('residentes').filter(r => r.estado !== 'Egresado');
    },

    egresados() {
      return api.todos('residentes').filter(r => r.estado === 'Egresado');
    },

    /** Salida registrada sin retorno efectivo (residente fuera del centro). */
    salidaAbierta(residenteId) {
      return api.de('salidas', residenteId).find(s => !s.fechaRetorno) || null;
    },

    salidasAbiertas() {
      return api.todos('salidas')
        .filter(s => !s.fechaRetorno)
        .filter(s => { const r = api.residente(s.residenteId); return r && r.estado !== 'Egresado'; });
    },

    /** Un residente está "presente" si está activo y no tiene salida abierta. */
    presentes() {
      return api.activos().filter(r => !api.salidaAbierta(r.id));
    },

    fueraDelCentro() {
      return api.activos().filter(r => api.salidaAbierta(r.id));
    },

    /** true si la salida superó la fecha/hora prevista de retorno. */
    retornoAtrasado(s) {
      if (s.fechaRetorno || !s.fechaRetornoPrev) return false;
      const hoy = U.hoy();
      if (s.fechaRetornoPrev < hoy) return true;
      if (s.fechaRetornoPrev === hoy && s.horaRetornoPrev) return U.ahora() > s.horaRetornoPrev;
      return false;
    },

    estadoSalida(s) {
      if (s.fechaRetorno) return 'Retornado';
      return api.retornoAtrasado(s) ? 'Atrasado' : 'Fuera del centro';
    },

    /** Faltas del residente dentro de los últimos N días. */
    faltasRecientes(residenteId, dias) {
      const desde = U.sumaDias(U.hoy(), -(dias || 30));
      return api.de('conductas', residenteId).filter(c => c.fecha >= desde);
    },

    /** Puntaje de gravedad acumulado: leve 1, grave 3, gravísima 5. */
    pesoFalta(gravedad) {
      return { 'Leve': 1, 'Grave': 3, 'Gravísima': 5 }[gravedad] || 1;
    },

    /** Llamadas realizadas por un residente en una fecha. */
    llamadasDelDia(residenteId, fecha) {
      return U.suma(
        api.de('llamadas', residenteId).filter(l => l.fecha === fecha),
        l => l.cantidad
      );
    },

    /* ---------- progreso de etapa ---------- */

    /** Días que dura cada etapa. Las que no figuran no tienen plazo definido.
     *  El centro cuenta los meses de 30 días: 1,5 meses = 45, 2 meses = 60. */
    DURACIONES: {
      'Compromiso': 15,
      'Grupo 4': 45,
      'Grupo 3': 45,
      'Grupo 2': 45,
      'Grupo 1': 30,
      'Nivel 1': 60,
      'Nivel 2': 60
    },

    /** Días que el centro cuenta por mes. */
    DIAS_MES: 30,

    /** Meses (aproximados) que representan unos días de tratamiento. */
    meses(dias) {
      return Math.round(dias / api.DIAS_MES * 10) / 10;
    },

    /**
     * Etapas a las que se entra por decisión y no por calendario: el tiempo
     * habilita la opción, pero no obliga a tomarla.
     * Nivel 3 es la etapa de reinserción y admite dos modalidades.
     */
    OPTATIVAS: {
      'Nivel 3': {
        nota: 'Etapa optativa de reinserción',
        opciones: [
          { v: 'Reinserción laboral', dias: 300, meses: 10 },
          { v: 'Reinserción social', dias: 330, meses: 11 }
        ]
      }
    },

    esOptativa(etapa) { return !!api.OPTATIVAS[etapa]; },

    /** Modalidades de una etapa optativa, con la fecha en que se habilitan. */
    opcionesOptativas(r, etapa) {
      const def = api.OPTATIVAS[etapa];
      if (!def) return [];
      const dias = api.diasEstadia(r);
      return def.opciones.map(o => Object.assign({}, o, {
        fecha: U.sumaDias(r.fechaIngreso || U.hoy(), o.dias),
        disponible: dias >= o.dias,
        restante: o.dias - dias
      }));
    },

    /** Días de antelación con que se avisa que un residente está por progresar. */
    DIAS_AVISO_ETAPA: 7,

    /** Días de tratamiento que abarca el plan con plazos (300 = 10 meses). */
    get PLAN_TOTAL() {
      return Object.keys(api.DURACIONES).reduce((t, k) => t + api.DURACIONES[k], 0);
    },

    /** Días de tratamiento cumplidos al empezar una etapa (Compromiso = 0,
     *  Grupo 4 = 15, Grupo 3 = 60, Grupo 2 = 105, Grupo 1 = 150, Nivel 1 = 180,
     *  Nivel 2 = 240, Nivel 3 = 300). */
    inicioPrevisto(etapa) {
      const i = api.ETAPAS.indexOf(etapa);
      if (i <= 0) return 0;
      let acum = 0;
      for (let k = 0; k < i; k++) acum += api.DURACIONES[api.ETAPAS[k]] || 0;
      return acum;
    },

    /**
     * Etapa que corresponde según los días de tratamiento: el tiempo en el
     * centro es lo que determina el avance por la escalera del programa,
     * desde Compromiso hasta Nivel 2 (300 días, 10 meses).
     * El cálculo se detiene ahí: Nivel 3 y los cargos posteriores no los
     * impone el calendario sino la decisión del residente y del equipo.
     */
    etapaPorDias(dias) {
      let acum = 0;
      for (let i = 0; i < api.ETAPAS.length; i++) {
        const etapa = api.ETAPAS[i];
        if (api.esOptativa(etapa)) return api.ETAPAS[i - 1] || etapa;
        const dur = api.DURACIONES[etapa];
        if (!dur) return etapa;
        if (dias < acum + dur) return etapa;
        acum += dur;
      }
      return api.ETAPAS[api.ETAPAS.length - 1];
    },

    /**
     * Fecha en que el residente entró a su etapa actual.
     * Si el equipo no la registró, se deduce del plan: la etapa empieza
     * cuando el residente cumple los días de tratamiento que la anteceden.
     */
    etapaDesde(r) {
      if (!r) return U.hoy();
      if (r.etapaDesde) return r.etapaDesde;
      const ingreso = r.fechaIngreso || U.hoy();
      const previstos = api.inicioPrevisto(r.etapa);
      // Nunca una fecha futura: si llegó a la etapa antes de lo previsto,
      // el cálculo se ancla en el día de hoy hasta que el equipo corrija.
      return U.sumaDias(ingreso, Math.min(previstos, Math.max(0, api.diasEstadia(r))));
    },

    /** true si la fecha de inicio de etapa es deducida y no registrada. */
    etapaDesdeEstimada(r) { return !(r && r.etapaDesde); },

    etapaSiguiente(etapa) {
      const i = api.ETAPAS.indexOf(etapa);
      return (i >= 0 && i < api.ETAPAS.length - 1) ? api.ETAPAS[i + 1] : null;
    },

    /**
     * Estado de avance del residente dentro de su etapa actual.
     * estado: 'sin-plazo' | 'en-curso' | 'proximo' | 'cumplido'
     */
    progresoEtapa(r) {
      const etapa = r.etapa || '';
      const desde = api.etapaDesde(r);
      const dias = Math.max(0, U.dias(desde, U.hoy()));
      const requerido = api.DURACIONES[etapa] || null;
      const siguiente = api.etapaSiguiente(etapa);

      /* El tiempo de tratamiento manda: se compara la etapa registrada con la
         que corresponde por los días en el centro. */
      const diasTratamiento = api.diasEstadia(r);
      const corresponde = api.etapaPorDias(diasTratamiento);
      const desfase = api.ETAPAS.indexOf(corresponde) - api.ETAPAS.indexOf(etapa);

      const base = {
        etapa, desde, dias, siguiente,
        estimada: api.etapaDesdeEstimada(r),
        diasTratamiento, corresponde,
        // >0: el tiempo indica una etapa más avanzada que la registrada
        desfase: isNaN(desfase) ? 0 : desfase,
        // Está al día si el tiempo indica su etapa o si ya cumplió los días
        // con que se accede a ella (caso de Nivel 3 y de los cargos).
        alDia: corresponde === etapa || diasTratamiento >= api.inicioPrevisto(etapa),
        enOptativa: api.esOptativa(etapa),
        modalidad: r.modalidad || '',
        // Etapa optativa a la que puede acceder a continuación, si la hay.
        optativa: api.esOptativa(siguiente)
          ? { etapa: siguiente, opciones: api.opcionesOptativas(r, siguiente) }
          : null
      };

      if (!requerido) {
        return Object.assign(base, { requerido: null, estado: 'sin-plazo', porcentaje: null });
      }
      const restante = requerido - dias;
      let estado = restante <= 0 ? 'cumplido'
        : (restante <= api.DIAS_AVISO_ETAPA ? 'proximo' : 'en-curso');
      // Cumplir el plazo cuando lo que sigue es optativo no es un pendiente:
      // habilita la opción de tomarlo (Nivel 2 → Nivel 3).
      if (estado === 'cumplido' && api.esOptativa(siguiente)) estado = 'optativa';

      return Object.assign(base, {
        requerido, restante, estado,
        fechaPrevista: U.sumaDias(desde, requerido),
        porcentaje: Math.min(100, Math.round(dias / requerido * 100))
      });
    },

    /** Fecha en que el residente cumple los días para pasar a la etapa siguiente. */
    fechaCambioPrevista(r) {
      const p = api.progresoEtapa(r);
      return p.requerido ? p.fechaPrevista : null;
    },

    /** Historial de etapas del residente, de la más antigua a la actual. */
    historialEtapas(r) {
      const previas = api.de('etapas', r.id)
        .slice()
        .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
      if (previas.length) return previas;
      // Fichas anteriores a este registro: se muestra solo la etapa actual.
      return [{ residenteId: r.id, etapa: r.etapa, desde: api.etapaDesde(r), hasta: '' }];
    },

    /* ---------- brigadas ---------- */

    /** Brigadas de un residente. Un residente puede tener más de una.
     *  Acepta fichas antiguas que guardaban una sola brigada como texto. */
    brigadasDe(r) {
      if (!r) return [];
      if (Array.isArray(r.brigadas)) return r.brigadas.filter(Boolean);
      return r.brigada ? [r.brigada] : [];
    },

    brigadasTexto(r, sep) {
      return api.brigadasDe(r).join(sep || ' · ');
    },

    /** Residentes activos asignados a una brigada. */
    residentesDeBrigada(nombre) {
      return api.activos().filter(r => api.brigadasDe(r).includes(nombre));
    },

    /** Grupo a cargo de una brigada sin encargado individual, o null. */
    brigadaColectiva(nombre) {
      return (api.config.brigadasColectivas || {})[nombre] || null;
    },

    /** Días de permanencia (a la fecha de egreso o a hoy). */
    diasEstadia(r) {
      if (!r.fechaIngreso) return 0;
      return Math.max(0, U.dias(r.fechaIngreso, r.fechaEgreso || U.hoy()));
    },

    /* ---------- catálogos ---------- */

    /* Clasificación del centro (cargo, nivel o grupo), ordenada desde el
       ingreso hasta la etapa más avanzada. Si el orden real del programa
       es distinto, basta con reordenar esta lista. */
    ETAPAS: [
      'Compromiso',
      'Grupo 4',
      'Grupo 3',
      'Grupo 2',
      'Grupo 1',
      'Nivel 1',
      'Nivel 2',
      'Nivel 3',
      'Reeducado',
      'Delegado',
      'Encargado de Casa',
      'Asistente',
      'Operador'
    ],

    ESTADOS: ['Activo', 'Egresado'],

    SEXOS: ['Masculino', 'Femenino', 'Otro'],

    GRAVEDADES: ['Leve', 'Grave', 'Gravísima'],

    /* Estos dos catálogos se editan desde Configuración. */
    get TIPOS_FALTA() { return estado.config.tiposFalta || []; },
    get MEDIDAS() { return estado.config.medidas || []; },

    TIPOS_SALIDA: [
      'Permiso familiar',
      'Control médico',
      'Trámite / diligencia',
      'Actividad laboral',
      'Citación judicial',
      'Actividad terapéutica externa',
      'Otro'
    ],

    TIPOS_TAREA: ['Realizada por el residente', 'Delegada a otro residente', 'Apoyo a la brigada'],

    ESTADOS_TAREA: ['Pendiente', 'Cumplida', 'Cumplida parcialmente', 'No cumplida'],

    EVALUACIONES: ['Excelente', 'Buena', 'Regular', 'Deficiente'],

    TIPOS_EGRESO: [
      'Alta terapéutica',
      'Alta administrativa',
      'Alta voluntaria',
      'Abandono de tratamiento',
      'Derivación a otro centro',
      'Egreso disciplinario',
      'Otro'
    ]
  };

  return api;
})();
