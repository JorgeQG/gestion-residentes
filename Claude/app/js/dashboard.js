/* ============================================================
   dashboard.js — panel general del centro
   ============================================================ */

const Dashboard = {

  indicadores() {
    const hoy = U.hoy();
    const d7 = U.sumaDias(hoy, -7);
    const d30 = U.sumaDias(hoy, -30);
    const [mesIni, mesFin] = U.mesDe(U.mesActual());

    const activos = DB.activos();
    const presentes = DB.presentes();
    const fuera = DB.fueraDelCentro();
    const egresados = DB.egresados();

    const ingresos30 = activos.filter(r => r.fechaIngreso >= d30);
    const ingresos7 = activos.filter(r => r.fechaIngreso >= d7);
    const egresosMes = egresados.filter(r => U.enRango(r.fechaEgreso, mesIni, mesFin));

    const progresos = activos.map(r => DB.progresoEtapa(r));
    const etapaLista = progresos.filter(p => p.desfase > 0 || p.estado === 'cumplido');
    const etapaDesfasada = progresos.filter(p => p.desfase > 0);
    const etapaProxima = progresos.filter(p => p.estado === 'proximo');
    const faltas7 = DB.todos('conductas').filter(c => c.fecha >= d7);
    const faltasGraves7 = faltas7.filter(c => c.gravedad !== 'Leve');
    const llamadasHoy = U.suma(DB.todos('llamadas').filter(l => l.fecha === hoy), l => l.cantidad);
    const tareasHoy = DB.todos('tareas').filter(t => t.fecha === hoy);
    const tareasPend = DB.todos('tareas').filter(t => t.estado === 'Pendiente');

    const permanencias = activos.map(r => DB.diasEstadia(r));
    const permanenciaProm = permanencias.length
      ? Math.round(U.suma(permanencias) / permanencias.length) : 0;

    const altas = egresados.filter(r => r.tipoEgreso === 'Alta terapéutica').length;
    const tasaAlta = egresados.length ? Math.round(altas / egresados.length * 100) : null;

    const cumplimiento = Tareas.cumplimiento(DB.todos('tareas'));

    const atrasados = DB.salidasAbiertas().filter(s => DB.retornoAtrasado(s));

    return {
      hoy, d7, d30, activos, presentes, fuera, egresados, ingresos30, ingresos7,
      egresosMes, etapaLista, etapaDesfasada, etapaProxima, faltas7, faltasGraves7, llamadasHoy, tareasHoy, tareasPend,
      permanenciaProm, tasaAlta, altas, cumplimiento, atrasados
    };
  }
};

/* El indicador de alertas lleva al panel de detalle, que está en esta misma
   pantalla: se desplaza hasta él y se resalta un instante. */
Acciones['ir-alertas'] = () => {
  const ir = () => {
    const el = document.getElementById('panel-alertas');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.transition = 'box-shadow .3s';
    el.style.boxShadow = '0 0 0 3px var(--primary-soft), 0 0 0 4px var(--primary)';
    setTimeout(() => { el.style.boxShadow = ''; }, 1600);
  };
  if (App.rutaActual !== 'dashboard') { App.ir('dashboard'); setTimeout(ir, 60); }
  else ir();
};

