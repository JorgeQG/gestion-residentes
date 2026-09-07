/* ============================================================
   llamadas.js — registro diario de llamadas telefónicas
   ============================================================ */

const Llamadas = {

  campos(l) {
    return UI.campos([
      { n: 'residenteId', l: 'Residente', t: 'select', w: 12, req: true, opts: App.opcionesResidentes(false) },
      { n: 'fecha', l: 'Fecha', t: 'date', w: 4, req: true, val: U.hoy() },
      { n: 'cantidad', l: 'Cantidad de llamadas', t: 'number', w: 4, req: true, min: 1, max: 50, val: 1 },
      { n: 'duracion', l: 'Duración total (min)', t: 'number', w: 4, min: 0, max: 600 },
      { n: 'destinatarios', l: 'Persona(s) contactada(s)', t: 'text', w: 7, ph: 'Nombre y parentesco' },
      { n: 'hora', l: 'Hora (primera llamada)', t: 'time', w: 5, val: U.ahora() },
      { n: 'autorizadoPor', l: 'Supervisado / autorizado por', t: 'text', w: 12, val: DB.config.responsable },
      { n: 'observaciones', l: 'Observaciones', t: 'textarea', w: 12, rows: 2,
        ph: 'Estado emocional posterior, temas relevantes, incidencias…' }
    ], l || {});
  },

  nueva(rid, fecha) {
    UI.modal({
      title: 'Registrar llamadas',
      sub: rid ? DB.nombreDe(rid) : 'Registro telefónico del día',
      submit: 'Registrar',
      body: Llamadas.campos({ residenteId: rid || '', fecha: fecha || U.hoy() }),
      onSubmit: d => {
        d.cantidad = Number(d.cantidad) || 1;
        const max = Number(DB.config.maxLlamadasDia) || 0;
        const yaHechas = DB.llamadasDelDia(d.residenteId, d.fecha);
        DB.crear('llamadas', d);
        if (max > 0 && yaHechas + d.cantidad > max) {
          UI.toast(`Atención: ${DB.nombreDe(d.residenteId)} acumula ${yaHechas + d.cantidad} llamadas ese día (máximo ${max}).`, 'warn');
        } else {
          UI.toast('Llamadas registradas.');
        }
        App.pintar();
      }
    });
  },

  editar(id) {
    const l = DB.obtener('llamadas', id);
    if (!l) return;
    UI.modal({
      title: 'Editar registro de llamadas',
      sub: DB.nombreDe(l.residenteId) + ' · ' + U.fecha(l.fecha),
      body: Llamadas.campos(l),
      onSubmit: d => {
        d.cantidad = Number(d.cantidad) || 1;
        DB.actualizar('llamadas', id, d);
        UI.toast('Registro actualizado.');
        App.pintar();
      }
    });
  },

  filtrar(base) {
    const q = U.norm(App.f('q'));
    const rid = App.f('residente');
    const desde = App.f('desde'), hasta = App.f('hasta');
    return (base || DB.todos('llamadas')).filter(l => {
      if (rid && l.residenteId !== rid) return false;
      if (!U.enRango(l.fecha, desde, hasta)) return false;
      if (q) {
        const blob = U.norm([DB.nombreDe(l.residenteId), l.destinatarios, l.observaciones, l.autorizadoPor].join(' '));
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort(U.porFechaDesc());
  },

  tabla(filas, opts) {
    opts = opts || {};
    const max = Number(DB.config.maxLlamadasDia) || 0;
    const cols = [
      { l: 'Fecha', cls: 'nowrap', c: l => `<div>${U.fecha(l.fecha)}</div><div class="small faint">${U.esc(l.hora || '')}</div>` }
    ];
    if (!opts.sinResidente) cols.push({ l: 'Residente', c: l => App.enlaceResidente(l.residenteId) });
    cols.push(
      {
        l: 'Llamadas', cls: 'nowrap', c: l => {
          const total = DB.llamadasDelDia(l.residenteId, l.fecha);
          const excede = max > 0 && total > max;
          return `<span class="badge ${excede ? 'b-danger' : 'b-info'}">${l.cantidad || 1}</span>` +
            (excede ? `<div class="small" style="color:var(--danger)">${total} ese día</div>` : '');
        }
      },
      { l: 'Duración', cls: 'nowrap', c: l => l.duracion ? l.duracion + ' min' : '<span class="faint">—</span>' },
      { l: 'Contactó a', c: l => U.esc(l.destinatarios) || '<span class="faint">No registrado</span>' },
      { l: 'Observaciones', c: l => U.esc(U.corta(l.observaciones, 90)) || '<span class="faint">—</span>' },
      { l: 'Supervisó', c: l => U.esc(l.autorizadoPor) || '<span class="faint">—</span>' },
      { l: '', cls: 'actions', c: l => App.accionesFila('llamadas', l.id, 'el registro del ' + U.fecha(l.fecha)) }
    );
    return UI.tabla(cols, filas, {
      vacio: {
        ico: '📞', titulo: 'Sin llamadas registradas',
        texto: 'Registre la cantidad de llamadas que realiza cada residente por día.',
        accion: `<button class="btn btn-primary" data-action="nueva-llamada" ${opts.rid ? `data-rid="${opts.rid}"` : ''}>+ Registrar llamadas</button>`
      }
    });
  },

  /** Resumen del día: cuántas llamadas lleva cada residente activo hoy. */
  resumenDia(fecha) {
    return DB.activos().map(r => ({
      r,
      total: DB.llamadasDelDia(r.id, fecha)
    })).sort((a, b) => b.total - a.total || a.r.nombre.localeCompare(b.r.nombre));
  },

  panel(r) {
    const filas = DB.de('llamadas', r.id).sort(U.porFechaDesc());
    const total = U.suma(filas, l => l.cantidad);
    const dias = new Set(filas.map(l => l.fecha)).size;
    const hoy = DB.llamadasDelDia(r.id, U.hoy());
    const max = Number(DB.config.maxLlamadasDia) || 0;
    return `
      <div class="grid g3" style="margin-bottom:16px">
        ${UI.stat({ ico: '📞', val: total, lab: 'Llamadas acumuladas' })}
        ${UI.stat({ ico: '📅', val: dias, lab: 'Días con llamadas', nota: dias ? `Promedio ${(total / dias).toFixed(1)} por día` : '' })}
        ${UI.stat({ ico: '☎️', val: hoy, lab: 'Llamadas hoy', nota: max ? `Máximo permitido: ${max}` : '' })}
      </div>
      <div class="card">
        <div class="card-head">
          <div><h3>Registro de llamadas</h3><div class="sub">Cantidad de llamadas realizadas por día</div></div>
          <div class="right">
            <button class="btn btn-primary btn-sm" data-action="nueva-llamada" data-rid="${r.id}">+ Registrar llamadas</button>
          </div>
        </div>
        <div class="card-body tight">${Llamadas.tabla(filas, { sinResidente: true, rid: r.id })}</div>
      </div>`;
  }
};

Vistas['llamadas'] = {
  titulo: 'Registro de llamadas',
  sub: () => {
    const t = DB.todos('llamadas');
    const hoy = U.suma(t.filter(l => l.fecha === U.hoy()), l => l.cantidad);
    return `${U.suma(t, l => l.cantidad)} llamadas acumuladas · ${hoy} registradas hoy`;
  },
  acciones: () => `
    <button class="btn" data-action="exportar-llamadas">⬇ Exportar CSV</button>
    <button class="btn btn-primary" data-action="nueva-llamada">+ Registrar llamadas</button>`,

  render() {
    const filas = Llamadas.filtrar();
    const fechaPanel = App.f('dia', U.hoy());
    const resumen = Llamadas.resumenDia(fechaPanel);
    const max = Number(DB.config.maxLlamadasDia) || 0;

    const panelDia = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head">
          <div><h3>Control diario</h3><div class="sub">Llamadas por residente en la fecha seleccionada</div></div>
          <div class="right">
            <input type="date" data-filtro="dia" value="${U.esc(fechaPanel)}">
          </div>
        </div>
        <div class="card-body tight">
          ${resumen.length ? UI.tabla([
            { l: 'Residente', c: x => App.enlaceResidente(x.r.id) },
            { l: 'Etapa', c: x => App.badgeEtapa(x.r.etapa) },
            {
              l: 'Llamadas', cls: 'nowrap', c: x => {
                const excede = max > 0 && x.total > max;
                return `<span class="badge ${x.total === 0 ? 'b-gray' : excede ? 'b-danger' : 'b-ok'}">${x.total}${max ? ' / ' + max : ''}</span>`;
              }
            },
            {
              l: '', cls: 'actions',
              c: x => `<button class="btn btn-sm" data-action="nueva-llamada" data-rid="${x.r.id}" data-fecha="${U.esc(fechaPanel)}">+ Registrar</button>`
            }
          ], resumen) : UI.vacio({ ico: '👥', titulo: 'No hay residentes activos', texto: 'Cree fichas de residentes para llevar el control de llamadas.' })}
        </div>
      </div>`;

    const toolbar = App.toolbar([
      App.buscador('Buscar por residente o contacto…'),
      App.selectFiltro('residente', 'Todos los residentes', App.opcionesResidentes(true)),
      `<input type="date" data-filtro="desde" value="${U.esc(App.f('desde'))}" title="Desde">`,
      `<input type="date" data-filtro="hasta" value="${U.esc(App.f('hasta'))}" title="Hasta">`,
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filas.length, 'registro', 'registros')} · ${U.suma(filas, l => l.cantidad)} llamadas</div>`
    ]);

    return panelDia + toolbar + `<div class="card"><div class="card-body tight">${Llamadas.tabla(filas)}</div></div>`;
  }
};

Acciones['nueva-llamada'] = d => Llamadas.nueva(d.rid, d.fecha);
Acciones['editar-llamadas'] = d => Llamadas.editar(d.id);

Acciones['exportar-llamadas'] = () => {
  const filas = Llamadas.filtrar();
  if (!filas.length) return UI.toast('No hay registros para exportar.', 'warn');
  U.descargar(`llamadas_${U.hoy()}.csv`, U.csv([
    { l: 'Fecha', v: l => U.fecha(l.fecha) },
    { l: 'Residente', v: l => DB.nombreDe(l.residenteId) },
    { l: 'Cantidad', v: l => l.cantidad },
    { l: 'Duración (min)', v: l => l.duracion },
    { l: 'Contactó a', v: l => l.destinatarios },
    { l: 'Supervisó', v: l => l.autorizadoPor },
    { l: 'Observaciones', v: l => l.observaciones }
  ], filas), 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
