/* ============================================================
   tareas.js — tareas, responsabilidades y brigadas
   ============================================================ */

const Tareas = {

  campos(t) {
    return UI.campos([
      { n: 'residenteId', l: 'Residente responsable', t: 'select', w: 7, req: true, opts: App.opcionesResidentes(false) },
      { n: 'brigada', l: 'Brigada', t: 'select', w: 5, opts: DB.config.brigadas },
      { n: 'fecha', l: 'Fecha', t: 'date', w: 4, req: true, val: U.hoy() },
      { n: 'turno', l: 'Turno / horario', t: 'text', w: 4, ph: 'Mañana, tarde, 07:00…' },
      { n: 'tipo', l: 'Modalidad', t: 'select', w: 4, req: true, opts: DB.TIPOS_TAREA, val: DB.TIPOS_TAREA[0] },
      { n: 'tarea', l: 'Tarea o responsabilidad', t: 'textarea', w: 12, rows: 2, req: true,
        ph: 'Ej: limpieza de comedor tras el almuerzo, apoyo en cocina, orden de dormitorio…' },
      {
        n: 'delegadoA', l: 'Delegada a (si corresponde)', t: 'select', w: 7,
        opts: App.opcionesResidentes(false),
        help: 'Complete solo si el residente delegó la tarea en otro compañero.'
      },
      { n: 'supervisor', l: 'Supervisada por', t: 'text', w: 5, val: DB.config.responsable },

      { t: 'sep', l: 'Cumplimiento' },
      { n: 'estado', l: 'Estado', t: 'select', w: 6, req: true, opts: DB.ESTADOS_TAREA, val: 'Pendiente', vacio: false },
      { n: 'evaluacion', l: 'Evaluación del desempeño', t: 'select', w: 6, opts: DB.EVALUACIONES },
      { n: 'observaciones', l: 'Observaciones', t: 'textarea', w: 12, rows: 2 }
    ], t || {});
  },

  nueva(rid) {
    UI.modal({
      title: 'Asignar tarea o responsabilidad',
      sub: rid ? DB.nombreDe(rid) : 'Registro de tareas de brigada',
      size: 'wide',
      submit: 'Guardar tarea',
      body: Tareas.campos({
        residenteId: rid || '',
        brigada: rid ? (DB.brigadasDe(DB.residente(rid))[0] || '') : ''
      }),
      onSubmit: d => {
        DB.crear('tareas', d);
        UI.toast('Tarea registrada.');
        App.pintar();
      }
    });
  },

  editar(id) {
    const t = DB.obtener('tareas', id);
    if (!t) return;
    UI.modal({
      title: 'Editar tarea',
      sub: DB.nombreDe(t.residenteId) + ' · ' + U.fecha(t.fecha),
      size: 'wide',
      body: Tareas.campos(t),
      onSubmit: d => {
        DB.actualizar('tareas', id, d);
        UI.toast('Tarea actualizada.');
        App.pintar();
      }
    });
  },

  evaluar(id) {
    const t = DB.obtener('tareas', id);
    if (!t) return;
    UI.modal({
      title: 'Evaluar cumplimiento',
      sub: `${DB.nombreDe(t.residenteId)} · ${U.corta(t.tarea, 60)}`,
      submit: 'Guardar evaluación',
      body: UI.campos([
        { n: 'estado', l: 'Estado', t: 'select', w: 6, req: true, opts: DB.ESTADOS_TAREA, vacio: false, val: 'Cumplida' },
        { n: 'evaluacion', l: 'Evaluación', t: 'select', w: 6, opts: DB.EVALUACIONES },
        { n: 'supervisor', l: 'Evaluada por', t: 'text', w: 12, val: DB.config.responsable },
        { n: 'observaciones', l: 'Observaciones', t: 'textarea', w: 12, rows: 3 }
      ], t),
      onSubmit: d => {
        DB.actualizar('tareas', id, d);
        UI.toast('Evaluación registrada.');
        App.pintar();
      }
    });
  },

  /* ---------- incumplimiento de brigada ---------- */

  /** Residentes a los que se puede imputar el incumplimiento de una brigada. */
  candidatos(brigada) {
    const encargados = DB.residentesDeBrigada(brigada);
    if (encargados.length) return { lista: encargados, preseleccion: encargados.map(r => r.id) };

    // Brigadas sin encargado individual (Exterior, Huerto, Leña): se ofrecen
    // los residentes del grupo a cargo, sin preseleccionar a nadie.
    const colectiva = DB.brigadaColectiva(brigada);
    if (colectiva === 'Niveles') {
      const niveles = DB.activos().filter(r => /^Nivel /.test(r.etapa || ''));
      if (niveles.length) return { lista: niveles, preseleccion: [], colectiva };
    }
    return { lista: DB.activos(), preseleccion: [], colectiva };
  },

  /** Faltas por incumplimiento registradas para una brigada. */
  incumplimientos(brigada, dias) {
    const desde = dias ? U.sumaDias(U.hoy(), -dias) : '';
    return DB.todos('conductas')
      .filter(c => c.brigada === brigada && (!desde || c.fecha >= desde));
  },

  informarIncumplimiento(brigada) {
    const { lista, preseleccion, colectiva } = Tareas.candidatos(brigada);
    if (!lista.length) return UI.toast('No hay residentes activos a quienes registrar la falta.', 'err');

    UI.modal({
      title: 'Informar incumplimiento de brigada',
      sub: brigada + (colectiva ? ` · a cargo de ${colectiva}` : ''),
      size: 'wide',
      submit: 'Registrar falta grave',
      body: `
        <div class="note warn" style="margin-bottom:15px">
          El incumplimiento se registrará en <b>Conducta</b> como
          <b>falta grave</b> del tipo «Incumplimiento de tareas», una por cada
          residente seleccionado.
          ${colectiva ? `<br>Esta brigada no tiene encargado individual: está a cargo
            de los <b>${U.esc(colectiva)}</b>, por lo que debe indicar a quiénes corresponde.` : ''}
        </div>
        ${UI.campos([
          {
            n: 'residentes', l: 'Residentes responsables', t: 'checks', w: 12,
            opts: lista.map(r => ({ v: r.id, l: `${r.nombre} (${r.etapa})` })),
            val: preseleccion,
            help: 'Se creará un registro de conducta por cada residente marcado.'
          },
          { n: 'fecha', l: 'Fecha del incumplimiento', t: 'date', w: 4, req: true, val: U.hoy() },
          { n: 'hora', l: 'Hora', t: 'time', w: 3, val: U.ahora() },
          { n: 'lugar', l: 'Lugar', t: 'text', w: 5, val: brigada },
          {
            n: 'descripcion', l: 'Descripción del incumplimiento', t: 'textarea', w: 12, rows: 4, req: true,
            ph: `Detalle qué no se cumplió en la brigada ${brigada}: tarea pendiente, estado del sector, reiteración…`
          },
          { n: 'medida', l: 'Medida aplicada', t: 'select', w: 6, opts: DB.MEDIDAS },
          { n: 'reportadoPor', l: 'Informado por', t: 'text', w: 6, val: DB.config.responsable }
        ], {})}`,
      onSubmit: d => {
        const ids = Array.isArray(d.residentes) ? d.residentes : [];
        if (!ids.length) {
          UI.toast('Seleccione al menos un residente responsable.', 'err');
          return false;
        }
        ids.forEach(rid => DB.crear('conductas', {
          residenteId: rid,
          fecha: d.fecha,
          hora: d.hora,
          gravedad: 'Grave',
          tipoFalta: 'Incumplimiento de tareas',
          lugar: d.lugar,
          brigada: brigada,
          origen: 'Brigada',
          descripcion: d.descripcion,
          medida: d.medida,
          medidaDetalle: '',
          estado: 'Abierto',
          seguimiento: '',
          reportadoPor: d.reportadoPor
        }));
        UI.toast(`Falta grave registrada para ${U.plural(ids.length, 'residente', 'residentes')}.`);
        App.pintar();
      }
    });
  },

  filtrar(base) {
    const q = U.norm(App.f('q'));
    const rid = App.f('residente'), brig = App.f('brigada'), est = App.f('estado');
    const desde = App.f('desde'), hasta = App.f('hasta');
    return (base || DB.todos('tareas')).filter(t => {
      if (rid && t.residenteId !== rid && t.delegadoA !== rid) return false;
      if (brig && t.brigada !== brig) return false;
      if (est && t.estado !== est) return false;
      if (!U.enRango(t.fecha, desde, hasta)) return false;
      if (q) {
        const blob = U.norm([DB.nombreDe(t.residenteId), t.tarea, t.brigada, t.observaciones, t.supervisor].join(' '));
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort(U.porFechaDesc());
  },

  /** Porcentaje de cumplimiento de un conjunto de tareas (excluye pendientes). */
  cumplimiento(tareas) {
    const evaluadas = tareas.filter(t => t.estado && t.estado !== 'Pendiente');
    if (!evaluadas.length) return null;
    const puntos = U.suma(evaluadas, t =>
      t.estado === 'Cumplida' ? 1 : t.estado === 'Cumplida parcialmente' ? 0.5 : 0);
    return Math.round(puntos / evaluadas.length * 100);
  },

  tabla(filas, opts) {
    opts = opts || {};
    const cols = [
      { l: 'Fecha', cls: 'nowrap', c: t => `<div>${U.fecha(t.fecha)}</div><div class="small faint">${U.esc(t.turno || '')}</div>` }
    ];
    if (!opts.sinResidente) cols.push({ l: 'Responsable', c: t => App.enlaceResidente(t.residenteId) });
    cols.push(
      { l: 'Brigada', c: t => t.brigada ? `<span class="badge b-gray">${U.esc(t.brigada)}</span>` : '<span class="faint">—</span>' },
      {
        l: 'Tarea', c: t => `<div>${U.esc(U.corta(t.tarea, 110))}</div>` +
          (t.delegadoA ? `<div class="small" style="color:var(--purple)">↪ Delegada a ${U.esc(DB.nombreDe(t.delegadoA))}</div>` : '')
      },
      { l: 'Modalidad', c: t => U.esc(t.tipo) || '<span class="faint">—</span>' },
      { l: 'Estado', cls: 'nowrap', c: t => App.badgeEstadoTarea(t.estado) },
      {
        l: 'Evaluación', cls: 'nowrap', c: t => {
          if (!t.evaluacion) return '<span class="faint">—</span>';
          const cls = { 'Excelente': 'b-ok', 'Buena': 'b-ok', 'Regular': 'b-warn', 'Deficiente': 'b-danger' }[t.evaluacion];
          return `<span class="badge ${cls}">${U.esc(t.evaluacion)}</span>`;
        }
      },
      {
        l: '', cls: 'actions', c: t =>
          (t.estado === 'Pendiente'
            ? `<button class="btn btn-sm btn-primary" data-action="evaluar-tarea" data-id="${t.id}">✓ Evaluar</button> `
            : `<button class="btn btn-sm btn-ghost" data-action="evaluar-tarea" data-id="${t.id}" title="Reevaluar">✓</button>`) +
          App.accionesFila('tareas', t.id, 'la tarea del ' + U.fecha(t.fecha))
      }
    );
    return UI.tabla(cols, filas, {
      vacio: {
        ico: '🧹', titulo: 'Sin tareas registradas',
        texto: 'Asigne tareas y responsabilidades de brigada y registre su cumplimiento.',
        accion: `<button class="btn btn-primary" data-action="nueva-tarea" ${opts.rid ? `data-rid="${opts.rid}"` : ''}>+ Asignar tarea</button>`
      }
    });
  },

  panel(r) {
    const propias = DB.todos('tareas').filter(t => t.residenteId === r.id || t.delegadoA === r.id)
      .sort(U.porFechaDesc());
    const cump = Tareas.cumplimiento(propias.filter(t => t.residenteId === r.id));
    const pendientes = propias.filter(t => t.estado === 'Pendiente').length;
    const delegadas = propias.filter(t => t.residenteId === r.id && t.delegadoA).length;

    return `
      <div class="grid g4" style="margin-bottom:16px">
        ${UI.stat({ ico: '🧹', val: propias.length, lab: 'Tareas registradas' })}
        ${UI.stat({ ico: '📊', val: cump === null ? '—' : cump + '%', lab: 'Cumplimiento', nota: cump === null ? 'Sin tareas evaluadas' : '' })}
        ${UI.stat({ ico: '⏳', val: pendientes, lab: 'Pendientes de evaluar' })}
        ${UI.stat({ ico: '↪', val: delegadas, lab: 'Tareas delegadas a otros' })}
      </div>
      <div class="card">
        <div class="card-head">
          <div><h3>Tareas y responsabilidades</h3>
            <div class="sub">Brigadas: ${U.esc(DB.brigadasTexto(r)) || 'sin asignar'}</div></div>
          <div class="right">
            <button class="btn btn-primary btn-sm" data-action="nueva-tarea" data-rid="${r.id}">+ Asignar tarea</button>
          </div>
        </div>
        <div class="card-body tight">${Tareas.tabla(propias, { sinResidente: true, rid: r.id })}</div>
      </div>`;
  }
};

Vistas['tareas'] = {
  titulo: 'Tareas y brigadas',
  sub: () => {
    const t = DB.todos('tareas');
    const pend = t.filter(x => x.estado === 'Pendiente').length;
    const c = Tareas.cumplimiento(t);
    return `${t.length} tareas registradas · ${pend} pendientes · cumplimiento general ${c === null ? '—' : c + '%'}`;
  },
  acciones: () => `
    <button class="btn" data-action="exportar-tareas">⬇ Exportar CSV</button>
    <button class="btn btn-primary" data-action="nueva-tarea">+ Asignar tarea</button>`,

  render() {
    const filas = Tareas.filtrar();
    const todas = DB.todos('tareas');

    const porBrigada = DB.config.brigadas.map(b => {
      const ts = todas.filter(t => t.brigada === b);
      return { l: b, v: ts.length, cump: Tareas.cumplimiento(ts) };
    }).filter(x => x.v > 0);

    /* --- Panel de brigadas con informe de incumplimiento --- */
    const tablaBrigadas = UI.tabla([
      { l: 'Brigada', c: b => `<b>${U.esc(b)}</b>` },
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
      {
        l: 'Tareas', cls: 'nowrap', c: b => {
          const ts = todas.filter(t => t.brigada === b);
          const c = Tareas.cumplimiento(ts);
          return `${ts.length}${c !== null ? `<div class="small faint">${c} % cumplimiento</div>` : ''}`;
        }
      },
      {
        l: 'Incumplimientos (30 d)', cls: 'nowrap', c: b => {
          const n = Tareas.incumplimientos(b, 30).length;
          return n
            ? `<span class="badge b-danger">${n}</span>`
            : '<span class="faint">Ninguno</span>';
        }
      },
      {
        l: '', cls: 'actions',
        c: b => `<button class="btn btn-sm" data-action="informar-incumplimiento"
                   data-brigada="${U.esc(b)}">⚠️ Informar incumplimiento</button>`
      }
    ], DB.config.brigadas, {
      vacio: {
        ico: '🧹', titulo: 'Sin brigadas configuradas',
        texto: 'Agregue las brigadas del centro en Configuración.'
      }
    });

    const panelListaBrigadas = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <div><h3>Brigadas del centro</h3>
            <div class="sub">Encargados y control de cumplimiento. Un incumplimiento
              queda registrado en Conducta como falta grave.</div></div>
        </div>
        <div class="card-body tight">${tablaBrigadas}</div>
      </div>`;

    const panelBrigadas = porBrigada.length ? `
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card">
          <div class="card-head"><h3>Tareas por brigada</h3></div>
          <div class="card-body">${UI.barras(porBrigada)}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Cumplimiento por brigada</h3>
            <div class="sub" style="margin-left:auto">Cumplida = 100 %, parcial = 50 %</div></div>
          <div class="card-body">${UI.barras(
            porBrigada.filter(x => x.cump !== null).map(x => ({
              l: x.l, v: x.cump,
              color: x.cump >= 80 ? 'var(--ok)' : x.cump >= 50 ? 'var(--warn)' : 'var(--danger)'
            })), 100)}</div>
        </div>
      </div>` : '';

    const toolbar = App.toolbar([
      App.buscador('Buscar tareas…'),
      App.selectFiltro('residente', 'Todos los residentes', App.opcionesResidentes(true)),
      App.selectFiltro('brigada', 'Todas las brigadas', DB.config.brigadas),
      App.selectFiltro('estado', 'Todos los estados', DB.ESTADOS_TAREA),
      `<input type="date" data-filtro="desde" value="${U.esc(App.f('desde'))}" title="Desde">`,
      `<input type="date" data-filtro="hasta" value="${U.esc(App.f('hasta'))}" title="Hasta">`,
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filas.length, 'tarea', 'tareas')}</div>`
    ]);

    return panelListaBrigadas + panelBrigadas + toolbar +
      `<div class="card"><div class="card-body tight">${Tareas.tabla(filas)}</div></div>`;
  }
};

Acciones['informar-incumplimiento'] = d => Tareas.informarIncumplimiento(d.brigada);
Acciones['nueva-tarea'] = d => Tareas.nueva(d.rid);
Acciones['editar-tareas'] = d => Tareas.editar(d.id);
Acciones['evaluar-tarea'] = d => Tareas.evaluar(d.id);

Acciones['exportar-tareas'] = () => {
  const filas = Tareas.filtrar();
  if (!filas.length) return UI.toast('No hay tareas para exportar.', 'warn');
  U.descargar(`tareas_${U.hoy()}.csv`, U.csv([
    { l: 'Fecha', v: t => U.fecha(t.fecha) },
    { l: 'Responsable', v: t => DB.nombreDe(t.residenteId) },
    { l: 'Brigada', v: t => t.brigada },
    { l: 'Tarea', v: t => t.tarea },
    { l: 'Modalidad', v: t => t.tipo },
    { l: 'Delegada a', v: t => t.delegadoA ? DB.nombreDe(t.delegadoA) : '' },
    { l: 'Turno', v: t => t.turno },
    { l: 'Estado', v: t => t.estado },
    { l: 'Evaluación', v: t => t.evaluacion },
    { l: 'Supervisó', v: t => t.supervisor },
    { l: 'Observaciones', v: t => t.observaciones }
  ], filas), 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
