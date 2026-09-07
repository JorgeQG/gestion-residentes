/* ============================================================
   configuracion.js — datos del centro, respaldo y datos de ejemplo
   ============================================================ */

const Config = {

  guardarDatos(d) {
    DB.guardarConfig({
      centro: d.centro || 'Centro de Rehabilitación',
      lema: d.lema,
      responsable: d.responsable,
      maxLlamadasDia: Number(d.maxLlamadasDia) || 0
    });
    UI.toast('Configuración guardada.');
    App.pintar();
  },

  /* ---------- catálogos editables (tipos de falta y medidas) ---------- */

  CATALOGOS: {
    tiposFalta: { titulo: 'Tipos de falta e incidente', singular: 'tipo de falta' },
    medidas: { titulo: 'Medidas aplicables', singular: 'medida' }
  },

  agregarItem(catalogo) {
    const meta = Config.CATALOGOS[catalogo];
    UI.modal({
      title: `Nuevo ${meta.singular}`,
      size: 'narrow',
      body: UI.campos([{ n: 'nombre', l: 'Nombre', t: 'text', w: 12, req: true }]),
      onSubmit: d => {
        const lista = (DB.config[catalogo] || []).slice();
        if (lista.some(x => U.norm(x) === U.norm(d.nombre))) {
          UI.toast('Ya existe en la lista.', 'err');
          return false;
        }
        lista.push(d.nombre);
        DB.guardarConfig({ [catalogo]: lista });
        UI.toast('Agregado.');
        App.pintar();
      }
    });
  },

  renombrarItem(catalogo, nombre) {
    const meta = Config.CATALOGOS[catalogo];
    UI.modal({
      title: `Renombrar ${meta.singular}`,
      size: 'narrow',
      body: `
        <div class="note" style="margin-bottom:14px">
          Los registros que ya usan «${U.esc(nombre)}» se actualizarán al nombre nuevo.
        </div>
        ${UI.campos([{ n: 'nombre', l: 'Nombre', t: 'text', w: 12, req: true }], { nombre })}`,
      onSubmit: d => {
        if (d.nombre === nombre) return;
        const lista = (DB.config[catalogo] || []).slice();
        if (lista.some(x => U.norm(x) === U.norm(d.nombre))) {
          UI.toast('Ya existe otro con ese nombre.', 'err');
          return false;
        }
        DB.guardarConfig({ [catalogo]: lista.map(x => x === nombre ? d.nombre : x) });
        // Se propaga a los registros existentes para no dejarlos huérfanos.
        const campo = catalogo === 'tiposFalta' ? 'tipoFalta' : 'medida';
        DB.todos('conductas').forEach(c => {
          if (c[campo] === nombre) DB.actualizar('conductas', c.id, { [campo]: d.nombre });
        });
        UI.toast('Nombre actualizado.');
        App.pintar();
      }
    });
  },

  quitarItem(catalogo, nombre) {
    const meta = Config.CATALOGOS[catalogo];
    const campo = catalogo === 'tiposFalta' ? 'tipoFalta' : 'medida';
    const enUso = DB.todos('conductas').filter(c => c[campo] === nombre).length;
    UI.confirmar({
      title: `Quitar ${meta.singular}`,
      peligro: true,
      submit: 'Quitar',
      body: `¿Quitar <b>${U.esc(nombre)}</b> de la lista?` +
        (enUso ? `<br><span class="muted small">Hay ${enUso} registro(s) que lo usan; conservarán
          el texto, pero dejará de ofrecerse en los formularios.</span>` : ''),
      onSubmit: () => {
        DB.guardarConfig({ [catalogo]: (DB.config[catalogo] || []).filter(x => x !== nombre) });
        UI.toast('Elemento quitado de la lista.');
        App.pintar();
      }
    });
  },

  /** Tarjeta de edición de un catálogo. */
  tarjetaCatalogo(catalogo) {
    const meta = Config.CATALOGOS[catalogo];
    const lista = DB.config[catalogo] || [];
    const campo = catalogo === 'tiposFalta' ? 'tipoFalta' : 'medida';

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <div><h3>${U.esc(meta.titulo)}</h3>
            <div class="sub">Opciones que aparecen al registrar una falta</div></div>
          <div class="right">
            <button class="btn btn-sm btn-primary" data-action="agregar-item"
                    data-catalogo="${catalogo}">+ Agregar</button>
          </div>
        </div>
        <div class="card-body tight">
          ${lista.length ? UI.tabla([
            { l: 'Nombre', c: x => U.esc(x) },
            {
              l: 'Registros que lo usan', cls: 'nowrap',
              c: x => DB.todos('conductas').filter(c => c[campo] === x).length
            },
            {
              l: '', cls: 'actions', c: x => `
                <button class="btn btn-sm btn-ghost" data-action="renombrar-item"
                        data-catalogo="${catalogo}" data-nombre="${U.esc(x)}" title="Renombrar">✏️</button>
                <button class="btn btn-sm btn-ghost" data-action="quitar-item"
                        data-catalogo="${catalogo}" data-nombre="${U.esc(x)}" title="Quitar">🗑️</button>`
            }
          ], lista) : UI.vacio({ ico: '📋', titulo: 'Lista vacía', texto: 'Agregue las opciones que use el centro.' })}
        </div>
      </div>`;
  },

  agregarBrigada() {
    UI.modal({
      title: 'Nueva brigada',
      size: 'narrow',
      body: UI.campos([{ n: 'nombre', l: 'Nombre de la brigada', t: 'text', w: 12, req: true }]),
      onSubmit: d => {
        const bs = DB.config.brigadas.slice();
        if (bs.some(b => U.norm(b) === U.norm(d.nombre))) {
          UI.toast('Esa brigada ya existe.', 'err');
          return false;
        }
        bs.push(d.nombre);
        DB.guardarConfig({ brigadas: bs });
        UI.toast('Brigada agregada.');
        App.pintar();
      }
    });
  },

  quitarBrigada(nombre) {
    const enUso = DB.todos('residentes').filter(r => DB.brigadasDe(r).includes(nombre)).length +
      DB.todos('tareas').filter(t => t.brigada === nombre).length;
    UI.confirmar({
      title: 'Quitar brigada',
      peligro: true,
      submit: 'Quitar',
      body: `¿Quitar la brigada <b>${U.esc(nombre)}</b> de la lista?` +
        (enUso ? `<br><span class="muted small">Hay ${enUso} registros que la mencionan; conservarán el nombre pero
          la brigada dejará de aparecer en los formularios.</span>` : ''),
      onSubmit: () => {
        DB.guardarConfig({ brigadas: DB.config.brigadas.filter(b => b !== nombre) });
        UI.toast('Brigada eliminada de la lista.');
        App.pintar();
      }
    });
  },

  /* ---------- respaldo ---------- */

  exportar() {
    U.descargar(`respaldo_${U.esc(DB.config.centro).replace(/\W+/g, '_').toLowerCase()}_${U.hoy()}.json`, DB.exportar());
    UI.toast('Respaldo descargado. Guárdelo en un lugar seguro.');
  },

  importar() {
    UI.modal({
      title: 'Restaurar respaldo',
      submit: 'Importar',
      body: `
        <div class="note warn" style="margin-bottom:14px">
          Seleccione un archivo <b>.json</b> generado por este mismo sistema.
        </div>
        ${UI.campos([
          {
            n: 'modo', l: 'Modo de importación', t: 'select', w: 12, vacio: false, val: 'reemplazar',
            opts: [
              { v: 'reemplazar', l: 'Reemplazar todos los datos actuales' },
              { v: 'fusionar', l: 'Fusionar: agregar solo los registros que falten' }
            ]
          }
        ])}
        <div class="field" style="margin-top:13px">
          <label>Archivo de respaldo <span class="req">*</span></label>
          <input type="file" id="archivo-respaldo" accept=".json,application/json">
        </div>`,
      onSubmit: d => {
        const input = document.getElementById('archivo-respaldo');
        const f = input.files && input.files[0];
        if (!f) { UI.toast('Seleccione un archivo.', 'err'); return false; }
        const lector = new FileReader();
        lector.onload = () => {
          try {
            DB.importar(lector.result, d.modo);
            UI.toast('Respaldo importado correctamente.');
            App.pintar();
          } catch (e) {
            UI.toast('No se pudo importar: ' + e.message, 'err');
          }
        };
        lector.readAsText(f);
      }
    });
  },

  borrarTodo() {
    UI.confirmar({
      title: 'Borrar todos los datos',
      peligro: true,
      submit: 'Borrar definitivamente',
      body: `Se eliminarán <b>todas las fichas y registros</b> almacenados en este navegador.<br><br>
        <span class="muted small">Esta acción no se puede deshacer. Se recomienda exportar un respaldo antes de continuar.</span>`,
      onSubmit: () => {
        DB.borrarTodo();
        // Se marca la nómina como cargada para que no reaparezca sola
        // al volver a abrir la aplicación: si se borró todo, fue a propósito.
        DB.guardarConfig({ nominaCargada: true });
        UI.toast('Todos los datos fueron eliminados.');
        App.ir('dashboard');
        App.pintar();
      }
    });
  },

  /* ---------- datos de ejemplo ---------- */

  cargarEjemplo() {
    if (DB.todos('residentes').length) {
      return UI.confirmar({
        title: 'Cargar datos de ejemplo',
        submit: 'Agregar de todos modos',
        body: `Ya existen residentes registrados. Los datos de ejemplo se <b>agregarán</b> a los actuales.<br>
          <span class="muted small">Si desea partir de cero, borre primero todos los datos.</span>`,
        onSubmit: () => { Config._sembrar(); }
      });
    }
    Config._sembrar();
  },

  _sembrar() {
    const hoy = U.hoy();
    const d = n => U.sumaDias(hoy, -n);
    const az = a => a[Math.floor(Math.random() * a.length)];
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

    const base = [
      { nombre: 'Rodrigo Antonio Salazar Vera', doc: '15.482.331-K', nac: '1988-04-12', sex: 'Masculino', ing: 96, etapa: 'Nivel 3', brig: 'Cap de Cocina', sus: 'Alcohol', tc: '12 años' },
      { nombre: 'Marcela Andrea Ríos Fuentes', doc: '17.902.114-2', nac: '1993-11-30', sex: 'Femenino', ing: 71, etapa: 'Nivel 1', brig: 'Lavandería', sus: 'Cocaína', tc: '6 años' },
      { nombre: 'Jonathan Elías Muñoz Pérez', doc: '19.334.207-5', nac: '1997-02-08', sex: 'Masculino', ing: 44, etapa: 'Grupo 1', brig: 'Baños', sus: 'Pasta base', tc: '9 años' },
      { nombre: 'Carlos Ignacio Bravo Leiva', doc: '13.221.876-9', nac: '1982-07-21', sex: 'Masculino', ing: 138, etapa: 'Delegado', brig: 'Mantención', sus: 'Alcohol y cocaína', tc: '18 años' },
      { nombre: 'Patricia Elena Soto Aguilar', doc: '16.774.902-1', nac: '1991-01-17', sex: 'Femenino', ing: 22, etapa: 'Grupo 3', brig: 'Panadería', sus: 'Benzodiacepinas', tc: '4 años' },
      { nombre: 'Luis Alberto Cárcamo Ortiz', doc: '20.115.663-7', nac: '2000-09-03', sex: 'Masculino', ing: 9, etapa: 'Grupo 4', brig: 'Contorno', sus: 'Marihuana y cocaína', tc: '5 años' },
      { nombre: 'Daniel Esteban Herrera Pinto', doc: '18.220.549-4', nac: '1995-06-25', sex: 'Masculino', ing: 5, etapa: 'Compromiso', brig: 'Recolector Basura', sus: 'Pasta base', tc: '7 años' },
      { nombre: 'Víctor Hugo Navarro Lagos', doc: '14.667.109-3', nac: '1985-12-11', sex: 'Masculino', ing: 210, etapa: 'Operador', brig: 'Quincho', sus: 'Alcohol', tc: '20 años', egreso: 26, tipoEgreso: 'Alta terapéutica' },
      { nombre: 'Fernanda Paz Cortés Molina', doc: '18.909.331-8', nac: '1996-03-09', sex: 'Femenino', ing: 120, etapa: 'Nivel 2', brig: 'Animales', sus: 'Cocaína', tc: '5 años', egreso: 40, tipoEgreso: 'Abandono de tratamiento' }
    ];

    const profesionales = ['Ps. Camila Reyes', 'T.O. Marcelo Díaz', 'Monitor Jorge Fuentes', 'Ps. Ana Vergara', 'Dr. Iván Sepúlveda'];

    const residentes = base.map(b => DB.crear('residentes', {
      nombre: b.nombre,
      documento: b.doc,
      fechaNacimiento: b.nac,
      sexo: b.sex,
      telefono: '+56 9 ' + ri(4000, 9999) + ' ' + ri(1000, 9999),
      direccion: az(['Los Aromos 234, Puente Alto', 'Pasaje El Roble 88, Maipú', 'Av. Central 1450, La Florida', 'Camino Real 77, Quilicura']),
      fechaIngreso: d(b.ing),
      etapa: b.etapa,
      brigadas: [b.brig],
      sustancia: b.sus,
      tiempoConsumo: b.tc,
      tratamientosPrevios: String(ri(0, 3)),
      derivadoPor: az(['CESFAM comunal', 'Tribunal de Familia', 'Ingreso voluntario', 'Hospital regional', 'Familiar directo']),
      prevision: az(['FONASA B', 'FONASA A', 'FONASA C', 'ISAPRE']),
      diagnostico: 'Trastorno por consumo de sustancias. Ingresa por descompensación y compromiso del funcionamiento familiar y laboral.',
      contactoNombre: az(['María Vera', 'Juan Pérez', 'Rosa Aguilar', 'Sergio Molina', 'Claudia Lagos']),
      contactoParentesco: az(['Madre', 'Padre', 'Hermana', 'Cónyuge', 'Tío']),
      contactoTelefono: '+56 9 ' + ri(4000, 9999) + ' ' + ri(1000, 9999),
      observaciones: '',
      estado: b.egreso ? 'Egresado' : 'Activo',
      fechaEgreso: b.egreso ? d(b.egreso) : '',
      tipoEgreso: b.tipoEgreso || '',
      etapaEgreso: b.egreso ? b.etapa : '',
      motivoEgreso: b.egreso
        ? (b.tipoEgreso === 'Alta terapéutica'
          ? 'Completa el programa cumpliendo los objetivos terapéuticos planteados. Se mantiene abstinente y con red de apoyo activa.'
          : 'Abandona el programa por voluntad propia tras conflicto con las normas del centro. Se intenta contacto sin éxito.')
        : '',
      derivacionEgreso: b.egreso && b.tipoEgreso === 'Alta terapéutica'
        ? 'Continúa control ambulatorio mensual en CESFAM y participación en grupo de autoayuda.' : ''
    }));

    residentes.forEach((r, idx) => {
      const b = base[idx];
      const dias = b.egreso ? b.ing - b.egreso : b.ing;

      /* Historial de etapas: se reconstruye hacia atrás desde la etapa que
         tiene el residente, usando las duraciones del programa. */
      const fin = b.egreso || 0;              // offset (días atrás) del cierre
      const iEtapa = Math.max(0, DB.ETAPAS.indexOf(b.etapa));
      let cursor = b.ing;
      const tramos = [];
      for (let i = 0; i <= iEtapa; i++) {
        const et = DB.ETAPAS[i];
        const ultimo = i === iEtapa;
        const hasta = ultimo ? fin : Math.max(fin, cursor - (DB.DURACIONES[et] || 40));
        tramos.push({ etapa: et, desde: cursor, hasta, ultimo });
        cursor = hasta;
      }
      tramos.forEach(t => DB.crear('etapas', {
        residenteId: r.id,
        etapa: t.etapa,
        desde: d(t.desde),
        hasta: (t.ultimo && !b.egreso) ? '' : d(t.hasta),
        motivo: t.ultimo ? '' : 'Cumple el plazo de la etapa y es evaluado por el equipo.',
        registradoPor: az(profesionales)
      }));
      DB.actualizar('residentes', r.id, { etapaDesde: d(tramos[tramos.length - 1].desde) });

      /* Conducta */
      const nFaltas = idx === 2 ? 4 : idx === 8 ? 3 : ri(0, 2);
      for (let k = 0; k < nFaltas; k++) {
        const off = ri(1, Math.max(2, Math.min(dias, 40))) + (b.egreso || 0);
        const grav = az(['Leve', 'Leve', 'Grave', 'Gravísima']);
        DB.crear('conductas', {
          residenteId: r.id,
          fecha: d(off),
          hora: String(ri(7, 22)).padStart(2, '0') + ':' + az(['00', '15', '30', '45']),
          gravedad: grav,
          tipoFalta: az(DB.TIPOS_FALTA.slice(0, 10)),
          lugar: az(['Comedor', 'Dormitorio', 'Patio', 'Sala de terapia', 'Cocina']),
          descripcion: az([
            'No se presenta a la actividad grupal de la mañana pese a los llamados del monitor de turno.',
            'Discute con un compañero durante el almuerzo, elevando la voz y abandonando el comedor.',
            'No cumple con la tarea asignada a su brigada, dejando el sector sin aseo.',
            'Se niega a entregar el teléfono en el horario establecido por el reglamento interno.',
            'Es sorprendido fuera del área permitida durante el horario de descanso.'
          ]),
          testigos: az(['Monitor de turno', 'Compañeros de brigada', '', 'Equipo técnico']),
          medida: az(DB.MEDIDAS.slice(0, 6)),
          medidaDetalle: az(['Se aplica por una semana.', 'Se revisa en reunión de equipo.', '']),
          estado: az(['Abierto', 'En seguimiento', 'Resuelto', 'Resuelto']),
          seguimiento: '',
          reportadoPor: az(profesionales)
        });
      }

      /* Salidas */
      if (dias > 25 && !b.egreso) {
        const nSal = ri(1, 3);
        for (let k = 0; k < nSal; k++) {
          const off = ri(3, Math.min(dias, 60));
          const dur = ri(0, 2);
          DB.crear('salidas', {
            residenteId: r.id,
            tipo: az(DB.TIPOS_SALIDA),
            destino: az(['Domicilio familiar', 'CESFAM comunal', 'Hospital regional', 'Juzgado de Garantía']),
            fechaSalida: d(off),
            horaSalida: '09:00',
            fechaRetornoPrev: d(off - dur),
            horaRetornoPrev: '19:00',
            fechaRetorno: d(off - dur),
            horaRetorno: az(['18:40', '19:05', '20:15']),
            condicionRetorno: az([Salidas.CONDICIONES[0], Salidas.CONDICIONES[0], Salidas.CONDICIONES[0], Salidas.CONDICIONES[3]]),
            acompanante: az(['Madre', 'Hermana', 'Solo', 'Monitor del centro']),
            autorizadoPor: az(profesionales),
            recibidoPor: az(profesionales),
            observaciones: '',
            observacionesRetorno: ''
          });
        }
      }

      /* Llamadas: la mayoría de los días */
      for (let k = Math.min(dias, 30); k > 0; k--) {
        if (Math.random() < 0.45) continue;
        const off = b.egreso ? b.egreso + k : k;
        DB.crear('llamadas', {
          residenteId: r.id,
          fecha: d(off),
          cantidad: Math.random() < 0.12 ? 3 : ri(1, 2),
          duracion: String(ri(5, 25)),
          hora: String(ri(17, 20)).padStart(2, '0') + ':' + az(['00', '20', '40']),
          destinatarios: az(['Madre', 'Padre', 'Hermana', 'Cónyuge', 'Hijo/a', 'Tío']),
          autorizadoPor: az(profesionales),
          observaciones: az(['', '', 'Se observa tranquilo tras la llamada.', 'Refiere tensión familiar; se contiene en sesión.'])
        });
      }

      /* Tareas */
      for (let k = Math.min(dias, 21); k > 0; k -= ri(1, 2)) {
        const off = b.egreso ? b.egreso + k : k;
        const delegada = Math.random() < 0.12;
        const otro = residentes.filter(x => x.id !== r.id);
        DB.crear('tareas', {
          residenteId: r.id,
          brigada: b.brig,
          fecha: d(off),
          turno: az(['Mañana', 'Tarde', 'Noche']),
          tipo: delegada ? 'Delegada a otro residente' : az([DB.TIPOS_TAREA[0], DB.TIPOS_TAREA[0], DB.TIPOS_TAREA[2]]),
          tarea: az([
            'Aseo del comedor después del almuerzo',
            'Apoyo en la preparación de la cena',
            'Orden y limpieza de dormitorios del sector B',
            'Mantención del patio y riego de plantas',
            'Lavado y doblado de ropa de cama',
            'Retiro de basura y ordenamiento de bodega'
          ]),
          delegadoA: delegada && otro.length ? az(otro).id : '',
          supervisor: az(profesionales),
          estado: off === 0 ? 'Pendiente' : az(['Cumplida', 'Cumplida', 'Cumplida', 'Cumplida parcialmente', 'No cumplida']),
          evaluacion: az(DB.EVALUACIONES),
          observaciones: ''
        });
      }
    });

    /* Un residente actualmente fuera del centro con retorno atrasado */
    const fuera = residentes[3];
    DB.crear('salidas', {
      residenteId: fuera.id,
      tipo: 'Permiso familiar',
      destino: 'Domicilio familiar',
      fechaSalida: d(2),
      horaSalida: '10:00',
      fechaRetornoPrev: d(1),
      horaRetornoPrev: '19:00',
      fechaRetorno: '',
      acompanante: 'Hermana',
      autorizadoPor: 'Ps. Camila Reyes',
      observaciones: 'Permiso de fin de semana en el marco de la etapa de reinserción.'
    });

    /* Una tarea pendiente para hoy */
    DB.crear('tareas', {
      residenteId: residentes[0].id,
      brigada: DB.brigadasDe(residentes[0])[0] || '',
      fecha: hoy,
      turno: 'Tarde',
      tipo: DB.TIPOS_TAREA[0],
      tarea: 'Preparación del comedor para la cena y reposición de insumos',
      supervisor: 'Monitor Jorge Fuentes',
      estado: 'Pendiente',
      evaluacion: '',
      observaciones: ''
    });

    UI.toast('Datos de ejemplo cargados.');
    App.ir('dashboard');
    App.pintar();
  }
};

Vistas['configuracion'] = {
  titulo: 'Configuración',
  sub: 'Datos del centro, brigadas y respaldo de la información',

  render() {
    const c = DB.config;
    const v = DB.resumenVolumen();

    const datosCentro = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Datos del centro</h3></div>
        <div class="card-body">
          <form id="form-config">
            ${UI.campos([
              { n: 'centro', l: 'Nombre del centro', t: 'text', w: 7, req: true },
              { n: 'lema', l: 'Subtítulo o lema', t: 'text', w: 5 },
              { n: 'responsable', l: 'Responsable / profesional por defecto', t: 'text', w: 7,
                help: 'Se propondrá automáticamente al registrar cambios de etapa, faltas y tareas.' },
              { n: 'maxLlamadasDia', l: 'Máximo de llamadas por día', t: 'number', w: 5, min: 0, max: 20,
                help: 'Use 0 para no aplicar límite. Se generan alertas al superarlo.' }
            ], c)}
            <div style="margin-top:14px;display:flex;gap:8px">
              <button type="submit" class="btn btn-primary">Guardar cambios</button>
              <button type="button" class="btn" data-action="tema">🌓 Cambiar tema</button>
            </div>
          </form>
        </div>
      </div>`;

    const brigadas = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <div><h3>Brigadas</h3><div class="sub">Grupos de trabajo y responsabilidades del centro</div></div>
          <div class="right">
            <button class="btn btn-sm" data-action="asignar-brigadas">↻ Asignar según nómina</button>
            <button class="btn btn-sm btn-primary" data-action="agregar-brigada">+ Agregar</button>
          </div>
        </div>
        <div class="card-body tight">
          ${c.brigadas.length ? UI.tabla([
            { l: 'Brigada', c: b => U.esc(b) },
            {
              l: 'A cargo de', c: b => {
                const colectiva = DB.brigadaColectiva(b);
                if (colectiva) return `<span class="badge b-info">${U.esc(colectiva)}</span>`;
                const rs = DB.residentesDeBrigada(b);
                return rs.length
                  ? rs.map(r => App.enlaceResidente(r.id)).join('<br>')
                  : '<span class="faint">Sin asignar</span>';
              }
            },
            { l: 'Tareas registradas', cls: 'nowrap', c: b => DB.todos('tareas').filter(t => t.brigada === b).length },
            { l: '', cls: 'actions', c: b => `<button class="btn btn-sm btn-ghost" data-action="quitar-brigada" data-nombre="${U.esc(b)}">🗑️</button>` }
          ], c.brigadas) : UI.vacio({ ico: '🧹', titulo: 'Sin brigadas', texto: 'Agregue las brigadas que funcionan en el centro.' })}
        </div>
      </div>`;

    const respaldo = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Respaldo de datos</h3></div>
        <div class="card-body">
          <div class="note" style="margin-bottom:14px">
            La información se guarda <b>únicamente en este navegador y en este equipo</b>. No se envía a ningún
            servidor. Exporte un respaldo con frecuencia y guárdelo en una carpeta segura o en un pendrive.
          </div>
          <dl class="kv" style="margin-bottom:16px">
            <dt>Residentes</dt><dd>${v.residentes}</dd>
            <dt>Cambios de etapa</dt><dd>${v.etapas}</dd>
            <dt>Registros de conducta</dt><dd>${v.conductas}</dd>
            <dt>Salidas</dt><dd>${v.salidas}</dd>
            <dt>Registros de llamadas</dt><dd>${v.llamadas}</dd>
            <dt>Tareas</dt><dd>${v.tareas}</dd>
            <dt>Almacenamiento</dt><dd>${DB.almacenamientoOK
              ? '<span class="badge b-ok">Funcionando</span>'
              : '<span class="badge b-danger">No disponible en este navegador</span>'}</dd>
            <dt>Nómina del centro</dt><dd>${(() => {
              const total = NOMINA.RESIDENTES.length;
              const puestos = new Set(DB.todos('residentes').map(r => NOMINA.claveRut(r.documento)));
              const n = NOMINA.RESIDENTES.filter(p => puestos.has(NOMINA.claveRut(p.rut))).length;
              return n === total
                ? `<span class="badge b-ok">${n} de ${total} cargados</span>`
                : `<span class="badge b-warn">${n} de ${total} cargados</span>`;
            })()}</dd>
            <dt>Versión del sistema</dt><dd><span class="mono">${U.esc(typeof BUILD !== 'undefined' ? BUILD : 'desconocida')}</span></dd>
          </dl>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" data-action="exportar-respaldo">⬇ Exportar respaldo (.json)</button>
            <button class="btn" data-action="importar-respaldo">⬆ Restaurar respaldo</button>
            <button class="btn" data-action="cargar-nomina">👥 Cargar nómina del centro</button>
            <button class="btn" data-action="cargar-ejemplo">🧪 Cargar datos de ejemplo</button>
          </div>
        </div>
      </div>`;

    const peligro = `
      <div class="card">
        <div class="card-head"><h3>Zona de riesgo</h3></div>
        <div class="card-body">
          <p class="small muted mt0">Elimina de forma permanente todas las fichas y registros almacenados
          en este navegador. Exporte un respaldo antes de continuar.</p>
          <button class="btn btn-danger" data-action="borrar-todo">Borrar todos los datos</button>
        </div>
      </div>`;

    const ayuda = `
      <div class="card">
        <div class="card-head"><h3>Cómo se usa el sistema</h3></div>
        <div class="card-body small">
          <p class="mt0"><b>1. Residentes.</b> Cree la ficha con la fecha de ingreso y la etapa del tratamiento.
          Toda la información posterior se cuelga de esa ficha.</p>
          <p><b>2. Registro diario.</b> Desde la ficha del residente o desde cada módulo, registre el avance de etapa,
          faltas, salidas, llamadas y tareas. Los botones rápidos de la ficha ya vienen con el residente
          preseleccionado.</p>
          <p><b>3. Alertas.</b> El sistema avisa automáticamente por retornos atrasados, faltas graves,
          reincidencia conductual, residentes próximos a cambiar de etapa, tareas vencidas y exceso de llamadas.</p>
          <p><b>4. Reportes.</b> Genere informes semanales, mensuales, de egreso o generales del centro, y
          guárdelos como PDF con «Imprimir / PDF» o descárguelos en HTML.</p>
          <p class="mb0"><b>5. Respaldo.</b> Exporte el respaldo <span class="mono">.json</span> periódicamente.
          Es la única copia de la información.</p>
        </div>
      </div>`;

    return `<div class="grid g-2-1">
      <div>${datosCentro}${brigadas}
        ${Config.tarjetaCatalogo('tiposFalta')}
        ${Config.tarjetaCatalogo('medidas')}
        ${respaldo}${peligro}</div>
      <div>${ayuda}</div>
    </div>`;
  },

  luego() {
    const f = document.getElementById('form-config');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault();
      if (!UI.valida(f)) return;
      Config.guardarDatos(UI.datos(f));
    });
  }
};

Acciones['agregar-item'] = d => Config.agregarItem(d.catalogo);
Acciones['renombrar-item'] = d => Config.renombrarItem(d.catalogo, d.nombre);
Acciones['quitar-item'] = d => Config.quitarItem(d.catalogo, d.nombre);
Acciones['agregar-brigada'] = () => Config.agregarBrigada();
Acciones['quitar-brigada'] = d => Config.quitarBrigada(d.nombre);
Acciones['exportar-respaldo'] = () => Config.exportar();
Acciones['importar-respaldo'] = () => Config.importar();
Acciones['borrar-todo'] = () => Config.borrarTodo();
Acciones['cargar-ejemplo'] = () => Config.cargarEjemplo();
