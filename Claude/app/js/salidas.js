/* ============================================================
   salidas.js — registro de salidas del centro y retornos
   ============================================================ */

const Salidas = {

  CONDICIONES: [
    'Normal / sin novedad',
    'Con signos de consumo',
    'Con problemas de salud',
    'Retorno fuera de horario',
    'Otra situación'
  ],

  campos(s) {
    return UI.campos([
      { n: 'residenteId', l: 'Residente', t: 'select', w: 12, req: true, opts: App.opcionesResidentes(false) },
      { n: 'tipo', l: 'Motivo de la salida', t: 'select', w: 6, req: true, opts: DB.TIPOS_SALIDA },
      { n: 'destino', l: 'Destino', t: 'text', w: 6, ph: 'Domicilio familiar, hospital, juzgado…' },
      { n: 'fechaSalida', l: 'Fecha de salida', t: 'date', w: 3, req: true, val: U.hoy() },
      { n: 'horaSalida', l: 'Hora de salida', t: 'time', w: 3, val: U.ahora() },
      { n: 'fechaRetornoPrev', l: 'Fecha prevista de retorno', t: 'date', w: 3, req: true, val: U.hoy() },
      { n: 'horaRetornoPrev', l: 'Hora prevista', t: 'time', w: 3 },
      { n: 'acompanante', l: 'Sale acompañado por', t: 'text', w: 6, ph: 'Nombre y parentesco' },
      { n: 'autorizadoPor', l: 'Autorizado por', t: 'text', w: 6, val: DB.config.responsable },
      { n: 'observaciones', l: 'Observaciones e indicaciones', t: 'textarea', w: 12, rows: 2 }
    ], s || {});
  },

  nueva(rid) {
    if (rid && DB.salidaAbierta(rid)) {
      return UI.toast('Este residente ya tiene una salida sin retorno registrado.', 'warn');
    }
    UI.modal({
      title: 'Registrar salida',
      sub: rid ? DB.nombreDe(rid) : 'Salida del centro',
      size: 'wide',
      submit: 'Registrar salida',
      body: Salidas.campos({ residenteId: rid || '' }),
      onSubmit: d => {
        if (DB.salidaAbierta(d.residenteId)) {
          UI.toast('Ese residente ya está registrado fuera del centro.', 'err');
          return false;
        }
        if (d.fechaRetornoPrev && d.fechaRetornoPrev < d.fechaSalida) {
          UI.toast('La fecha prevista de retorno no puede ser anterior a la salida.', 'err');
          return false;
        }
        DB.crear('salidas', d);
        UI.toast('Salida registrada.');
        App.pintar();
      }
    });
  },

  editar(id) {
    const s = DB.obtener('salidas', id);
    if (!s) return;
    UI.modal({
      title: 'Editar salida',
      sub: DB.nombreDe(s.residenteId),
      size: 'wide',
      body: Salidas.campos(s),
      onSubmit: d => {
        DB.actualizar('salidas', id, d);
        UI.toast('Salida actualizada.');
        App.pintar();
      }
    });
  },

  registrarRetorno(id) {
    const s = DB.obtener('salidas', id);
    if (!s) return;
    UI.modal({
      title: 'Registrar retorno al centro',
      sub: `${DB.nombreDe(s.residenteId)} · salió el ${U.fechaHora(s.fechaSalida, s.horaSalida)}`,
      submit: 'Registrar retorno',
      body: UI.campos([
        { n: 'fechaRetorno', l: 'Fecha de retorno', t: 'date', w: 6, req: true, val: U.hoy() },
        { n: 'horaRetorno', l: 'Hora de retorno', t: 'time', w: 6, val: U.ahora() },
        { n: 'condicionRetorno', l: 'Condición en que retorna', t: 'select', w: 12, req: true, opts: Salidas.CONDICIONES, val: Salidas.CONDICIONES[0] },
        { n: 'recibidoPor', l: 'Recibido por', t: 'text', w: 12, val: DB.config.responsable },
        { n: 'observacionesRetorno', l: 'Observaciones del retorno', t: 'textarea', w: 12, rows: 3 }
      ], s),
      onSubmit: d => {
        if (d.fechaRetorno < s.fechaSalida) {
          UI.toast('El retorno no puede ser anterior a la salida.', 'err');
          return false;
        }
        DB.actualizar('salidas', id, d);
        UI.toast('Retorno registrado.');
        if (d.condicionRetorno === 'Con signos de consumo') {
          UI.toast('Considere registrar el hecho en el módulo de Conducta.', 'warn');
        }
        App.pintar();
      }
    });
  },

  filtrar(base) {
    const q = U.norm(App.f('q'));
    const rid = App.f('residente'), tipo = App.f('tipo'), est = App.f('estadoSalida');
    const desde = App.f('desde'), hasta = App.f('hasta');
    return (base || DB.todos('salidas')).filter(s => {
      if (rid && s.residenteId !== rid) return false;
      if (tipo && s.tipo !== tipo) return false;
      if (est === 'fuera' && s.fechaRetorno) return false;
      if (est === 'retornados' && !s.fechaRetorno) return false;
      if (est === 'atrasados' && !DB.retornoAtrasado(s)) return false;
      if (!U.enRango(s.fechaSalida, desde, hasta)) return false;
      if (q) {
        const blob = U.norm([DB.nombreDe(s.residenteId), s.tipo, s.destino, s.acompanante, s.observaciones, s.autorizadoPor].join(' '));
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort(U.porFechaDesc('fechaSalida'));
  },

  badgeEstado(s) {
    const e = DB.estadoSalida(s);
    const cls = { 'Retornado': 'b-ok', 'Fuera del centro': 'b-warn', 'Atrasado': 'b-danger' }[e];
    return `<span class="badge ${cls}">${e}</span>`;
  },

  duracion(s) {
    if (!s.fechaRetorno) return '—';
    const d = U.dias(s.fechaSalida, s.fechaRetorno);
    return d === 0 ? 'Mismo día' : U.plural(d, 'día', 'días');
  },

  tabla(filas, opts) {
    opts = opts || {};
    const cols = [
      { l: 'Salida', cls: 'nowrap', c: s => `<div>${U.fecha(s.fechaSalida)}</div><div class="small faint">${U.esc(s.horaSalida || '')}</div>` }
    ];
    if (!opts.sinResidente) cols.push({ l: 'Residente', c: s => App.enlaceResidente(s.residenteId) });
    cols.push(
      { l: 'Motivo', c: s => `<div>${U.esc(s.tipo)}</div>${s.destino ? `<div class="small faint">${U.esc(s.destino)}</div>` : ''}` },
      {
        l: 'Retorno previsto', cls: 'nowrap',
        c: s => `<div>${U.fecha(s.fechaRetornoPrev)}</div><div class="small faint">${U.esc(s.horaRetornoPrev || '')}</div>`
      },
      {
        l: 'Retorno real', cls: 'nowrap',
        c: s => s.fechaRetorno
          ? `<div>${U.fecha(s.fechaRetorno)}</div><div class="small faint">${U.esc(s.horaRetorno || '')}</div>`
          : '<span class="faint">Pendiente</span>'
      },
      { l: 'Duración', cls: 'nowrap', c: s => Salidas.duracion(s) },
      {
        l: 'Estado', cls: 'nowrap', c: s => Salidas.badgeEstado(s) +
          (s.condicionRetorno && s.condicionRetorno !== Salidas.CONDICIONES[0]
            ? `<div class="small" style="color:var(--danger)">${U.esc(s.condicionRetorno)}</div>` : '')
      },
      {
        l: '', cls: 'actions', c: s =>
          (!s.fechaRetorno
            ? `<button class="btn btn-sm btn-primary" data-action="registrar-retorno" data-id="${s.id}">↩ Retorno</button> `
            : '') + App.accionesFila('salidas', s.id, 'la salida del ' + U.fecha(s.fechaSalida))
      }
    );
    return UI.tabla(cols, filas, {
      vacio: {
        ico: '🚪', titulo: 'Sin salidas registradas',
        texto: 'Registre aquí cada salida del centro y su correspondiente retorno.',
        accion: `<button class="btn btn-primary" data-action="nueva-salida" ${opts.rid ? `data-rid="${opts.rid}"` : ''}>+ Registrar salida</button>`
      }
    });
  },

  panel(r) {
    const filas = DB.de('salidas', r.id).sort(U.porFechaDesc('fechaSalida'));
    const abierta = DB.salidaAbierta(r.id);
    return `
      ${abierta ? `<div class="note ${DB.retornoAtrasado(abierta) ? 'danger' : 'warn'}" style="margin-bottom:16px">
        <b>${DB.retornoAtrasado(abierta) ? 'Retorno atrasado.' : 'Actualmente fuera del centro.'}</b>
        Salió el ${U.fechaHora(abierta.fechaSalida, abierta.horaSalida)} por "${U.esc(abierta.tipo)}".
        Retorno previsto: ${U.fechaHora(abierta.fechaRetornoPrev, abierta.horaRetornoPrev)}.
        <button class="btn btn-sm btn-primary" style="margin-left:8px" data-action="registrar-retorno" data-id="${abierta.id}">Registrar retorno</button>
      </div>` : ''}
      <div class="card">
        <div class="card-head">
          <div><h3>Salidas y retornos</h3><div class="sub">Control de permisos y reingresos al centro</div></div>
          <div class="right">
            ${!abierta ? `<button class="btn btn-primary btn-sm" data-action="nueva-salida" data-rid="${r.id}">+ Registrar salida</button>` : ''}
          </div>
        </div>
        <div class="card-body tight">${Salidas.tabla(filas, { sinResidente: true, rid: r.id })}</div>
      </div>`;
  }
};

Vistas['salidas'] = {
  titulo: 'Salidas y retornos',
  sub: () => {
    const fuera = DB.salidasAbiertas();
    const atrasados = fuera.filter(s => DB.retornoAtrasado(s)).length;
    return `${DB.todos('salidas').length} salidas registradas · ${fuera.length} fuera del centro ahora · ${atrasados} con retorno atrasado`;
  },
  acciones: () => `
    <button class="btn" data-action="exportar-salidas">⬇ Exportar CSV</button>
    <button class="btn btn-primary" data-action="nueva-salida">+ Registrar salida</button>`,

  render() {
    const filas = Salidas.filtrar();
    const fuera = DB.salidasAbiertas().sort((a, b) => String(a.fechaRetornoPrev).localeCompare(String(b.fechaRetornoPrev)));

    const panelFuera = fuera.length ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <div><h3>Fuera del centro en este momento</h3>
          <div class="sub">Residentes con salida vigente sin retorno registrado</div></div>
          <div class="right"><span class="badge b-warn">${fuera.length}</span></div>
        </div>
        <div class="card-body tight">${UI.tabla([
          { l: 'Residente', c: s => App.enlaceResidente(s.residenteId) },
          { l: 'Motivo', c: s => U.esc(s.tipo) },
          { l: 'Salió', cls: 'nowrap', c: s => U.fechaHora(s.fechaSalida, s.horaSalida) },
          { l: 'Retorno previsto', cls: 'nowrap', c: s => U.fechaHora(s.fechaRetornoPrev, s.horaRetornoPrev) },
          { l: 'Estado', cls: 'nowrap', c: s => Salidas.badgeEstado(s) },
          { l: '', cls: 'actions', c: s => `<button class="btn btn-sm btn-primary" data-action="registrar-retorno" data-id="${s.id}">↩ Registrar retorno</button>` }
        ], fuera)}</div>
      </div>` : '';

    const toolbar = App.toolbar([
      App.buscador('Buscar por residente, destino…'),
      App.selectFiltro('residente', 'Todos los residentes', App.opcionesResidentes(true)),
      App.selectFiltro('tipo', 'Todos los motivos', DB.TIPOS_SALIDA),
      App.selectFiltro('estadoSalida', 'Todos los estados', [
        { v: 'fuera', l: 'Sin retorno' },
        { v: 'atrasados', l: 'Retorno atrasado' },
        { v: 'retornados', l: 'Retornados' }
      ]),
      `<input type="date" data-filtro="desde" value="${U.esc(App.f('desde'))}" title="Desde">`,
      `<input type="date" data-filtro="hasta" value="${U.esc(App.f('hasta'))}" title="Hasta">`,
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filas.length, 'salida', 'salidas')}</div>`
    ]);

    return panelFuera + toolbar + `<div class="card"><div class="card-body tight">${Salidas.tabla(filas)}</div></div>`;
  }
};

Acciones['nueva-salida'] = d => Salidas.nueva(d.rid);
Acciones['editar-salidas'] = d => Salidas.editar(d.id);
Acciones['registrar-retorno'] = d => Salidas.registrarRetorno(d.id);

Acciones['exportar-salidas'] = () => {
  const filas = Salidas.filtrar();
  if (!filas.length) return UI.toast('No hay salidas para exportar.', 'warn');
  U.descargar(`salidas_${U.hoy()}.csv`, U.csv([
    { l: 'Residente', v: s => DB.nombreDe(s.residenteId) },
    { l: 'Motivo', v: s => s.tipo },
    { l: 'Destino', v: s => s.destino },
    { l: 'Fecha salida', v: s => U.fecha(s.fechaSalida) },
    { l: 'Hora salida', v: s => s.horaSalida },
    { l: 'Retorno previsto', v: s => U.fecha(s.fechaRetornoPrev) },
    { l: 'Fecha retorno', v: s => U.fecha(s.fechaRetorno) },
    { l: 'Hora retorno', v: s => s.horaRetorno },
    { l: 'Duración', v: s => Salidas.duracion(s) },
    { l: 'Estado', v: s => DB.estadoSalida(s) },
    { l: 'Condición retorno', v: s => s.condicionRetorno },
    { l: 'Autorizado por', v: s => s.autorizadoPor },
    { l: 'Observaciones', v: s => s.observaciones }
  ], filas), 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
