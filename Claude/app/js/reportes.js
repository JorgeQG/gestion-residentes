/* ============================================================
   reportes.js — informes semanales, mensuales, de egreso y generales
   ============================================================ */

const Reportes = {

  conclusiones: '',

  TIPOS: [
    { v: 'semanal', l: 'Informe semanal (por residente)' },
    { v: 'mensual', l: 'Informe mensual (por residente)' },
    { v: 'egreso', l: 'Informe de egreso (por residente)' },
    { v: 'general', l: 'Informe general del centro' }
  ],

  PERIODOS: [
    { v: 'actual', l: 'Período actual' },
    { v: 'anterior', l: 'Período anterior' },
    { v: 'personalizado', l: 'Rango personalizado' }
  ],

  /** Calcula [desde, hasta] según tipo y preset elegido. */
  rango(tipo, preset, r) {
    const hoy = U.hoy();
    if (tipo === 'egreso' && r) {
      return [r.fechaIngreso || hoy, r.fechaEgreso || hoy];
    }
    if (preset === 'personalizado') {
      return [App.f('repDesde') || U.sumaDias(hoy, -30), App.f('repHasta') || hoy];
    }
    if (tipo === 'mensual' || tipo === 'general') {
      const ym = preset === 'anterior'
        ? (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })()
        : U.mesActual();
      return U.mesDe(ym);
    }
    // semanal
    const base = preset === 'anterior' ? U.sumaDias(hoy, -7) : hoy;
    return U.semanaDe(base);
  },

  datos(rid, desde, hasta) {
    const enR = f => U.enRango(f, desde, hasta);
    return {
      etapas: DB.de('etapas', rid).filter(h => enR(h.desde)).sort((a, b) => String(a.desde).localeCompare(String(b.desde))),
      conductas: DB.de('conductas', rid).filter(c => enR(c.fecha)).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      salidas: DB.de('salidas', rid).filter(s => enR(s.fechaSalida)).sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida)),
      llamadas: DB.de('llamadas', rid).filter(l => enR(l.fecha)).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      tareas: DB.de('tareas', rid).filter(t => enR(t.fecha)).sort((a, b) => a.fecha.localeCompare(b.fecha))
    };
  },

  /* ---------- piezas comunes ---------- */

  encabezado(titulo, subtitulo) {
    return `<div class="rep-head">
      <div class="rep-ident">
        <img class="rep-logo" src="${LOGO}" alt="">
        <div style="min-width:0">
          <div class="center-name">${U.esc(DB.config.centro)}</div>
          <h2>${U.esc(titulo)}</h2>
          <div class="small muted">${U.esc(subtitulo)}</div>
        </div>
      </div>
      <div class="small muted right">
        Emitido el ${U.fechaLarga(U.hoy())}<br>
        ${DB.config.responsable ? U.esc(DB.config.responsable) : ''}
      </div>
    </div>`;
  },

  sec(titulo, contenido) {
    return `<div class="rep-sec"><h4>${U.esc(titulo)}</h4>${contenido}</div>`;
  },

  vacioSec(txt) {
    return `<div class="small faint">${U.esc(txt)}</div>`;
  },

  firmas() {
    return `<div class="rep-sign">
      <div>Profesional responsable</div>
      <div>Dirección del centro</div>
    </div>`;
  },

  campoConclusiones() {
    return Reportes.sec('Conclusiones y recomendaciones', `
      <div contenteditable="true" id="rep-conclusiones"
        style="min-height:70px;border:1px dashed var(--border-strong);border-radius:6px;padding:10px;font-size:13px"
        data-ph="Escriba aquí las conclusiones del período…">${U.esc(Reportes.conclusiones)}</div>
      <div class="small faint no-print" style="margin-top:5px">Este campo es editable y se incluirá al imprimir.</div>`);
  },

  /* ---------- informe por residente ---------- */

  porResidente(r, tipo, desde, hasta) {
    const d = Reportes.datos(r.id, desde, hasta);
    const esEgreso = tipo === 'egreso';
    const titulo = esEgreso ? 'Informe de egreso'
      : tipo === 'mensual' ? 'Informe mensual de residente'
        : 'Informe semanal de residente';

    const llamadasTotal = U.suma(d.llamadas, l => l.cantidad);
    const cumpl = Tareas.cumplimiento(d.tareas);
    const faltasGraves = d.conductas.filter(c => c.gravedad !== 'Leve').length;
    const prog = DB.progresoEtapa(r);

    const identificacion = Reportes.sec('Identificación del residente', `
      <dl class="kv">
        <dt>Nombre</dt><dd>${U.esc(r.nombre)}</dd>
        <dt>Documento</dt><dd>${U.esc(r.documento) || '—'}</dd>
        <dt>Edad</dt><dd>${U.edad(r.fechaNacimiento) ? U.edad(r.fechaNacimiento) + ' años' : '—'}</dd>
        <dt>Fecha de ingreso</dt><dd>${U.fechaLarga(r.fechaIngreso)}</dd>
        ${esEgreso ? `<dt>Fecha de egreso</dt><dd>${U.fechaLarga(r.fechaEgreso)}</dd>` : ''}
        <dt>Permanencia</dt><dd>${DB.diasEstadia(r)} días</dd>
        <dt>Etapa ${esEgreso ? 'alcanzada' : 'actual'}</dt><dd>${U.esc(r.etapaEgreso || r.etapa) || '—'}</dd>
        <dt>Brigadas</dt><dd>${U.esc(DB.brigadasTexto(r)) || '—'}</dd>
        <dt>Sustancia principal</dt><dd>${U.esc(r.sustancia) || '—'}</dd>
        ${esEgreso ? `<dt>Tipo de egreso</dt><dd>${U.esc(r.tipoEgreso) || '—'}</dd>` : ''}
      </dl>
      ${r.diagnostico ? `<div style="margin-top:11px"><b>Motivo de ingreso / diagnóstico:</b><div class="pre">${U.nl(r.diagnostico)}</div></div>` : ''}`);

    const resumen = Reportes.sec('Resumen del período', `
      <div class="rep-stats">
        <div class="rep-stat"><div class="v">${d.etapas.length}</div><div class="l">Cambios de etapa</div></div>
        <div class="rep-stat"><div class="v">${d.conductas.length}</div><div class="l">Faltas / incidentes</div></div>
        <div class="rep-stat"><div class="v">${d.salidas.length}</div><div class="l">Salidas</div></div>
        <div class="rep-stat"><div class="v">${llamadasTotal}</div><div class="l">Llamadas</div></div>
      </div>
      <dl class="kv" style="margin-top:14px">
        <dt>Período informado</dt><dd>${U.fecha(desde)} al ${U.fecha(hasta)} (${U.dias(desde, hasta) + 1} días)</dd>
        <dt>Faltas graves</dt><dd>${faltasGraves}</dd>
        <dt>Casos de conducta cerrados</dt><dd>${Conducta.resueltasEn(r.id, desde, hasta).length}</dd>
        <dt>Tareas asignadas</dt><dd>${d.tareas.length}${cumpl !== null ? ` · cumplimiento ${cumpl} %` : ''}</dd>
        <dt>Tiempo en la etapa actual</dt><dd>${prog.dias} días${prog.requerido ? ` de ${prog.requerido} previstos` : ' (etapa sin plazo definido)'}</dd>
      </dl>`);

    /* Evolución del residente dentro del programa: cambios de etapa ocurridos
       en el período y situación de la etapa en curso al cierre. */
    const evoluciones = Reportes.sec('Evolución en el programa', `
      <dl class="kv">
        <dt>Días de tratamiento</dt><dd>${prog.diasTratamiento} días desde el ingreso (${DB.meses(prog.diasTratamiento)} meses)</dd>
        ${prog.modalidad ? `<dt>Modalidad</dt><dd>${U.esc(prog.modalidad)}</dd>` : ''}
        <dt>Etapa al cierre</dt><dd>${U.esc(r.etapaEgreso || r.etapa) || '—'}</dd>
        <dt>Corresponde por tiempo</dt><dd>${
          prog.desfase > 0 ? `${U.esc(prog.corresponde)} — <b>pendiente de actualizar</b>`
            : prog.alDia ? `${U.esc(prog.corresponde)} (coincide)`
              : prog.diasTratamiento >= DB.PLAN_TOTAL
                ? `Completó los ${DB.PLAN_TOTAL} días del plan: avanza por evaluación del equipo`
                : `${U.esc(prog.corresponde)} (va por delante del plan)`}</dd>
        <dt>En esta etapa desde</dt><dd>${U.fechaLarga(prog.desde)} (${prog.dias} días)${
          prog.estimada ? ' · fecha estimada según el plan' : ''}</dd>
        ${prog.requerido ? `
          <dt>Plazo de la etapa</dt><dd>${prog.requerido} días · previsto ${U.fechaLarga(prog.fechaPrevista)}</dd>
          <dt>Situación</dt><dd>${prog.restante > 0
            ? `Faltan ${U.plural(prog.restante, 'día', 'días')} para completar la etapa.`
            : `Plazo cumplido${prog.restante === 0 ? ' hoy' : ` hace ${U.plural(-prog.restante, 'día', 'días')}`}: corresponde evaluar el paso a ${U.esc(prog.siguiente || '—')}.`}</dd>`
          : `<dt>Plazo de la etapa</dt><dd>Sin plazo definido: avanza por evaluación del equipo.</dd>`}
        <dt>Próxima etapa</dt><dd>${prog.optativa
          ? `${U.esc(prog.optativa.etapa)} (optativa) — ${prog.optativa.opciones.map(o =>
              `${U.esc(o.v)} ${o.disponible ? 'disponible' : 'desde el ' + U.fecha(o.fecha)}`).join('; ')}`
          : (U.esc(prog.siguiente) || 'Última etapa del programa')}</dd>
      </dl>
      <div class="section-title">Cambios de etapa en el período</div>
      ${d.etapas.length ? UI.tabla([
        { l: 'Fecha', cls: 'nowrap', c: h => U.fecha(h.desde) },
        { l: 'Etapa', c: h => U.esc(h.etapa) + (h.modalidad ? ` · ${U.esc(h.modalidad)}` : '') },
        { l: 'Permanencia', cls: 'nowrap', c: h => h.hasta ? U.dias(h.desde, h.hasta) + ' días' : 'En curso' },
        { l: 'Motivo o acuerdo', c: h => U.esc(h.motivo) || '—' },
        { l: 'Registró', c: h => U.esc(h.registradoPor) || '—' }
      ], d.etapas) : Reportes.vacioSec('No hubo cambios de etapa en el período.')}`);

    const conducta = Reportes.sec('Conducta e incidentes',
      d.conductas.length ? UI.tabla([
        { l: 'Fecha', cls: 'nowrap', c: c => U.fecha(c.fecha) },
        { l: 'Gravedad', cls: 'nowrap', c: c => U.esc(c.gravedad) },
        { l: 'Tipo', c: c => U.esc(c.tipoFalta) + (c.brigada ? ` (${U.esc(c.brigada)})` : '') },
        { l: 'Descripción', c: c => U.esc(c.descripcion) },
        { l: 'Medida aplicada', c: c => U.esc(c.medida) || '—' },
        { l: 'Estado', cls: 'nowrap', c: c => U.esc(c.estado || 'Abierto') }
      ], d.conductas) : Reportes.vacioSec('Sin faltas ni incidentes registrados en el período.'));

    /* Casos cerrados dentro del período, aunque el hecho sea anterior. */
    const resueltas = Conducta.resueltasEn(r.id, desde, hasta);
    const seccionResueltas = Reportes.sec('Faltas resueltas en el período',
      resueltas.length ? `
        <p class="small">Se cerraron <b>${resueltas.length}</b>
        ${resueltas.length === 1 ? 'caso' : 'casos'} durante el período. Se incluyen los
        hechos ocurridos antes que fueron resueltos dentro de estas fechas.</p>
        ${resueltas.map(c => `
          <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
            <div class="small" style="font-weight:650">
              ${U.esc(c.tipoFalta)} · falta ${U.esc(c.gravedad)} del ${U.fecha(c.fecha)}
              ${c.brigada ? ' · brigada ' + U.esc(c.brigada) : ''}
              · cerrada el ${U.fecha(c.fechaResolucion)}
            </div>
            <div class="pre small" style="margin-top:3px"><b>Hecho:</b> ${U.nl(c.descripcion)}</div>
            ${c.medida ? `<div class="pre small" style="margin-top:3px"><b>Medida:</b> ${U.esc(c.medida)}</div>` : ''}
            <div class="pre small" style="margin-top:3px"><b>Resultado:</b> ${U.nl(c.resolucion || 'Sin detalle registrado.')}</div>
            ${c.resueltoPor ? `<div class="small faint" style="margin-top:3px">Cerrado por ${U.esc(c.resueltoPor)}</div>` : ''}
          </div>`).join('')}`
        : Reportes.vacioSec('No se cerraron casos de conducta durante el período.'));

    const salidas = Reportes.sec('Salidas y retornos',
      d.salidas.length ? UI.tabla([
        { l: 'Salida', cls: 'nowrap', c: s => U.fechaHora(s.fechaSalida, s.horaSalida) },
        { l: 'Motivo', c: s => U.esc(s.tipo) },
        { l: 'Destino', c: s => U.esc(s.destino) || '—' },
        { l: 'Retorno', cls: 'nowrap', c: s => s.fechaRetorno ? U.fechaHora(s.fechaRetorno, s.horaRetorno) : 'Sin retorno' },
        { l: 'Condición', c: s => U.esc(s.condicionRetorno) || '—' }
      ], d.salidas) : Reportes.vacioSec('No hubo salidas del centro en el período.'));

    const porDia = U.agrupar(d.llamadas, l => l.fecha);
    const llamadas = Reportes.sec('Registro de llamadas',
      d.llamadas.length ? `
        <p class="small">Total del período: <b>${llamadasTotal} llamadas</b> en
        ${U.plural(Object.keys(porDia).length, 'día', 'días')}
        (promedio ${(llamadasTotal / Object.keys(porDia).length).toFixed(1)} por día con registro).</p>
        ${UI.tabla([
          { l: 'Fecha', cls: 'nowrap', c: f => U.fecha(f) },
          { l: 'Llamadas', cls: 'nowrap', c: f => U.suma(porDia[f], l => l.cantidad) },
          { l: 'Duración total', cls: 'nowrap', c: f => U.suma(porDia[f], l => l.duracion) ? U.suma(porDia[f], l => l.duracion) + ' min' : '—' },
          { l: 'Contactos', c: f => U.esc(porDia[f].map(l => l.destinatarios).filter(Boolean).join('; ')) || '—' }
        ], Object.keys(porDia).sort())}`
        : Reportes.vacioSec('No se registraron llamadas en el período.'));

    const tareas = Reportes.sec('Tareas y responsabilidades',
      d.tareas.length ? `
        <p class="small">${d.tareas.length} tareas asignadas${cumpl !== null ? ` · cumplimiento del <b>${cumpl} %</b>` : ''}
        · ${d.tareas.filter(t => t.delegadoA).length} delegadas a otros residentes.</p>
        ${UI.tabla([
          { l: 'Fecha', cls: 'nowrap', c: t => U.fecha(t.fecha) },
          { l: 'Brigada', c: t => U.esc(t.brigada) || '—' },
          { l: 'Tarea', c: t => U.esc(t.tarea) },
          { l: 'Modalidad', c: t => U.esc(t.tipo) || '—' },
          { l: 'Delegada a', c: t => t.delegadoA ? U.esc(DB.nombreDe(t.delegadoA)) : '—' },
          { l: 'Estado', cls: 'nowrap', c: t => U.esc(t.estado) },
          { l: 'Evaluación', cls: 'nowrap', c: t => U.esc(t.evaluacion) || '—' }
        ], d.tareas)}`
        : Reportes.vacioSec('No se registraron tareas en el período.'));

    const egresoSec = esEgreso ? Reportes.sec('Condiciones de egreso', `
      <dl class="kv">
        <dt>Tipo de egreso</dt><dd>${U.esc(r.tipoEgreso) || '—'}</dd>
        <dt>Fecha</dt><dd>${U.fechaLarga(r.fechaEgreso)}</dd>
        <dt>Permanencia total</dt><dd>${DB.diasEstadia(r)} días</dd>
      </dl>
      ${r.motivoEgreso ? `<div style="margin-top:11px"><b>Motivo / fundamento:</b><div class="pre">${U.nl(r.motivoEgreso)}</div></div>` : ''}
      ${r.derivacionEgreso ? `<div style="margin-top:9px"><b>Derivación y seguimiento:</b><div class="pre">${U.nl(r.derivacionEgreso)}</div></div>` : ''}`) : '';

    const historial = esEgreso ? Reportes.sec('Síntesis de la estadía completa', (() => {
      const tot = Reportes.datos(r.id, '', '');
      return `<div class="rep-stats">
        <div class="rep-stat"><div class="v">${DB.diasEstadia(r)}</div><div class="l">Días en el centro</div></div>
        <div class="rep-stat"><div class="v">${tot.etapas.length}</div><div class="l">Cambios de etapa</div></div>
        <div class="rep-stat"><div class="v">${tot.conductas.length}</div><div class="l">Faltas totales</div></div>
        <div class="rep-stat"><div class="v">${tot.salidas.length}</div><div class="l">Salidas totales</div></div>
      </div>`;
    })()) : '';

    return `<div class="report">
      ${Reportes.encabezado(titulo, `${r.nombre} · Período: ${U.fecha(desde)} al ${U.fecha(hasta)}`)}
      ${identificacion}
      ${resumen}
      ${historial}
      ${evoluciones}
      ${conducta}
      ${seccionResueltas}
      ${salidas}
      ${llamadas}
      ${tareas}
      ${egresoSec}
      ${Reportes.campoConclusiones()}
      ${Reportes.firmas()}
    </div>`;
  },

  /* ---------- informe general del centro ---------- */

  general(desde, hasta) {
    const enR = f => U.enRango(f, desde, hasta);
    const residentes = DB.todos('residentes');
    const ingresos = residentes.filter(r => enR(r.fechaIngreso));
    const egresos = residentes.filter(r => r.estado === 'Egresado' && enR(r.fechaEgreso));
    const cambiosEtapa = DB.todos('etapas').filter(h => enR(h.desde));
    const cond = DB.todos('conductas').filter(c => enR(c.fecha));
    const sal = DB.todos('salidas').filter(s => enR(s.fechaSalida));
    const lla = DB.todos('llamadas').filter(l => enR(l.fecha));
    const tar = DB.todos('tareas').filter(t => enR(t.fecha));
    const activos = DB.activos();

    const porEtapa = DB.ETAPAS.map(e => ({ l: e, v: activos.filter(r => r.etapa === e).length })).filter(x => x.v);
    const porGravedad = DB.GRAVEDADES.map(g => ({ l: g, v: cond.filter(c => c.gravedad === g).length })).filter(x => x.v);
    const porTipoFalta = Object.entries(U.contar(cond, c => c.tipoFalta || 'Sin clasificar'))
      .map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v).slice(0, 8);
    const porTipoEgreso = Object.entries(U.contar(egresos, r => r.tipoEgreso || 'Sin clasificar'))
      .map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v);

    const resumenResidentes = activos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(r => {
      const d = Reportes.datos(r.id, desde, hasta);
      return {
        r, ev: d.etapas.length, co: d.conductas.length,
        sa: d.salidas.length, ll: U.suma(d.llamadas, x => x.cantidad),
        ta: d.tareas.length, cu: Tareas.cumplimiento(d.tareas)
      };
    });

    return `<div class="report">
      ${Reportes.encabezado('Informe general del centro', `Período: ${U.fecha(desde)} al ${U.fecha(hasta)}`)}

      ${Reportes.sec('Población atendida', `
        <div class="rep-stats">
          <div class="rep-stat"><div class="v">${activos.length}</div><div class="l">Residentes activos</div></div>
          <div class="rep-stat"><div class="v">${DB.presentes().length}</div><div class="l">Presentes en el centro</div></div>
          <div class="rep-stat"><div class="v">${ingresos.length}</div><div class="l">Ingresos del período</div></div>
          <div class="rep-stat"><div class="v">${egresos.length}</div><div class="l">Egresos del período</div></div>
        </div>
        <dl class="kv" style="margin-top:14px">
          <dt>Permanencia promedio</dt><dd>${activos.length ? Math.round(U.suma(activos, r => DB.diasEstadia(r)) / activos.length) : 0} días (activos)</dd>
          <dt>Registrados históricamente</dt><dd>${residentes.length}</dd>
          <dt>Fuera del centro al cierre</dt><dd>${DB.fueraDelCentro().length}</dd>
        </dl>`)}

      ${Reportes.sec('Distribución por etapa de tratamiento',
        porEtapa.length ? UI.barras(porEtapa) : Reportes.vacioSec('Sin residentes activos.'))}

      ${Reportes.sec('Movimientos del período', `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px">
          <div>
            <div class="small" style="font-weight:650;margin-bottom:6px">Ingresos (${ingresos.length})</div>
            ${ingresos.length ? UI.tabla([
              { l: 'Residente', c: r => U.esc(r.nombre) },
              { l: 'Fecha', cls: 'nowrap', c: r => U.fecha(r.fechaIngreso) },
              { l: 'Etapa', c: r => U.esc(r.etapa) }
            ], ingresos) : Reportes.vacioSec('Sin ingresos.')}
          </div>
          <div>
            <div class="small" style="font-weight:650;margin-bottom:6px">Egresos (${egresos.length})</div>
            ${egresos.length ? UI.tabla([
              { l: 'Residente', c: r => U.esc(r.nombre) },
              { l: 'Fecha', cls: 'nowrap', c: r => U.fecha(r.fechaEgreso) },
              { l: 'Tipo', c: r => U.esc(r.tipoEgreso) }
            ], egresos) : Reportes.vacioSec('Sin egresos.')}
          </div>
        </div>
        ${porTipoEgreso.length ? `<div style="margin-top:14px">
          <div class="small" style="font-weight:650;margin-bottom:6px">Egresos por tipo</div>
          ${UI.barras(porTipoEgreso)}</div>` : ''}`)}

      ${Reportes.sec('Actividad registrada', `
        <div class="rep-stats">
          <div class="rep-stat"><div class="v">${cambiosEtapa.length}</div><div class="l">Cambios de etapa</div></div>
          <div class="rep-stat"><div class="v">${cond.length}</div><div class="l">Faltas / incidentes</div></div>
          <div class="rep-stat"><div class="v">${sal.length}</div><div class="l">Salidas</div></div>
          <div class="rep-stat"><div class="v">${U.suma(lla, l => l.cantidad)}</div><div class="l">Llamadas</div></div>
        </div>
        <dl class="kv" style="margin-top:14px">
          <dt>Tareas asignadas</dt><dd>${tar.length}${Tareas.cumplimiento(tar) !== null ? ` · cumplimiento ${Tareas.cumplimiento(tar)} %` : ''}</dd>
          <dt>Salidas sin retorno</dt><dd>${sal.filter(s => !s.fechaRetorno).length}</dd>
          <dt>Retornos con novedad</dt><dd>${sal.filter(s => s.condicionRetorno && s.condicionRetorno !== Salidas.CONDICIONES[0]).length}</dd>
        </dl>`)}

      ${Reportes.sec('Conducta del período', `
        ${porGravedad.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px">
          <div><div class="small" style="font-weight:650;margin-bottom:6px">Por gravedad</div>${UI.barras(porGravedad)}</div>
          <div><div class="small" style="font-weight:650;margin-bottom:6px">Faltas más frecuentes</div>${UI.barras(porTipoFalta)}</div>
        </div>` : Reportes.vacioSec('Sin faltas registradas en el período.')}`)}

      ${Reportes.sec('Detalle por residente', resumenResidentes.length ? UI.tabla([
        { l: 'Residente', c: x => U.esc(x.r.nombre) },
        { l: 'Etapa', c: x => U.esc(x.r.etapa) },
        { l: 'Días', cls: 'nowrap', c: x => DB.diasEstadia(x.r) },
        { l: 'Etapas', cls: 'nowrap', c: x => x.ev },
        { l: 'Faltas', cls: 'nowrap', c: x => x.co },
        { l: 'Salidas', cls: 'nowrap', c: x => x.sa },
        { l: 'Llam.', cls: 'nowrap', c: x => x.ll },
        { l: 'Tareas', cls: 'nowrap', c: x => x.ta },
        { l: 'Cumpl.', cls: 'nowrap', c: x => x.cu === null ? '—' : x.cu + ' %' }
      ], resumenResidentes) : Reportes.vacioSec('Sin residentes activos.'))}

      ${Reportes.campoConclusiones()}
      ${Reportes.firmas()}
    </div>`;
  }
};

Vistas['reportes'] = {
  titulo: 'Reportes',
  sub: 'Informes semanales, mensuales, de egreso y generales del centro',
  acciones: () => `
    <button class="btn" data-action="descargar-reporte">⬇ Descargar HTML</button>
    <button class="btn btn-primary" data-action="imprimir">🖨 Imprimir / PDF</button>`,

  render(p) {
    // Residente preseleccionado al llegar desde una ficha
    if (p.id && !App.filtros.repResidente) App.filtros.repResidente = p.id;

    const tipo = App.f('repTipo', 'semanal');
    const preset = App.f('repPeriodo', 'actual');
    const rid = App.f('repResidente');
    const r = rid ? DB.residente(rid) : null;
    const [desde, hasta] = Reportes.rango(tipo, preset, r);

    const necesitaResidente = tipo !== 'general';

    const panel = `<div class="card no-print" style="margin-bottom:18px">
      <div class="card-body">
        <div class="form-grid">
          <div class="field" style="grid-column:span 4">
            <label>Tipo de informe</label>
            <select data-filtro="repTipo">
              ${Reportes.TIPOS.map(t => `<option value="${t.v}"${t.v === tipo ? ' selected' : ''}>${U.esc(t.l)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="grid-column:span 4">
            <label>Residente</label>
            <select data-filtro="repResidente" ${necesitaResidente ? '' : 'disabled'}>
              <option value="">${necesitaResidente ? '— Seleccionar residente —' : 'No aplica'}</option>
              ${App.opcionesResidentes(true).map(o =>
                `<option value="${o.v}"${o.v === rid ? ' selected' : ''}>${U.esc(o.l)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="grid-column:span 4">
            <label>Período</label>
            <select data-filtro="repPeriodo" ${tipo === 'egreso' ? 'disabled' : ''}>
              ${Reportes.PERIODOS.map(t => `<option value="${t.v}"${t.v === preset ? ' selected' : ''}>${U.esc(t.l)}</option>`).join('')}
            </select>
          </div>
          ${preset === 'personalizado' && tipo !== 'egreso' ? `
            <div class="field" style="grid-column:span 3">
              <label>Desde</label><input type="date" data-filtro="repDesde" value="${U.esc(desde)}">
            </div>
            <div class="field" style="grid-column:span 3">
              <label>Hasta</label><input type="date" data-filtro="repHasta" value="${U.esc(hasta)}">
            </div>` : ''}
          <div class="field" style="grid-column:span 12">
            <div class="small faint">Período informado: <b>${U.fecha(desde)}</b> al <b>${U.fecha(hasta)}</b>
            (${U.dias(desde, hasta) + 1} días). Use «Imprimir / PDF» para guardar el informe como documento.</div>
          </div>
        </div>
      </div>
    </div>`;

    let cuerpo;
    if (necesitaResidente && !r) {
      cuerpo = UI.vacio({
        ico: '📄',
        titulo: 'Seleccione un residente',
        texto: 'Elija el residente y el período para generar el informe.'
      });
    } else if (tipo === 'egreso' && r.estado !== 'Egresado') {
      cuerpo = `<div class="note warn">
        <b>${U.esc(r.nombre)}</b> aún no tiene egreso registrado. Registre el egreso en su ficha
        para emitir el informe correspondiente; mientras tanto se muestra la información acumulada
        desde su ingreso.</div>` + Reportes.porResidente(r, 'egreso', r.fechaIngreso, U.hoy());
    } else if (necesitaResidente) {
      cuerpo = Reportes.porResidente(r, tipo, desde, hasta);
    } else {
      cuerpo = Reportes.general(desde, hasta);
    }

    return panel + cuerpo;
  },

  luego() {
    const el = document.getElementById('rep-conclusiones');
    if (!el) return;
    if (!el.textContent.trim()) {
      el.style.color = 'var(--text-faint)';
      el.textContent = el.dataset.ph;
      el.addEventListener('focus', function limpiar() {
        if (el.textContent === el.dataset.ph) { el.textContent = ''; el.style.color = ''; }
        el.removeEventListener('focus', limpiar);
      });
    }
    el.addEventListener('input', () => {
      Reportes.conclusiones = el.textContent === el.dataset.ph ? '' : el.textContent;
    });
  }
};

/* Hoja de estilos autocontenida para el informe exportado: el archivo
   descargado debe verse bien sin depender de styles.css. */
Reportes.CSS_EXPORT = `
body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;font-size:13px;color:#1e293b;
  line-height:1.55;background:#fff;margin:0;padding:32px}
.report{max-width:860px;margin:0 auto}
h2{font-size:19px;margin:0 0 2px}
.rep-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;
  border-bottom:2px solid #1d6f5c;padding-bottom:14px;margin-bottom:20px}
.rep-ident{display:flex;gap:14px;align-items:flex-start;min-width:0}
.rep-logo{width:54px;height:54px;flex:0 0 54px;object-fit:contain}
.center-name{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.07em;font-weight:700}
.rep-sec{margin-top:24px;page-break-inside:avoid}
.rep-sec>h4{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#1d6f5c;
  border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin:0 0 11px}
.kv{display:grid;grid-template-columns:170px 1fr;gap:6px 14px;margin:0}
.kv dt{color:#64748b;font-weight:500}
.kv dd{margin:0;font-weight:500}
table.tbl{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
table.tbl th{text-align:left;padding:7px 10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;
  color:#64748b;border-bottom:1px solid #cbd5e1;background:#f8fafc}
table.tbl td{padding:7px 10px;border-bottom:1px solid #eef2f7;vertical-align:top}
.rep-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.rep-stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px}
.rep-stat .v{font-size:20px;font-weight:700}
.rep-stat .l{font-size:11px;color:#64748b}
.rep-sign{margin-top:52px;display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center;
  font-size:12px;color:#64748b}
.rep-sign div{border-top:1px solid #cbd5e1;padding-top:7px}
.bars{display:flex;flex-direction:column;gap:8px}
.bar-row{display:grid;grid-template-columns:130px 1fr 42px;gap:10px;align-items:center;font-size:12px}
.bar-track{background:#eef2f7;border-radius:999px;height:9px;overflow:hidden}
.bar-fill{height:100%;background:#1d6f5c;border-radius:999px}
.bar-num{text-align:right;font-weight:650}
.pre{white-space:pre-wrap}
.small{font-size:12px}
.muted{color:#64748b}
.faint{color:#94a3b8}
.right{text-align:right}
.nowrap{white-space:nowrap}
.no-print{display:none}
.empty{padding:20px;text-align:center;color:#94a3b8}
@media print{@page{margin:16mm}body{padding:0}}
`;

Acciones['descargar-reporte'] = () => {
  const rep = document.querySelector('.report');
  if (!rep) return UI.toast('Genere primero un informe.', 'warn');
  const copia = rep.cloneNode(true);
  copia.querySelectorAll('.no-print').forEach(n => n.remove());
  copia.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Informe · ${U.esc(DB.config.centro)}</title>
<style>${Reportes.CSS_EXPORT}</style>
</head><body>${copia.outerHTML}</body></html>`;
  U.descargar(`informe_${U.hoy()}.html`, html, 'text/html;charset=utf-8');
  UI.toast('Informe descargado. Ábralo en el navegador para imprimirlo o enviarlo.');
};
