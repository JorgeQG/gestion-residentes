/* ============================================================
   conducta.js — registro de faltas, incidentes y medidas
   ============================================================ */

const Conducta = {

  ESTADOS: ['Abierto', 'En seguimiento', 'Resuelto'],

  /** Formulario completo, usado al editar un registro existente. */
  campos(c) {
    return UI.campos([
      { n: 'residenteId', l: 'Residente', t: 'select', w: 12, req: true, opts: App.opcionesResidentes(true) },
      { n: 'fecha', l: 'Fecha del hecho', t: 'date', w: 4, req: true, val: U.hoy() },
      { n: 'hora', l: 'Hora', t: 'time', w: 3, val: U.ahora() },
      { n: 'gravedad', l: 'Gravedad', t: 'select', w: 5, req: true, opts: DB.GRAVEDADES, val: 'Leve' },
      { n: 'tipoFalta', l: 'Tipo de falta o incidente', t: 'select', w: 7, req: true, opts: DB.TIPOS_FALTA },
      { n: 'lugar', l: 'Lugar', t: 'text', w: 5, ph: 'Comedor, dormitorio, patio…' },
      { n: 'descripcion', l: 'Descripción del hecho', t: 'textarea', w: 12, rows: 4, req: true,
        ph: 'Relate objetivamente lo ocurrido: qué, cuándo, quiénes participaron y consecuencias.' },
      { n: 'testigos', l: 'Testigos o involucrados', t: 'text', w: 12 },

      { t: 'sep', l: 'Medida aplicada y seguimiento' },
      { n: 'medida', l: 'Medida', t: 'select', w: 6, opts: DB.MEDIDAS },
      { n: 'estado', l: 'Estado del caso', t: 'select', w: 6, opts: Conducta.ESTADOS, val: 'Abierto', vacio: false },
      { n: 'medidaDetalle', l: 'Detalle de la medida / plazo', t: 'textarea', w: 12, rows: 2 },
      { n: 'seguimiento', l: 'Seguimiento y resultado', t: 'textarea', w: 12, rows: 2 },
      { n: 'reportadoPor', l: 'Reportado por', t: 'text', w: 12, val: DB.config.responsable }
    ], c || {});
  },

  /**
   * Registro rápido: solo lo indispensable. El resto de los datos queda
   * plegado y se puede completar después al editar o al cerrar el caso.
   */
  nueva(rid) {
    UI.modal({
      title: 'Registrar falta o incidente',
      sub: rid ? DB.nombreDe(rid) : 'Registro conductual',
      submit: 'Registrar',
      body: `
        ${UI.campos([
          { n: 'residenteId', l: 'Residente', t: 'select', w: 12, req: true, opts: App.opcionesResidentes(false) },
          { n: 'gravedad', l: 'Gravedad', t: 'select', w: 5, req: true, opts: DB.GRAVEDADES, val: 'Leve', vacio: false },
          { n: 'tipoFalta', l: 'Tipo', t: 'select', w: 7, req: true, opts: DB.TIPOS_FALTA },
          { n: 'descripcion', l: 'Qué ocurrió', t: 'textarea', w: 12, rows: 3, req: true,
            ph: 'Breve relato del hecho.' }
        ], { residenteId: rid || '' })}

        <details class="detalles-opcionales">
          <summary>Agregar más detalles (opcional)</summary>
          ${UI.campos([
            { n: 'fecha', l: 'Fecha del hecho', t: 'date', w: 6, val: U.hoy() },
            { n: 'hora', l: 'Hora', t: 'time', w: 6, val: U.ahora() },
            { n: 'lugar', l: 'Lugar', t: 'text', w: 12, ph: 'Comedor, dormitorio, patio…' },
            { n: 'medida', l: 'Medida aplicada', t: 'select', w: 12, opts: DB.MEDIDAS },
            { n: 'reportadoPor', l: 'Reportado por', t: 'text', w: 12, val: DB.config.responsable }
          ], {})}
        </details>`,
      onSubmit: d => {
        d.fecha = d.fecha || U.hoy();
        d.estado = 'Abierto';
        DB.crear('conductas', d);
        UI.toast('Falta registrada.');
        App.pintar();
      }
    });
  },

  editar(id) {
    const c = DB.obtener('conductas', id);
    if (!c) return;
    UI.modal({
      title: 'Editar registro conductual',
      sub: DB.nombreDe(c.residenteId) + ' · ' + U.fecha(c.fecha),
      size: 'wide',
      body: Conducta.campos(c),
      onSubmit: d => {
        // Si se marca resuelto desde el formulario se deja la fecha de cierre,
        // que es lo que usa el informe del residente.
        if (d.estado === 'Resuelto' && !c.fechaResolucion) d.fechaResolucion = U.hoy();
        if (d.estado !== 'Resuelto') d.fechaResolucion = '';
        DB.actualizar('conductas', id, d);
        UI.toast('Registro actualizado.');
        App.pintar();
      }
    });
  },

  /* ---------- resolución de casos ---------- */

  resolver(id) {
    const c = DB.obtener('conductas', id);
    if (!c) return;
    UI.modal({
      title: 'Cerrar caso como resuelto',
      sub: `${DB.nombreDe(c.residenteId)} · ${U.esc(c.tipoFalta)} del ${U.fecha(c.fecha)}`,
      submit: 'Marcar como resuelto',
      body: `
        <div class="note" style="margin-bottom:14px">
          Al cerrar el caso queda registrado como <b>resuelto</b> y se incorpora al
          informe personal del residente, en la sección de faltas resueltas.
        </div>
        ${UI.campos([
          { n: 'fechaResolucion', l: 'Fecha de resolución', t: 'date', w: 6, req: true, val: U.hoy() },
          { n: 'resueltoPor', l: 'Cerrado por', t: 'text', w: 6, val: DB.config.responsable },
          {
            n: 'resolucion', l: 'Resultado del caso', t: 'textarea', w: 12, rows: 4, req: true,
            ph: 'Cómo se resolvió: cumplimiento de la medida, reparación, acuerdos alcanzados, actitud del residente…'
          }
        ], c)}`,
      onSubmit: d => {
        if (d.fechaResolucion < c.fecha) {
          UI.toast('La resolución no puede ser anterior al hecho.', 'err');
          return false;
        }
        DB.actualizar('conductas', id, Object.assign({ estado: 'Resuelto' }, d));
        UI.toast('Caso cerrado. Ya aparece en el informe del residente.');
        App.pintar();
      }
    });
  },

  reabrir(id) {
    const c = DB.obtener('conductas', id);
    if (!c) return;
    UI.confirmar({
      title: 'Reabrir caso',
      body: `¿Reabrir el caso de <b>${U.esc(DB.nombreDe(c.residenteId))}</b>
        (${U.esc(c.tipoFalta)}, ${U.fecha(c.fecha)})?<br>
        <span class="muted small">Volverá al estado «En seguimiento» y dejará de figurar
        como resuelto en los informes. Se conserva lo escrito en el resultado.</span>`,
      submit: 'Reabrir',
      onSubmit: () => {
        DB.actualizar('conductas', id, { estado: 'En seguimiento', fechaResolucion: '' });
        UI.toast('Caso reabierto.');
        App.pintar();
      }
    });
  },

  /** Faltas de un residente cerradas dentro del período indicado. */
  resueltasEn(residenteId, desde, hasta) {
    return DB.de('conductas', residenteId)
      .filter(c => c.estado === 'Resuelto' && c.fechaResolucion &&
        U.enRango(c.fechaResolucion, desde, hasta))
      .sort((a, b) => String(a.fechaResolucion).localeCompare(String(b.fechaResolucion)));
  },

  filtrar(base) {
    const q = U.norm(App.f('q'));
    const rid = App.f('residente'), grav = App.f('gravedad'), est = App.f('estado');
    const desde = App.f('desde'), hasta = App.f('hasta');
    return (base || DB.todos('conductas')).filter(c => {
      if (rid && c.residenteId !== rid) return false;
      if (grav && c.gravedad !== grav) return false;
      if (est && (c.estado || 'Abierto') !== est) return false;
      if (!U.enRango(c.fecha, desde, hasta)) return false;
      if (q) {
        const blob = U.norm([DB.nombreDe(c.residenteId), c.tipoFalta, c.descripcion, c.medida, c.lugar, c.reportadoPor].join(' '));
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort(U.porFechaDesc());
  },

  badgeEstado(e) {
    const cls = { 'Abierto': 'b-danger', 'En seguimiento': 'b-warn', 'Resuelto': 'b-ok' }[e || 'Abierto'];
    return `<span class="badge ${cls}">${U.esc(e || 'Abierto')}</span>`;
  },

  tabla(filas, opts) {
    opts = opts || {};
    const cols = [
      { l: 'Fecha', cls: 'nowrap', c: c => `<div>${U.fecha(c.fecha)}</div><div class="small faint">${U.esc(c.hora || '')}</div>` }
    ];
    if (!opts.sinResidente) cols.push({ l: 'Residente', c: c => App.enlaceResidente(c.residenteId) });
    cols.push(
      { l: 'Gravedad', cls: 'nowrap', c: c => App.badgeGravedad(c.gravedad) },
      { l: 'Tipo', c: c => U.esc(c.tipoFalta) },
      { l: 'Descripción', c: c => U.esc(U.corta(c.descripcion, 120)) },
      { l: 'Medida', c: c => c.medida ? U.esc(c.medida) : '<span class="faint">Sin medida</span>' },
      {
        l: 'Estado', cls: 'nowrap', c: c => Conducta.badgeEstado(c.estado) +
          (c.estado === 'Resuelto' && c.fechaResolucion
            ? `<div class="small faint">${U.fecha(c.fechaResolucion)}</div>` : '')
      },
      {
        l: '', cls: 'actions', c: c =>
          (c.estado === 'Resuelto'
            ? `<button class="btn btn-sm btn-ghost" data-action="reabrir-conducta" data-id="${c.id}" title="Reabrir caso">↺</button> `
            : `<button class="btn btn-sm btn-primary" data-action="resolver-conducta" data-id="${c.id}">✓ Resolver</button> `) +
          `<button class="btn btn-sm btn-ghost" data-action="ver-conducta" data-id="${c.id}" title="Ver detalle">👁</button>` +
          App.accionesFila('conductas', c.id, 'el registro del ' + U.fecha(c.fecha))
      }
    );
    return UI.tabla(cols, filas, {
      vacio: {
        ico: '✅', titulo: 'Sin faltas ni incidentes registrados',
        texto: 'Aquí se registran incumplimientos, incidentes y las medidas aplicadas.',
        accion: `<button class="btn btn-primary" data-action="nueva-conducta" ${opts.rid ? `data-rid="${opts.rid}"` : ''}>+ Registrar falta</button>`
      }
    });
  },

  ver(id) {
    const c = DB.obtener('conductas', id);
    if (!c) return;
    UI.modal({
      title: c.tipoFalta || 'Registro conductual',
      sub: DB.nombreDe(c.residenteId) + ' · ' + U.fechaHora(c.fecha, c.hora),
      submit: null,
      cancel: 'Cerrar',
      body: `
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">
          ${App.badgeGravedad(c.gravedad)} ${Conducta.badgeEstado(c.estado)}
          ${c.lugar ? `<span class="badge b-gray">${U.esc(c.lugar)}</span>` : ''}
        </div>
        <div class="section-title" style="margin-top:0">Descripción del hecho</div>
        <div class="pre">${U.nl(c.descripcion)}</div>
        ${c.testigos ? `<div class="section-title">Testigos / involucrados</div><div class="pre">${U.nl(c.testigos)}</div>` : ''}
        <div class="section-title">Medida aplicada</div>
        <div class="pre">${U.esc(c.medida || 'Sin medida registrada')}${c.medidaDetalle ? '\n' + U.esc(c.medidaDetalle) : ''}</div>
        ${c.seguimiento ? `<div class="section-title">Seguimiento</div><div class="pre">${U.nl(c.seguimiento)}</div>` : ''}
        ${c.estado === 'Resuelto' && c.resolucion ? `
          <div class="section-title">Resultado del caso</div>
          <div class="note" style="margin-top:4px">
            <div class="pre">${U.nl(c.resolucion)}</div>
            <div class="small muted" style="margin-top:6px">
              Cerrado el ${U.fecha(c.fechaResolucion)}${c.resueltoPor ? ' por ' + U.esc(c.resueltoPor) : ''}.
            </div>
          </div>` : ''}
        ${c.brigada ? `<div class="section-title">Brigada</div>
          <div class="small muted">${U.esc(c.brigada)}</div>` : ''}
        <div class="section-title">Reportado por</div>
        <div class="small muted">${U.esc(c.reportadoPor) || 'No indicado'}</div>`,
      extraFoot: (c.estado === 'Resuelto'
        ? ''
        : `<button type="button" class="btn btn-sm btn-primary" data-action="resolver-conducta" data-id="${c.id}">✓ Resolver</button> `) +
        `<button type="button" class="btn btn-sm" data-action="editar-conductas" data-id="${c.id}">✏️ Editar</button>`
    });
  },

  panel(r) {
    const filas = DB.de('conductas', r.id).sort(U.porFechaDesc());
    const ult30 = DB.faltasRecientes(r.id, 30);
    const peso = U.suma(ult30, f => DB.pesoFalta(f.gravedad));
    return `
      ${ult30.length >= Alertas.FALTAS_REINCIDENCIA ? `<div class="note danger" style="margin-bottom:16px">
        <b>Alerta de reincidencia:</b> ${ult30.length} faltas en los últimos 30 días
        (puntaje de gravedad ${peso}). Se sugiere evaluación por el equipo técnico.
      </div>` : ''}
      <div class="card">
        <div class="card-head">
          <div><h3>Conducta</h3><div class="sub">Faltas, incidentes y medidas aplicadas</div></div>
          <div class="right">
            <button class="btn btn-primary btn-sm" data-action="nueva-conducta" data-rid="${r.id}">+ Registrar falta</button>
          </div>
        </div>
        <div class="card-body tight">${Conducta.tabla(filas, { sinResidente: true, rid: r.id })}</div>
      </div>`;
  }
};

Vistas['conducta'] = {
  titulo: 'Conducta',
  sub: () => {
    const t = DB.todos('conductas');
    const abiertos = t.filter(c => (c.estado || 'Abierto') !== 'Resuelto').length;
    const desde = U.sumaDias(U.hoy(), -7);
    return `${t.length} registros · ${t.filter(c => c.fecha >= desde).length} en los últimos 7 días · ${abiertos} casos sin cerrar`;
  },
  acciones: () => `
    <button class="btn" data-action="exportar-conducta">⬇ Exportar CSV</button>
    <button class="btn btn-primary" data-action="nueva-conducta">+ Registrar falta</button>`,

  render() {
    const filas = Conducta.filtrar();
    const alertas = Alertas.deConducta();

    const toolbar = App.toolbar([
      App.buscador('Buscar en descripciones…'),
      App.selectFiltro('residente', 'Todos los residentes', App.opcionesResidentes(true)),
      App.selectFiltro('gravedad', 'Todas las gravedades', DB.GRAVEDADES),
      App.selectFiltro('estado', 'Todos los estados', Conducta.ESTADOS),
      `<input type="date" data-filtro="desde" value="${U.esc(App.f('desde'))}" title="Desde">`,
      `<input type="date" data-filtro="hasta" value="${U.esc(App.f('hasta'))}" title="Hasta">`,
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filas.length, 'registro', 'registros')}</div>`
    ]);

    const panelAlertas = alertas.length ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>⚠️ Alertas de conducta</h3>
          <div class="right"><span class="badge b-danger">${alertas.length}</span></div></div>
        <div class="card-body tight">${Alertas.render(alertas, { limite: 6 })}</div>
      </div>` : '';

    return panelAlertas + toolbar +
      `<div class="card"><div class="card-body tight">${Conducta.tabla(filas)}</div></div>`;
  }
};

Acciones['nueva-conducta'] = d => Conducta.nueva(d.rid);
Acciones['editar-conductas'] = d => Conducta.editar(d.id);
Acciones['ver-conducta'] = d => Conducta.ver(d.id);
Acciones['resolver-conducta'] = d => Conducta.resolver(d.id);
Acciones['reabrir-conducta'] = d => Conducta.reabrir(d.id);

Acciones['exportar-conducta'] = () => {
  const filas = Conducta.filtrar();
  if (!filas.length) return UI.toast('No hay registros para exportar.', 'warn');
  U.descargar(`conducta_${U.hoy()}.csv`, U.csv([
    { l: 'Fecha', v: c => U.fecha(c.fecha) },
    { l: 'Hora', v: c => c.hora },
    { l: 'Residente', v: c => DB.nombreDe(c.residenteId) },
    { l: 'Gravedad', v: c => c.gravedad },
    { l: 'Tipo', v: c => c.tipoFalta },
    { l: 'Lugar', v: c => c.lugar },
    { l: 'Descripción', v: c => c.descripcion },
    { l: 'Medida', v: c => c.medida },
    { l: 'Detalle medida', v: c => c.medidaDetalle },
    { l: 'Brigada', v: c => c.brigada },
    { l: 'Estado', v: c => c.estado || 'Abierto' },
    { l: 'Fecha resolución', v: c => U.fecha(c.fechaResolucion) },
    { l: 'Resultado del caso', v: c => c.resolucion },
    { l: 'Reportado por', v: c => c.reportadoPor }
  ], filas), 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