Vistas['dashboard'] = {
  titulo: 'Dashboard',
  sub: () => {
    const d = new Date();
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return `${dias[d.getDay()]}, ${U.fechaLarga(U.hoy())} · ${U.esc(DB.config.centro)}`;
  },
  acciones: () => `
    <a class="btn" href="#/evoluciones">📈 Etapas</a>
    <button class="btn" data-action="nueva-conducta">⚠️ Falta</button>
    <button class="btn btn-primary" data-action="nuevo-residente">+ Nuevo residente</button>`,

  render() {
    const k = Dashboard.indicadores();
    const alertas = Alertas.pendientes();
    const atendidas = Alertas.atendidas().length;

    /* --- Indicadores principales ---
       Cada uno abre su sección con el filtro ya aplicado. */
    const fila1 = `<div class="grid g4" style="margin-bottom:16px">
      ${UI.stat({
        ico: '👥', val: k.activos.length, lab: 'Residentes activos',
        nota: `${k.egresados.length} egresados históricos`,
        href: '#/residentes?estado=activos',
        titulo: 'Ver el listado de residentes activos'
      })}
      ${UI.stat({
        ico: '🏠', val: k.presentes.length, lab: 'Presentes en el centro',
        nota: k.fuera.length ? `${k.fuera.length} fuera con permiso` : 'Todos presentes',
        href: '#/residentes?estado=presentes',
        titulo: 'Ver quiénes están en el centro'
      })}
      ${UI.stat({
        ico: '🆕', val: k.ingresos30.length, lab: 'Ingresos (30 días)',
        nota: `${k.ingresos7.length} en la última semana`,
        color: 'var(--info-soft)',
        href: '#/residentes?estado=ingresos30',
        titulo: 'Ver los ingresos de los últimos 30 días'
      })}
      ${UI.stat({
        ico: '⚠️', val: alertas.length, lab: 'Alertas pendientes',
        nota: atendidas ? `${atendidas} ya atendidas` :
          (k.faltasGraves7.length ? `${k.faltasGraves7.length} faltas graves esta semana` : 'Sin faltas graves esta semana'),
        color: alertas.length ? 'var(--danger-soft)' : 'var(--ok-soft)',
        accion: 'ir-alertas',
        titulo: 'Ir al detalle de las alertas'
      })}
    </div>`;

    /* --- Indicadores secundarios --- */
    const fila2 = `<div class="grid g4" style="margin-bottom:16px">
      ${UI.stat({
        ico: '📈', val: k.etapaLista.length, lab: 'Etapas por evaluar',
        nota: k.etapaDesfasada.length
          ? `${k.etapaDesfasada.length} por actualizar según su tiempo`
          : `${k.etapaProxima.length} próximos a progresar`,
        color: k.etapaDesfasada.length ? 'var(--warn-soft)' : '',
        href: k.etapaDesfasada.length ? '#/evoluciones?estadoEtapa=desfasado' : '#/evoluciones',
        titulo: 'Ver el progreso de etapa de los residentes'
      })}
      ${UI.stat({
        ico: '📞', val: k.llamadasHoy, lab: 'Llamadas hoy',
        href: `#/llamadas?desde=${k.hoy}&hasta=${k.hoy}&dia=${k.hoy}`,
        titulo: 'Ver el registro de llamadas de hoy'
      })}
      ${UI.stat({
        ico: '🧹', val: k.tareasPend.length, lab: 'Tareas pendientes',
        nota: `${k.tareasHoy.length} asignadas para hoy`,
        href: '#/tareas?estado=Pendiente',
        titulo: 'Ver las tareas pendientes de evaluar'
      })}
      ${UI.stat({
        ico: '🚪', val: k.egresosMes.length, lab: 'Egresos del mes',
        nota: U.nombreMes(U.mesActual()),
        href: '#/residentes?estado=egresosMes',
        titulo: 'Ver los egresos de este mes'
      })}
    </div>`;

    /* --- Alertas --- */
    const panelAlertas = `
      <div class="card" id="panel-alertas">
        <div class="card-head">
          <div><h3>Alertas y situaciones a revisar</h3>
            <div class="sub">Se ocultan al pulsar «Ver»; reaparecen si la situación empeora</div></div>
          <div class="right">
            ${atendidas ? `<button class="btn btn-sm btn-ghost" data-action="restaurar-alertas"
              title="Volver a mostrar las alertas ya atendidas">↺ ${atendidas} atendida(s)</button>` : ''}
            ${alertas.length ? `<span class="badge b-danger">${alertas.length}</span>` : `<span class="badge b-ok">Al día</span>`}
          </div>
        </div>
        <div class="card-body tight">${Alertas.render(alertas, { limite: 8 })}</div>
      </div>`;

    /* --- Distribuciones --- */
    const porEtapa = DB.ETAPAS
      .map(e => ({
        l: e, v: k.activos.filter(r => r.etapa === e).length,
        href: `#/residentes?estado=activos&etapa=${encodeURIComponent(e)}`
      }))
      .filter(x => x.v > 0);
    const porBrigada = DB.config.brigadas
      .map(b => ({
        l: b, v: k.activos.filter(r => DB.brigadasDe(r).includes(b)).length,
        href: `#/residentes?estado=activos&brigada=${encodeURIComponent(b)}`
      }))
      .filter(x => x.v > 0);
    const sinBrigada = k.activos.filter(r => !DB.brigadasDe(r).length).length;

    const panelEtapas = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Residentes por etapa</h3></div>
        <div class="card-body">${UI.barras(porEtapa)}</div>
      </div>`;

    const panelBrigadas = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Distribución por brigada</h3>
          ${sinBrigada ? `<div class="right small faint">${sinBrigada} sin asignar</div>` : ''}</div>
        <div class="card-body">${UI.barras(porBrigada)}</div>
      </div>`;

    /* --- Indicadores generales --- */
    const panelIndicadores = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Indicadores generales</h3></div>
        <div class="card-body">
          <dl class="kv">
            <dt>Permanencia promedio</dt><dd>${k.permanenciaProm} días (residentes activos)</dd>
            <dt>Cumplimiento de tareas</dt><dd>${k.cumplimiento === null ? '<span class="faint">Sin datos</span>' : k.cumplimiento + ' %'}</dd>
            <dt>Altas terapéuticas</dt><dd>${k.tasaAlta === null ? '<span class="faint">Sin egresos</span>' : `${k.altas} de ${k.egresados.length} egresos (${k.tasaAlta} %)`}</dd>
            <dt>Faltas últimos 7 días</dt><dd>${k.faltas7.length} (${k.faltasGraves7.length} graves o gravísimas)</dd>
            <dt>Fuera del centro ahora</dt><dd>${k.fuera.length}${k.atrasados.length ? ` · <span style="color:var(--danger)">${k.atrasados.length} con retorno atrasado</span>` : ''}</dd>
            <dt>Total histórico</dt><dd>${DB.todos('residentes').length} residentes registrados</dd>
          </dl>
        </div>
      </div>`;

    /* --- Fuera del centro --- */
    const fuera = DB.salidasAbiertas();
    const panelFuera = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><h3>Fuera del centro</h3>
          <div class="right"><a class="btn btn-sm" href="#/salidas">Ver todas</a></div></div>
        <div class="card-body tight">
          ${fuera.length ? UI.tabla([
            { l: 'Residente', c: s => App.enlaceResidente(s.residenteId) },
            { l: 'Motivo', c: s => U.esc(s.tipo) },
            { l: 'Retorno previsto', cls: 'nowrap', c: s => U.fechaHora(s.fechaRetornoPrev, s.horaRetornoPrev) },
            { l: '', cls: 'actions', c: s => Salidas.badgeEstado(s) }
          ], fuera) : `<div class="empty" style="padding:26px"><div class="big">🏠</div>
              <div style="font-weight:600;color:var(--text-soft)">Todos los residentes están en el centro</div></div>`}
        </div>
      </div>`;

    /* --- Ingresos recientes --- */
    const recientes = k.ingresos30.slice().sort((a, b) => String(b.fechaIngreso).localeCompare(String(a.fechaIngreso))).slice(0, 6);
    const panelIngresos = `
      <div class="card">
        <div class="card-head"><h3>Nuevos ingresos</h3>
          <div class="sub">Últimos 30 días</div>
          <div class="right"><a class="btn btn-sm" href="#/residentes">Ver residentes</a></div></div>
        <div class="card-body tight">
          ${recientes.length ? UI.tabla([
            { l: 'Residente', c: r => `<a href="#/residente/${r.id}" style="color:inherit;text-decoration:none">${UI.persona(r, { meta: r.sustancia || '' })}</a>` },
            { l: 'Ingreso', cls: 'nowrap', c: r => `${U.fecha(r.fechaIngreso)}<div class="small faint">hace ${DB.diasEstadia(r)} días</div>` },
            { l: 'Etapa', c: r => App.badgeEtapa(r.etapa) },
            { l: '', cls: 'actions', c: r => App.badgeEstadoResidente(r) }
          ], recientes) : `<div class="empty" style="padding:26px"><div class="big">🆕</div>
              <div style="font-weight:600;color:var(--text-soft)">Sin ingresos en los últimos 30 días</div></div>`}
        </div>
      </div>`;

    const bienvenida = DB.todos('residentes').length ? '' : `
      <div class="note" style="margin-bottom:16px">
        <b>Bienvenido.</b> Aún no hay residentes registrados. Comience creando la primera ficha
        desde <a href="#/residentes">Residentes</a>, o cargue datos de ejemplo desde
        <a href="#/configuracion">Configuración</a> para explorar el sistema.
      </div>`;

    return bienvenida + fila1 + fila2 + `
      <div class="grid g-2-1">
        <div>${panelAlertas}<div style="height:16px"></div>${panelFuera}${panelIngresos}</div>
        <div>${panelIndicadores}${panelEtapas}${panelBrigadas}</div>
      </div>`;
  }
};
