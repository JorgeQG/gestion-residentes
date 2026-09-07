/* ============================================================
   residentes.js — fichas de residentes, listado y ficha detalle
   ============================================================ */

const Residentes = {

  /* ---------- formulario de ficha ---------- */

  campos(r) {
    // Se normalizan las brigadas a arreglo para que el formulario marque
    // correctamente también las fichas creadas antes de este cambio.
    r = Object.assign({}, r || {}, { brigadas: DB.brigadasDe(r) });
    return UI.campos([
      { t: 'sep', l: 'Identificación' },
      { n: 'nombre', l: 'Nombre completo', t: 'text', w: 7, req: true, ph: 'Apellidos y nombres' },
      { n: 'documento', l: 'RUT / documento de identidad', t: 'text', w: 5 },
      { n: 'fechaNacimiento', l: 'Fecha de nacimiento', t: 'date', w: 4 },
      { n: 'sexo', l: 'Sexo', t: 'select', w: 4, opts: DB.SEXOS },
      { n: 'telefono', l: 'Teléfono', t: 'tel', w: 4 },
      { n: 'direccion', l: 'Domicilio', t: 'text', w: 12 },

      { t: 'sep', l: 'Ingreso y tratamiento' },
      { n: 'fechaIngreso', l: 'Fecha de ingreso', t: 'date', w: 6, req: true, val: U.hoy() },
      { n: 'etapa', l: 'Cargo, nivel o grupo', t: 'select', w: 6, req: true, opts: DB.ETAPAS },
      {
        n: 'brigadas', l: 'Brigadas asignadas', t: 'checks', w: 12, opts: DB.config.brigadas,
        help: 'Marque todas las que correspondan; un residente puede tener más de una.'
      },
      { n: 'sustancia', l: 'Sustancia principal de consumo', t: 'text', w: 6 },
      { n: 'tiempoConsumo', l: 'Tiempo de consumo', t: 'text', w: 3, ph: 'Ej: 8 años' },
      { n: 'tratamientosPrevios', l: 'Tratamientos previos', t: 'number', w: 3, min: 0 },
      { n: 'derivadoPor', l: 'Derivado por / institución', t: 'text', w: 6 },
      { n: 'prevision', l: 'Previsión de salud', t: 'text', w: 6 },
      { n: 'diagnostico', l: 'Diagnóstico o motivo de ingreso', t: 'textarea', w: 12, rows: 3 },

      { t: 'sep', l: 'Contacto de emergencia' },
      { n: 'contactoNombre', l: 'Nombre', t: 'text', w: 5 },
      { n: 'contactoParentesco', l: 'Parentesco', t: 'text', w: 3 },
      { n: 'contactoTelefono', l: 'Teléfono', t: 'tel', w: 4 },

      { t: 'sep', l: 'Observaciones' },
      { n: 'observaciones', l: 'Observaciones generales', t: 'textarea', w: 12, rows: 3 }
    ], r);
  },

  nuevo() {
    UI.modal({
      title: 'Nueva ficha de residente',
      sub: 'Complete los datos de ingreso',
      size: 'wide',
      submit: 'Crear ficha',
      body: Residentes.campos({}),
      onSubmit: d => {
        d.estado = 'Activo';
        d.etapaDesde = d.fechaIngreso;
        const r = DB.crear('residentes', d);
        // Primer tramo del historial de etapas, base del cálculo de avance.
        DB.crear('etapas', {
          residenteId: r.id, etapa: r.etapa, desde: r.etapaDesde, hasta: '',
          motivo: 'Ingreso al centro', registradoPor: DB.config.responsable || ''
        });
        UI.toast('Ficha creada correctamente.');
        App.ir('residente/' + r.id);
      }
    });
  },

  editar(id) {
    const r = DB.residente(id);
    if (!r) return;
    UI.modal({
      title: 'Editar ficha',
      sub: r.nombre,
      size: 'wide',
      body: Residentes.campos(r),
      onSubmit: d => {
        // Un cambio de etapa desde la ficha también queda en el historial,
        // para que el cálculo de avance no se desincronice.
        if (d.etapa && d.etapa !== r.etapa) {
          Progreso.aplicarCambio(r, d.etapa, U.hoy(),
            'Cambio registrado al editar la ficha', DB.config.responsable || '');
          delete d.etapa;
        }
        DB.actualizar('residentes', id, d);
        UI.toast('Ficha actualizada.');
        App.pintar();
      }
    });
  },

  /* ---------- egreso / reingreso ---------- */

  egresar(id) {
    const r = DB.residente(id);
    if (!r) return;
    UI.modal({
      title: 'Registrar egreso',
      sub: r.nombre,
      submit: 'Registrar egreso',
      body: UI.campos([
        { n: 'fechaEgreso', l: 'Fecha de egreso', t: 'date', w: 6, req: true, val: U.hoy() },
        { n: 'tipoEgreso', l: 'Tipo de egreso', t: 'select', w: 6, req: true, opts: DB.TIPOS_EGRESO },
        { n: 'etapaEgreso', l: 'Etapa alcanzada', t: 'select', w: 12, opts: DB.ETAPAS, val: r.etapa },
        { n: 'motivoEgreso', l: 'Motivo / fundamento', t: 'textarea', w: 12, rows: 3, req: true },
        { n: 'derivacionEgreso', l: 'Derivación o seguimiento posterior', t: 'textarea', w: 12, rows: 2 }
      ], r),
      onSubmit: d => {
        d.estado = 'Egresado';
        DB.actualizar('residentes', id, d);
        UI.toast('Egreso registrado. Puede generar el informe de egreso desde Reportes.');
        App.pintar();
      }
    });
  },

  reingresar(id) {
    const r = DB.residente(id);
    UI.confirmar({
      title: 'Reactivar residente',
      body: `¿Desea reactivar a <b>${U.esc(r.nombre)}</b> como residente activo?<br>
        <span class="muted small">Se conservará el historial y se limpiarán los datos de egreso.</span>`,
      submit: 'Reactivar',
      onSubmit: () => {
        DB.actualizar('residentes', id, {
          estado: 'Activo', fechaEgreso: '', tipoEgreso: '', motivoEgreso: '', derivacionEgreso: ''
        });
        UI.toast('Residente reactivado.');
        App.pintar();
      }
    });
  },

  /* ---------- filtro del listado ---------- */

  filtrar() {
    const q = U.norm(App.f('q'));
    const etapa = App.f('etapa');
    const estado = App.f('estado', 'activos');
    const brigada = App.f('brigada');

    const [mesIni, mesFin] = U.mesDe(U.mesActual());

    return DB.todos('residentes').filter(r => {
      if (estado === 'activos' && r.estado === 'Egresado') return false;
      if (estado === 'egresados' && r.estado !== 'Egresado') return false;
      if (estado === 'presentes' && (r.estado === 'Egresado' || DB.salidaAbierta(r.id))) return false;
      if (estado === 'fuera' && !(r.estado !== 'Egresado' && DB.salidaAbierta(r.id))) return false;
      if (estado === 'ingresos30' &&
        (r.estado === 'Egresado' || r.fechaIngreso < U.sumaDias(U.hoy(), -30))) return false;
      if (estado === 'egresosMes' &&
        (r.estado !== 'Egresado' || !U.enRango(r.fechaEgreso, mesIni, mesFin))) return false;
      if (etapa && r.etapa !== etapa) return false;
      if (brigada && !DB.brigadasDe(r).includes(brigada)) return false;
      if (q) {
        const blob = U.norm([r.nombre, r.documento, r.sustancia, DB.brigadasTexto(r, ' '), r.diagnostico].join(' '));
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
};

/* ============================================================
   Vista: listado de residentes
   ============================================================ */

Vistas['residentes'] = {
  titulo: 'Residentes',
  sub: () => {
    const a = DB.activos().length, p = DB.presentes().length, e = DB.egresados().length;
    return `${a} activos · ${p} presentes en el centro · ${e} egresados`;
  },
  acciones: () => `
    <button class="btn" data-action="exportar-residentes">⬇ Exportar CSV</button>
    <button class="btn btn-primary" data-action="nuevo-residente">+ Nuevo residente</button>`,

  render() {
    const filas = Residentes.filtrar();

    const toolbar = App.toolbar([
      App.buscador('Buscar por nombre, documento, sustancia…'),
      App.selectFiltro('estado', 'Todos los estados', [
        { v: 'activos', l: 'Solo activos' },
        { v: 'presentes', l: 'Presentes en el centro' },
        { v: 'fuera', l: 'Fuera del centro' },
        { v: 'ingresos30', l: 'Ingresados (últimos 30 días)' },
        { v: 'egresados', l: 'Egresados' },
        { v: 'egresosMes', l: 'Egresados este mes' }
      ], App.f('estado', 'activos')),
      App.selectFiltro('etapa', 'Todas las etapas', DB.ETAPAS),
      App.selectFiltro('brigada', 'Todas las brigadas', DB.config.brigadas),
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filas.length, 'residente', 'residentes')}</div>`
    ]);

    const tabla = UI.tabla([
      {
        l: 'Residente', c: r => `<a href="#/residente/${r.id}" style="color:inherit;text-decoration:none">
          ${UI.persona(r, { meta: [r.documento, U.edad(r.fechaNacimiento) ? U.edad(r.fechaNacimiento) + ' años' : ''].filter(Boolean).join(' · ') })}</a>`
      },
      { l: 'Etapa', c: r => App.badgeEtapa(r.etapa) },
      { l: 'Ingreso', c: r => `<div>${U.fecha(r.fechaIngreso)}</div><div class="small faint">${DB.diasEstadia(r)} días</div>` },
      {
        l: 'Brigadas', c: r => {
          const bs = DB.brigadasDe(r);
          return bs.length
            ? bs.map(b => `<span class="badge b-gray" style="margin:1px 2px 1px 0">${U.esc(b)}</span>`).join('')
            : '<span class="faint">—</span>';
        }
      },
      { l: 'Estado', c: r => App.badgeEstadoResidente(r) },
      {
        l: 'Conducta (30 d)', c: r => {
          const f = DB.faltasRecientes(r.id, 30);
          if (!f.length) return '<span class="faint">Sin faltas</span>';
          const grave = f.some(x => x.gravedad !== 'Leve');
          return `<span class="badge ${grave ? 'b-danger' : 'b-warn'}">${f.length} falta${f.length > 1 ? 's' : ''}</span>`;
        }
      },
      {
        l: '', cls: 'actions', c: r => `
        <a class="btn btn-sm" href="#/residente/${r.id}">Ficha</a>
        ${App.accionesFila('residentes', r.id, 'la ficha de ' + r.nombre)}`
      }
    ], filas, {
      vacio: {
        ico: '👥',
        titulo: 'No hay residentes que coincidan',
        texto: 'Cree la primera ficha o ajuste los filtros de búsqueda.',
        accion: `<button class="btn btn-primary" data-action="nuevo-residente">+ Nuevo residente</button>`
      }
    });

    return toolbar + `<div class="card"><div class="card-body tight">${tabla}</div></div>`;
  }
};

/* ============================================================
   Vista: ficha del residente
   ============================================================ */

Vistas['residente'] = {
  nav: 'residentes',
  titulo: p => { const r = DB.residente(p.id); return r ? r.nombre : 'Residente no encontrado'; },
  sub: p => {
    const r = DB.residente(p.id);
    if (!r) return '';
    return `${U.esc(r.etapa || 'Sin etapa')} · Ingreso ${U.fecha(r.fechaIngreso)} · ${DB.diasEstadia(r)} días de permanencia`;
  },
  acciones: p => {
    const r = DB.residente(p.id);
    if (!r) return '';
    return `
      <a class="btn" href="#/reportes/${r.id}">📄 Reporte</a>
      <button class="btn" data-action="editar-residentes" data-id="${r.id}">✏️ Editar</button>
      ${r.estado === 'Egresado'
        ? `<button class="btn" data-action="reingresar" data-id="${r.id}">↩ Reactivar</button>`
        : `<button class="btn" data-action="egresar" data-id="${r.id}">🚪 Registrar egreso</button>`}`;
  },

  render(p) {
    const r = DB.residente(p.id);
    if (!r) return UI.vacio({ ico: '🔍', titulo: 'Residente no encontrado', texto: 'La ficha solicitada no existe o fue eliminada.' });

    const tab = p.sub || 'resumen';
    const tabs = [
      ['resumen', 'Resumen', ''],
      ['conducta', 'Conducta', DB.de('conductas', r.id).length],
      ['salidas', 'Salidas', DB.de('salidas', r.id).length],
      ['llamadas', 'Llamadas', DB.de('llamadas', r.id).length],
      ['tareas', 'Tareas', DB.de('tareas', r.id).length]
    ];

    const cabecera = `
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div class="avatar lg">${U.esc(U.iniciales(r.nombre))}</div>
          <div style="min-width:0;flex:1 1 260px">
            <div style="font-size:17px;font-weight:650">${U.esc(r.nombre)}</div>
            <div class="small muted" style="margin-top:2px">
              ${[r.documento, U.edad(r.fechaNacimiento) ? U.edad(r.fechaNacimiento) + ' años' : '', r.sexo, r.telefono]
                .filter(Boolean).map(U.esc).join(' · ') || 'Sin datos de identificación'}
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
              ${App.badgeEstadoResidente(r)}
              ${App.badgeEtapa(r.etapa)}
              ${DB.brigadasDe(r).map(b => `<span class="badge b-gray">${U.esc(b)}</span>`).join('')}
            </div>
          </div>
          <div class="acciones-rapidas">
            <button class="btn btn-primary btn-sm" data-action="cambiar-etapa" data-id="${r.id}">⬆ Cambiar etapa</button>
            <button class="btn btn-sm" data-action="nueva-conducta" data-rid="${r.id}">⚠️ Falta</button>
            ${DB.salidaAbierta(r.id)
              ? `<button class="btn btn-sm" data-action="registrar-retorno" data-id="${DB.salidaAbierta(r.id).id}">↩ Retorno</button>`
              : `<button class="btn btn-sm" data-action="nueva-salida" data-rid="${r.id}">🚪 Salida</button>`}
            <button class="btn btn-sm" data-action="nueva-llamada" data-rid="${r.id}">📞 Llamada</button>
            <button class="btn btn-sm" data-action="nueva-tarea" data-rid="${r.id}">🧹 Tarea</button>
          </div>
        </div>
      </div>`;

    const barra = `<div class="tabs">${tabs.map(([k, l, n]) =>
      `<a class="tab ${tab === k ? 'active' : ''}" href="#/residente/${r.id}/${k}">${l}${n !== '' ? ` <span class="faint">(${n})</span>` : ''}</a>`
    ).join('')}</div>`;

    let cuerpo;
    if (tab === 'conducta') cuerpo = Conducta.panel(r);
    else if (tab === 'salidas') cuerpo = Salidas.panel(r);
    else if (tab === 'llamadas') cuerpo = Llamadas.panel(r);
    else if (tab === 'tareas') cuerpo = Tareas.panel(r);
    else cuerpo = Residentes.resumen(r);

    return cabecera + barra + cuerpo;
  }
};

/* ---------- pestaña Resumen ---------- */

Residentes.resumen = function (r) {
  const etp = DB.de('etapas', r.id).slice().sort((a, b) => String(b.desde).localeCompare(String(a.desde)));
  const cds = DB.de('conductas', r.id).sort(U.porFechaDesc());
  const sls = DB.de('salidas', r.id).sort(U.porFechaDesc('fechaSalida'));
  const lls = DB.de('llamadas', r.id);
  const trs = DB.de('tareas', r.id);
  const cumplidas = trs.filter(t => t.estado === 'Cumplida').length;

  const ultimas = []
    .concat(etp.slice(0, 6).map(h => ({
      f: h.desde, cls: 'ok', t: 'Pasa a ' + h.etapa,
      d: h.motivo || 'Cambio de etapa registrado.', a: h.registradoPor
    })))
    .concat(cds.slice(0, 4).map(c => ({ f: c.fecha, cls: c.gravedad === 'Leve' ? 'warn' : 'danger', t: `Falta ${c.gravedad}: ${c.tipoFalta}`, d: c.descripcion, a: c.reportadoPor })))
    .concat(sls.slice(0, 3).map(s => ({ f: s.fechaSalida, cls: 'info', t: `Salida: ${s.tipo}`, d: s.observaciones || (s.fechaRetorno ? 'Retornó el ' + U.fecha(s.fechaRetorno) : 'Sin retorno registrado'), a: s.autorizadoPor })))
    .sort((a, b) => String(b.f).localeCompare(String(a.f)))
    .slice(0, 10);

  const ficha = `
    <div class="card">
      <div class="card-head"><h3>Ficha del residente</h3></div>
      <div class="card-body">
        <dl class="kv">
          <dt>Fecha de ingreso</dt><dd>${U.fechaLarga(r.fechaIngreso)}</dd>
          <dt>Permanencia</dt><dd>${DB.diasEstadia(r)} días${r.fechaEgreso ? ' (cerrada)' : ''}</dd>
          <dt>Etapa actual</dt><dd>${App.badgeEtapa(r.etapa)}</dd>
          <dt>Brigadas</dt><dd>${U.esc(DB.brigadasTexto(r)) || '<span class="faint">Sin asignar</span>'}</dd>
          <dt>Sustancia principal</dt><dd>${U.esc(r.sustancia) || '<span class="faint">—</span>'}</dd>
          <dt>Tiempo de consumo</dt><dd>${U.esc(r.tiempoConsumo) || '<span class="faint">—</span>'}</dd>
          <dt>Tratamientos previos</dt><dd>${r.tratamientosPrevios || '0'}</dd>
          <dt>Derivado por</dt><dd>${U.esc(r.derivadoPor) || '<span class="faint">—</span>'}</dd>
          <dt>Previsión</dt><dd>${U.esc(r.prevision) || '<span class="faint">—</span>'}</dd>
          <dt>Domicilio</dt><dd>${U.esc(r.direccion) || '<span class="faint">—</span>'}</dd>
          <dt>Contacto emergencia</dt><dd>${
            r.contactoNombre
              ? U.esc(r.contactoNombre) + (r.contactoParentesco ? ` (${U.esc(r.contactoParentesco)})` : '') +
                (r.contactoTelefono ? ` · ${U.esc(r.contactoTelefono)}` : '')
              : '<span class="faint">Sin registrar</span>'}</dd>
        </dl>
        ${r.diagnostico ? `<div class="section-title">Diagnóstico / motivo de ingreso</div>
          <div class="pre small">${U.nl(r.diagnostico)}</div>` : ''}
        ${r.observaciones ? `<div class="section-title">Observaciones</div>
          <div class="pre small">${U.nl(r.observaciones)}</div>` : ''}
        ${r.estado === 'Egresado' ? `
          <div class="note warn" style="margin-top:18px">
            <b>Egreso:</b> ${U.fecha(r.fechaEgreso)} · ${U.esc(r.tipoEgreso || 'Sin tipo')}<br>
            ${U.nl(r.motivoEgreso || '')}
            ${r.derivacionEgreso ? `<br><b>Derivación:</b> ${U.nl(r.derivacionEgreso)}` : ''}
          </div>` : ''}
      </div>
    </div>`;

  const indicadores = `
    <div class="grid g2" style="margin-bottom:16px">
      ${UI.stat({ ico: '📈', val: etp.length, lab: 'Cambios de etapa', nota: 'En ' + (r.etapa || 'su etapa') + ' desde ' + U.fecha(DB.etapaDesde(r)) })}
      ${UI.stat({ ico: '⚠️', val: cds.length, lab: 'Faltas e incidentes', nota: `${DB.faltasRecientes(r.id, 30).length} en los últimos 30 días` })}
      ${UI.stat({ ico: '🚪', val: sls.length, lab: 'Salidas registradas', nota: `${sls.filter(s => !s.fechaRetorno).length} sin retorno` })}
      ${UI.stat({ ico: '📞', val: U.suma(lls, l => l.cantidad), lab: 'Llamadas realizadas', nota: `en ${U.plural(new Set(lls.map(l => l.fecha)).size, 'día', 'días')}` })}
      ${UI.stat({ ico: '🧹', val: trs.length, lab: 'Tareas asignadas', nota: `${cumplidas} cumplidas` })}
      ${UI.stat({ ico: '📅', val: DB.diasEstadia(r), lab: 'Días en el centro' })}
    </div>`;

  const p = DB.progresoEtapa(r);
  const panelEtapa = r.estado === 'Egresado' ? '' : `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head">
        <div><h3>Progreso de etapa</h3>
          <div class="sub">${p.diasTratamiento} días de tratamiento (${DB.meses(p.diasTratamiento)} meses) · ${p.requerido
            ? `${p.dias} de ${p.requerido} días en la etapa · previsto ${U.fecha(p.fechaPrevista)}`
            : `${p.dias} días en esta etapa · sin plazo definido`}${
            p.modalidad ? ` · ${U.esc(p.modalidad)}` : ''}</div></div>
        <div class="right">
          ${Progreso.badge(p)}
          ${p.desfase > 0
            ? `<button class="btn btn-sm btn-primary" data-action="ajustar-etapa" data-id="${r.id}">⏱️ Actualizar</button>`
            : `<button class="btn btn-sm" data-action="cambiar-etapa" data-id="${r.id}">⬆ Cambiar</button>`}
        </div>
      </div>
      <div class="card-body">
        ${p.desfase > 0 ? `<div class="note warn" style="margin-bottom:14px">
          Lleva <b>${p.diasTratamiento} días</b> de tratamiento: por tiempo le corresponde
          <b>${U.esc(p.corresponde)}</b> y está registrado en <b>${U.esc(r.etapa)}</b>.</div>` : ''}
        ${Progreso.puedeOptar(p) ? `<div class="note" style="margin-bottom:14px">
          Ya cumple el tiempo para optar a <b>${U.esc(p.optativa.etapa)}</b>:
          ${p.optativa.opciones.filter(o => o.disponible).map(o => U.esc(o.v)).join(' o ')}.
          Es una etapa optativa.</div>` : ''}
        ${Progreso.timeline(r)}</div>
    </div>`;

  const cronologia = `
    <div class="card">
      <div class="card-head"><h3>Actividad reciente</h3></div>
      <div class="card-body">
        ${ultimas.length ? `<div class="timeline">${ultimas.map(x => `
          <div class="tl-item ${x.cls}">
            <div class="tl-date">${U.fecha(x.f)} · ${U.esc(x.t)}${x.a ? ' · ' + U.esc(x.a) : ''}</div>
            <div class="tl-body">${U.nl(U.corta(x.d || '', 320))}</div>
          </div>`).join('')}</div>`
          : `<div class="faint small">Sin actividad registrada todavía.</div>`}
      </div>
    </div>`;

  return `<div class="grid g-1-2">
    <div>${ficha}</div>
    <div>${indicadores}${panelEtapa}${cronologia}</div>
  </div>`;
};

/* ---------- acciones ---------- */

Acciones['nuevo-residente'] = () => Residentes.nuevo();
Acciones['editar-residentes'] = d => Residentes.editar(d.id);
Acciones['egresar'] = d => Residentes.egresar(d.id);
Acciones['reingresar'] = d => Residentes.reingresar(d.id);

Acciones['exportar-residentes'] = () => {
  const filas = Residentes.filtrar();
  if (!filas.length) return UI.toast('No hay residentes para exportar.', 'warn');
  const csv = U.csv([
    { l: 'Nombre', v: r => r.nombre },
    { l: 'Documento', v: r => r.documento },
    { l: 'Edad', v: r => U.edad(r.fechaNacimiento) || '' },
    { l: 'Sexo', v: r => r.sexo },
    { l: 'Fecha ingreso', v: r => U.fecha(r.fechaIngreso) },
    { l: 'Días', v: r => DB.diasEstadia(r) },
    { l: 'Etapa', v: r => r.etapa },
    { l: 'Brigadas', v: r => DB.brigadasTexto(r, ' / ') },
    { l: 'Estado', v: r => r.estado === 'Egresado' ? 'Egresado' : (DB.salidaAbierta(r.id) ? 'Fuera del centro' : 'Presente') },
    { l: 'Sustancia', v: r => r.sustancia },
    { l: 'Teléfono', v: r => r.telefono },
    { l: 'Contacto emergencia', v: r => [r.contactoNombre, r.contactoTelefono].filter(Boolean).join(' ') },
    { l: 'Fecha egreso', v: r => U.fecha(r.fechaEgreso) },
    { l: 'Tipo egreso', v: r => r.tipoEgreso }
  ], filas);
  U.descargar(`residentes_${U.hoy()}.csv`, csv, 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
