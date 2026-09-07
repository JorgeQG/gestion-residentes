/* ============================================================
   progreso.js — Evoluciones: avance de etapa de cada residente
   ============================================================
   Esta es la sección "Evoluciones" de la aplicación: administra
   el paso de los residentes por las etapas del programa.

   El avance lo determinan los días de tratamiento (ver DB.DURACIONES):
     Compromiso ....... 15 días   (días 0 a 14)
     Grupo 4 .......... 45 días   (días 15 a 59)
     Grupo 3 .......... 45 días   (días 60 a 104)
     Grupo 2 .......... 45 días   (días 105 a 149)
     Grupo 1 .......... 30 días   (días 150 a 179)
     Nivel 1 .......... 60 días   (días 180 a 239, 2 meses)
     Nivel 2 .......... 60 días   (días 240 a 299, 2 meses)
   A los 300 días (10 meses) termina la escalera obligatoria.
   Nivel 3 es optativo: reinserción laboral desde los 10 meses o
   reinserción social desde los 11 meses. Los cargos posteriores
   los decide el equipo, no el calendario.
   ============================================================ */

const Progreso = {

  ESTADOS: {
    'cumplido': { cls: 'b-danger', l: 'Plazo cumplido' },
    'proximo': { cls: 'b-warn', l: 'Próximo a progresar' },
    'optativa': { cls: 'b-info', l: 'Puede optar' },
    'en-curso': { cls: 'b-ok', l: 'En curso' },
    'sin-plazo': { cls: 'b-gray', l: 'Sin plazo definido' }
  },

  badge(p) {
    // En una etapa optativa lo informativo es la modalidad, no el plazo.
    if (p.enOptativa) {
      return `<span class="badge b-info">${U.esc(p.modalidad || 'Etapa optativa')}</span>`;
    }
    const e = Progreso.ESTADOS[p.estado] || Progreso.ESTADOS['sin-plazo'];
    const l = p.estado === 'optativa' && p.siguiente ? `Puede optar a ${p.siguiente}` : e.l;
    return `<span class="badge ${e.cls}">${U.esc(l)}</span>`;
  },

  /** Residentes activos ordenados por urgencia: primero los desfasados. */
  lista() {
    return DB.activos()
      .map(r => ({ r, p: DB.progresoEtapa(r) }))
      .sort((a, b) => {
        // Un desfase (el tiempo indica una etapa más avanzada) va primero.
        if ((a.p.desfase > 0) !== (b.p.desfase > 0)) return a.p.desfase > 0 ? -1 : 1;
        if (a.p.desfase > 0 && b.p.desfase > 0) return b.p.desfase - a.p.desfase;
        const orden = { 'cumplido': 0, 'proximo': 1, 'optativa': 2, 'en-curso': 3, 'sin-plazo': 4 };
        const d = orden[a.p.estado] - orden[b.p.estado];
        if (d !== 0) return d;
        if (a.p.requerido && b.p.requerido) return a.p.restante - b.p.restante;
        return a.r.nombre.localeCompare(b.r.nombre);
      });
  },

  /** Residentes cuya etapa registrada quedó por detrás del tiempo cumplido. */
  desfasados() {
    return Progreso.lista().filter(x => x.p.desfase > 0);
  },

  /** ¿Ya cumple el tiempo para optar a la etapa optativa siguiente? */
  puedeOptar(p) {
    return !!p.optativa &&
      (p.estado === 'optativa' || p.optativa.opciones.some(o => o.disponible));
  },

  /** Residentes que ya pueden optar a Nivel 3 y todavía no lo han tomado. */
  habilitadosOptativa(lista) {
    return (lista || Progreso.lista()).filter(x => Progreso.puedeOptar(x.p));
  },

  /** Texto de las modalidades de una etapa optativa. */
  textoOptativa(p) {
    if (!p.optativa) return '';
    return p.optativa.opciones.map(o => o.disponible
      ? `${o.v}: disponible`
      : `${o.v}: ${U.fecha(o.fecha)}`).join(' · ');
  },

  /* ---------- ajuste por tiempo de tratamiento ---------- */

  /**
   * Sube al residente hasta la etapa que le corresponde por sus días de
   * tratamiento, dejando registrada cada etapa intermedia con la fecha en
   * que la cumplió. Devuelve cuántos cambios se registraron.
   */
  ajustarUno(residenteId, registradoPor) {
    let r = DB.residente(residenteId);
    if (!r) return 0;
    const p = DB.progresoEtapa(r);
    if (p.desfase <= 0) return 0;

    const hasta = DB.ETAPAS.indexOf(p.corresponde);
    let n = 0;
    for (let i = DB.ETAPAS.indexOf(r.etapa) + 1; i <= hasta; i++) {
      const etapa = DB.ETAPAS[i];
      const previstos = DB.inicioPrevisto(etapa);
      // La fecha del cambio es el día en que cumplió los días exigidos, sin
      // quedar nunca antes del inicio de la etapa anterior ni en el futuro.
      let fecha = U.sumaDias(r.fechaIngreso, previstos);
      const minimo = DB.etapaDesde(r);
      if (fecha < minimo) fecha = minimo;
      if (fecha > U.hoy()) fecha = U.hoy();
      Progreso.aplicarCambio(r, etapa, fecha,
        `Ajuste por tiempo de tratamiento: cumple ${previstos} días en el centro.`,
        registradoPor || '');
      r = DB.residente(residenteId);
      n++;
    }
    return n;
  },

  ajustar(residenteId) {
    const r = DB.residente(residenteId);
    if (!r) return;
    const p = DB.progresoEtapa(r);
    if (p.desfase <= 0) return UI.toast('Su etapa ya coincide con su tiempo de tratamiento.');

    UI.confirmar({
      title: 'Actualizar etapa por tiempo',
      submit: 'Actualizar',
      body: `<b>${U.esc(r.nombre)}</b> lleva <b>${p.diasTratamiento} días</b> de tratamiento.
        Según el plan del centro le corresponde <b>${U.esc(p.corresponde)}</b> y está
        registrado en <b>${U.esc(r.etapa)}</b>.<br>
        <span class="muted small">Se registrará el paso por cada etapa intermedia con la
        fecha en que cumplió los días exigidos.</span>`,
      onSubmit: () => {
        const n = Progreso.ajustarUno(r.id, (Auth.sesion() || {}).nombre);
        UI.toast(`${r.nombre}: ${U.plural(n, 'cambio registrado', 'cambios registrados')}.`);
        App.pintar();
      }
    });
  },

  ajustarTodos() {
    const pendientes = Progreso.desfasados();
    if (!pendientes.length) return UI.toast('Todas las etapas coinciden con el tiempo de tratamiento.');

    UI.confirmar({
      title: 'Actualizar etapas por tiempo de tratamiento',
      submit: `Actualizar ${pendientes.length}`,
      body: `Se actualizará la etapa de <b>${U.plural(pendientes.length, 'residente', 'residentes')}</b>
        según los días que llevan en el centro:
        <div class="pre small" style="margin-top:9px;max-height:220px;overflow:auto">${
          pendientes.map(x => `${U.esc(x.r.nombre)} · ${x.p.diasTratamiento} días · ${U.esc(x.r.etapa)} → ${U.esc(x.p.corresponde)}`).join('\n')
        }</div>
        <div class="small muted" style="margin-top:9px">Queda registrado el paso por cada etapa
        intermedia. Los residentes con cargo o nivel por sobre lo que indica el tiempo no se tocan.</div>`,
      onSubmit: () => {
        const quien = (Auth.sesion() || {}).nombre;
        let n = 0;
        pendientes.forEach(x => { n += Progreso.ajustarUno(x.r.id, quien); });
        UI.toast(`${pendientes.length} residentes actualizados · ${n} cambios registrados.`);
        App.pintar();
      }
    });
  },

  /** Cambios de etapa registrados para un residente dentro de un período.
   *  Se usa en los informes: sin fechas, devuelve el historial completo. */
  cambiosEn(residenteId, desde, hasta) {
    return DB.de('etapas', residenteId)
      .filter(h => U.enRango(h.desde, desde, hasta))
      .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
  },

  /* ---------- registro de cambio de etapa ---------- */

  /**
   * Deja constancia del cambio de etapa: cierra el tramo anterior en el
   * historial, abre el nuevo y actualiza la ficha del residente.
   */
  aplicarCambio(r, nuevaEtapa, fecha, motivo, registradoPor, modalidad) {
    const historial = DB.de('etapas', r.id);

    // Si la ficha no tenía historial, se deja registrado el tramo actual
    // para no perder desde cuándo estaba en su etapa anterior.
    if (!historial.length && r.etapa) {
      DB.crear('etapas', {
        residenteId: r.id,
        etapa: r.etapa,
        desde: DB.etapaDesde(r),
        hasta: fecha,
        motivo: '',
        registradoPor: ''
      });
    } else {
      const abierto = historial.find(h => !h.hasta);
      if (abierto) DB.actualizar('etapas', abierto.id, { hasta: fecha });
    }

    DB.crear('etapas', {
      residenteId: r.id,
      etapa: nuevaEtapa,
      desde: fecha,
      hasta: '',
      motivo: motivo || '',
      registradoPor: registradoPor || '',
      modalidad: modalidad || ''
    });

    // La modalidad solo acompaña a las etapas optativas (Nivel 3).
    DB.actualizar('residentes', r.id, {
      etapa: nuevaEtapa,
      etapaDesde: fecha,
      modalidad: DB.esOptativa(nuevaEtapa) ? (modalidad || '') : ''
    });
  },

  cambiarEtapa(residenteId) {
    const r = DB.residente(residenteId);
    if (!r) return;
    const p = DB.progresoEtapa(r);
    const sugerida = p.siguiente || r.etapa;

    UI.modal({
      title: 'Registrar cambio de etapa',
      sub: `${r.nombre} · actualmente en ${r.etapa}`,
      submit: 'Registrar cambio',
      body: `
        <div class="note" style="margin-bottom:14px">
          Lleva <b>${p.diasTratamiento} días</b> de tratamiento y <b>${p.dias} días</b>
          en ${U.esc(r.etapa)}${p.requerido ? ` de los ${p.requerido} previstos` : ' (etapa sin plazo definido)'}.
          ${p.siguiente ? `La etapa siguiente es <b>${U.esc(p.siguiente)}</b>.` : 'Es la última etapa del programa.'}
        </div>
        ${p.optativa ? `<div class="note warn" style="margin-bottom:14px">
          <b>${U.esc(p.optativa.etapa)} es optativo.</b> Modalidades:
          ${p.optativa.opciones.map(o => `<br>· ${U.esc(o.v)} — desde los ${o.meses} meses (${o.dias} días): ${
            o.disponible ? `<b>disponible</b> desde el ${U.fecha(o.fecha)}`
              : `disponible el ${U.fecha(o.fecha)}, en ${U.plural(o.restante, 'día', 'días')}`}`).join('')}
          <br><span class="small">Si elige esta etapa, indique la modalidad.</span>
        </div>` : ''}
        ${UI.campos([
          { n: 'etapa', l: 'Nueva etapa', t: 'select', w: 7, req: true, opts: DB.ETAPAS, vacio: false, val: sugerida },
          { n: 'fecha', l: 'Fecha del cambio', t: 'date', w: 5, req: true, val: U.hoy() },
          {
            n: 'modalidad', l: 'Modalidad de reinserción', t: 'select', w: 12,
            opts: (DB.OPTATIVAS['Nivel 3'].opciones || []).map(o => o.v),
            val: r.modalidad || '',
            help: 'Solo para Nivel 3: laboral desde los 10 meses, social desde los 11 meses.'
          },
          { n: 'motivo', l: 'Motivo o acuerdo del equipo', t: 'textarea', w: 12, rows: 3,
            ph: 'Cumplimiento del plazo, evaluación del equipo, retroceso por falta grave…' },
          { n: 'registradoPor', l: 'Registrado por', t: 'text', w: 12, val: DB.config.responsable }
        ], {})}`,
      onSubmit: d => {
        if (d.etapa === r.etapa) {
          UI.toast('Seleccione una etapa distinta a la actual.', 'err');
          return false;
        }
        if (d.fecha < DB.etapaDesde(r)) {
          UI.toast('La fecha del cambio no puede ser anterior al inicio de la etapa actual.', 'err');
          return false;
        }
        if (DB.esOptativa(d.etapa) && !d.modalidad) {
          UI.toast(`Indique la modalidad de ${d.etapa}: reinserción laboral o social.`, 'err');
          return false;
        }
        const retrocede = DB.ETAPAS.indexOf(d.etapa) < DB.ETAPAS.indexOf(r.etapa);
        Progreso.aplicarCambio(r, d.etapa, d.fecha, d.motivo, d.registradoPor, d.modalidad);

        // El equipo puede adelantar una reinserción, pero queda advertido.
        const opcion = DB.opcionesOptativas(r, d.etapa).find(o => o.v === d.modalidad);
        if (opcion && !opcion.disponible) {
          UI.toast(`Registrado. Atención: ${opcion.v} se cumple a los ${opcion.meses} meses (${U.fecha(opcion.fecha)}).`, 'warn');
        } else {
          UI.toast(`${r.nombre}: ${retrocede ? 'retroceso' : 'progresión'} a ${d.etapa}.`);
        }
        App.pintar();
      }
    });
  },

  /** Corrige desde cuándo el residente está en su etapa actual. */
  corregirInicio(residenteId) {
    const r = DB.residente(residenteId);
    if (!r) return;
    UI.modal({
      title: 'Corregir inicio de etapa',
      sub: `${r.nombre} · ${r.etapa}`,
      size: 'narrow',
      submit: 'Guardar',
      body: `
        <div class="note" style="margin-bottom:14px">
          Indique desde cuándo está en <b>${U.esc(r.etapa)}</b>. El sistema usa esta fecha
          para calcular el avance; si no se ha registrado, toma la fecha de ingreso.
        </div>
        ${UI.campos([
          { n: 'etapaDesde', l: 'En esta etapa desde', t: 'date', w: 12, req: true, val: DB.etapaDesde(r) }
        ], {})}`,
      onSubmit: d => {
        if (d.etapaDesde < r.fechaIngreso) {
          UI.toast('No puede ser anterior a la fecha de ingreso.', 'err');
          return false;
        }
        if (d.etapaDesde > U.hoy()) {
          UI.toast('No puede ser una fecha futura.', 'err');
          return false;
        }
        DB.actualizar('residentes', r.id, { etapaDesde: d.etapaDesde });
        const abierto = DB.de('etapas', r.id).find(h => !h.hasta);
        if (abierto) DB.actualizar('etapas', abierto.id, { desde: d.etapaDesde });
        UI.toast('Inicio de etapa actualizado.');
        App.pintar();
      }
    });
  },

  /* ---------- línea de tiempo ---------- */

  /** Escalera completa del programa con el punto en que va el residente. */
  timeline(r) {
    const historial = DB.historialEtapas(r);
    const cumplidas = {};
    historial.forEach(h => {
      cumplidas[h.etapa] = cumplidas[h.etapa] || h;
    });
    const p = DB.progresoEtapa(r);
    const iActual = DB.ETAPAS.indexOf(r.etapa);

    return `<div class="tl-etapas">${DB.ETAPAS.map((etapa, i) => {
      const esActual = i === iActual;
      const pasada = i < iActual;
      const h = cumplidas[etapa];
      const dur = DB.DURACIONES[etapa];

      let detalle;
      if (esActual) {
        detalle = `<b>${p.dias} ${p.dias === 1 ? 'día' : 'días'}</b>` +
          (p.requerido ? ` de ${p.requerido} · previsto ${U.fecha(p.fechaPrevista)}` : ' · sin plazo definido') +
          (p.modalidad ? ` · ${U.esc(p.modalidad)}` : '');
      } else if (DB.esOptativa(etapa) && !h) {
        // Etapa optativa: se indica desde cuándo puede tomarse cada modalidad.
        detalle = 'Optativa · ' + DB.opcionesOptativas(r, etapa).map(o =>
          `${o.v} desde los ${o.meses} meses (${U.fecha(o.fecha)})`).join(' · ');
      } else if (h) {
        detalle = h.hasta
          ? `${U.fecha(h.desde)} → ${U.fecha(h.hasta)} (${U.dias(h.desde, h.hasta)} días)`
          : `desde ${U.fecha(h.desde)}`;
      } else if (pasada) {
        detalle = dur ? `${dur} días` : 'sin plazo definido';
      } else {
        // Etapa por venir: se indica cuándo la alcanza según su fecha de ingreso.
        const prevista = U.sumaDias(r.fechaIngreso, DB.inicioPrevisto(etapa));
        detalle = dur
          ? `${dur} días · desde el día ${DB.inicioPrevisto(etapa)} de tratamiento (${U.fecha(prevista)})`
          : 'sin plazo definido · por evaluación del equipo';
      }

      return `<div class="tl-etapa ${esActual ? 'actual' : pasada ? 'pasada' : 'futura'}">
        <div class="tl-punto"></div>
        <div style="min-width:0">
          <div class="tl-nombre">${U.esc(etapa)}</div>
          <div class="tl-detalle">${detalle}</div>
          ${esActual && p.requerido ? `
            <div class="bar-track" style="margin-top:6px;max-width:220px">
              <div class="bar-fill" style="width:${p.porcentaje}%;background:${
                p.estado === 'cumplido' ? 'var(--danger)' : p.estado === 'proximo' ? 'var(--warn)' : 'var(--primary)'
              }"></div>
            </div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  },

  /* ---------- panel principal ---------- */

  panel() {
    const lista = Progreso.lista();
    const q = U.norm(App.f('q'));
    const filtroEstado = App.f('estadoEtapa');

    const filtrada = lista.filter(x => {
      if (filtroEstado === 'desfasado') { if (x.p.desfase <= 0) return false; }
      else if (filtroEstado === 'optativa') { if (!Progreso.puedeOptar(x.p)) return false; }
      else if (filtroEstado && x.p.estado !== filtroEstado) return false;
      if (q && !U.norm(x.r.nombre + ' ' + x.r.etapa).includes(q)) return false;
      return true;
    });

    const cuenta = e => lista.filter(x => x.p.estado === e).length;
    const desfasados = lista.filter(x => x.p.desfase > 0).length;

    const resumen = `<div class="grid g4" style="margin-bottom:16px">
      ${UI.stat({
        ico: '⏱️', val: desfasados, lab: 'Etapa por actualizar',
        nota: 'El tiempo indica una etapa más avanzada',
        color: desfasados ? 'var(--danger-soft)' : 'var(--ok-soft)',
        accion: desfasados ? 'ajustar-etapas' : ''
      })}
      ${UI.stat({ ico: '⬆️', val: cuenta('cumplido'), lab: 'Con plazo cumplido', nota: 'Corresponde evaluar el cambio' })}
      ${UI.stat({ ico: '📅', val: cuenta('proximo'), lab: 'Próximos a progresar', nota: `En los siguientes ${DB.DIAS_AVISO_ETAPA} días` })}
      ${UI.stat({
        ico: '🤝', val: Progreso.habilitadosOptativa(lista).length, lab: 'Pueden optar a Nivel 3',
        nota: 'Reinserción laboral (10 meses) o social (11)'
      })}
    </div>`;

    const toolbar = App.toolbar([
      App.buscador('Buscar residente…'),
      App.selectFiltro('estadoEtapa', 'Todos los estados', [
        { v: 'desfasado', l: 'Etapa por actualizar' },
        { v: 'cumplido', l: 'Plazo cumplido' },
        { v: 'proximo', l: 'Próximos a progresar' },
        { v: 'optativa', l: 'Pueden optar a Nivel 3' },
        { v: 'en-curso', l: 'En curso' },
        { v: 'sin-plazo', l: 'Sin plazo definido' }
      ]),
      desfasados ? `<button class="btn btn-primary" data-action="ajustar-etapas">⏱️ Actualizar ${desfasados} por tiempo</button>` : '',
      `<div class="spacer"></div>`,
      `<div class="small faint">${U.plural(filtrada.length, 'residente', 'residentes')}</div>`
    ]);

    const tabla = UI.tabla([
      {
        l: 'Residente', c: x => `<div style="font-weight:600">${U.esc(x.r.nombre)}</div>
          <div class="small faint">Ingreso ${U.fecha(x.r.fechaIngreso)} · ${x.p.diasTratamiento} días de tratamiento</div>`
      },
      {
        l: 'Etapa registrada', c: x => App.badgeEtapa(x.r.etapa) +
          (x.p.modalidad ? `<div class="small faint">${U.esc(x.p.modalidad)}</div>` : '')
      },
      {
        l: 'Corresponde por tiempo', c: x => {
          if (x.p.desfase > 0) {
            return `<span class="badge b-danger">${U.esc(x.p.corresponde)}</span>
              <div class="small faint">Debe subir ${U.plural(x.p.desfase, 'etapa', 'etapas')}</div>`;
          }
          if (x.p.alDia) {
            return `<span class="faint">${U.esc(x.p.corresponde)}</span>
              <div class="small faint">Coincide</div>`;
          }
          // Pasados los 180 días el tiempo ya no manda: avanza por evaluación.
          return x.p.diasTratamiento >= DB.PLAN_TOTAL
            ? `<span class="faint">—</span>
               <div class="small faint">Completó los ${DB.PLAN_TOTAL} días del plan</div>`
            : `<span class="faint">${U.esc(x.p.corresponde)}</span>
               <div class="small faint">Va por delante del plan</div>`;
        }
      },
      {
        l: 'Tiempo en la etapa', c: x => {
          const pie = x.p.estimada
            ? `<div class="small faint" title="Fecha deducida del plan del centro">Desde ${U.fecha(x.p.desde)} (estimado)</div>`
            : `<div class="small faint">Desde ${U.fecha(x.p.desde)}</div>`;
          if (!x.p.requerido) return `<div>${x.p.dias} días</div>${pie}`;
          return `<div>${x.p.dias} de ${x.p.requerido} días</div>
            <div class="bar-track" style="margin-top:4px;max-width:150px">
              <div class="bar-fill" style="width:${x.p.porcentaje}%;background:${
                x.p.estado === 'cumplido' ? 'var(--danger)' : x.p.estado === 'proximo' ? 'var(--warn)' : 'var(--primary)'
              }"></div>
            </div>${pie}`;
        }
      },
      {
        l: 'Próxima etapa', c: x => {
          if (!x.p.siguiente) return '<span class="faint">Última etapa</span>';
          if (x.p.optativa) {
            // Nivel 3: no lo impone el calendario, se ofrece por modalidad.
            return `<div>${U.esc(x.p.siguiente)} <span class="badge b-gray">optativa</span></div>` +
              x.p.optativa.opciones.map(o => `<div class="small ${o.disponible ? '' : 'faint'}">
                ${o.disponible ? '✓' : '·'} ${U.esc(o.v)} · ${o.disponible
                  ? 'disponible' : U.fecha(o.fecha)}</div>`).join('');
          }
          return `<div>${U.esc(x.p.siguiente)}</div>${x.p.requerido
            ? `<div class="small faint">${x.p.restante > 0
              ? U.fecha(x.p.fechaPrevista) + ' · en ' + U.plural(x.p.restante, 'día', 'días')
              : x.p.restante === 0 ? 'plazo cumplido hoy'
                : 'plazo cumplido hace ' + U.plural(-x.p.restante, 'día', 'días')}</div>`
            : ''}`;
        }
      },
      { l: 'Estado', cls: 'nowrap', c: x => Progreso.badge(x.p) },
      {
        l: '', cls: 'actions', c: x => `
          <button class="btn btn-sm btn-ghost" data-action="ver-timeline" data-id="${x.r.id}" title="Ver línea de tiempo">📈</button>
          <button class="btn btn-sm btn-ghost" data-action="corregir-inicio" data-id="${x.r.id}" title="Corregir inicio de etapa">📅</button>
          ${x.p.desfase > 0
            ? `<button class="btn btn-sm btn-primary" data-action="ajustar-etapa" data-id="${x.r.id}"
                       title="Subirlo a la etapa que le corresponde por tiempo">⏱️ Actualizar</button>`
            : `<button class="btn btn-sm ${['cumplido', 'proximo', 'optativa'].includes(x.p.estado) ? 'btn-primary' : ''}"
                       data-action="cambiar-etapa" data-id="${x.r.id}">⬆ Cambiar etapa</button>`}`
      }
    ], filtrada, {
      vacio: {
        ico: '📈', titulo: 'Sin residentes que mostrar',
        texto: 'Ajuste los filtros para ver el avance de etapa.'
      }
    });

    const nota = `
      <div class="note" style="margin-bottom:16px">
        <b>La etapa la determinan los días de tratamiento:</b>
        Compromiso los días 0 a 14 (15 días) · Grupo 4 del 15 al 59 · Grupo 3 del 60 al 104 ·
        Grupo 2 del 105 al 149 (45 días cada uno, 1,5 meses) · Grupo 1 del 150 al 179 (30 días) ·
        Nivel 1 del 180 al 239 y Nivel 2 del 240 al 299 (2 meses cada uno).
        A los 300 días (10 meses) termina la escalera con plazos.
        <b>Nivel 3 es optativo</b>: reinserción laboral desde los 10 meses (300 días) o
        reinserción social desde los 11 (330 días); se toma por decisión del residente y del
        equipo, y los cargos posteriores también.
        <br><span class="small">Cuando la etapa registrada queda por detrás del tiempo cumplido,
        el residente aparece como <b>etapa por actualizar</b>. El botón <b>⏱️ Actualizar</b>
        lo sube a la que le corresponde y deja registrada cada etapa intermedia con la fecha
        en que la cumplió. Si progresó antes o después de lo previsto, corrija la fecha real
        con el botón 📅.</span>
      </div>`;

    return nota + resumen + toolbar +
      `<div class="card"><div class="card-body tight">${tabla}</div></div>`;
  },

  verTimeline(id) {
    const r = DB.residente(id);
    if (!r) return;
    const p = DB.progresoEtapa(r);
    UI.modal({
      title: 'Línea de tiempo del tratamiento',
      sub: r.nombre,
      submit: null,
      cancel: 'Cerrar',
      body: `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          ${App.badgeEtapa(r.etapa)} ${Progreso.badge(p)}
          ${p.modalidad ? `<span class="badge b-info">${U.esc(p.modalidad)}</span>` : ''}
          <span class="badge b-gray">${p.diasTratamiento} días · ${DB.meses(p.diasTratamiento)} meses</span>
          <span class="badge b-gray">Ingreso ${U.fecha(r.fechaIngreso)}</span>
        </div>
        ${p.optativa && p.optativa.opciones.some(o => o.disponible) ? `
          <div class="note" style="margin-bottom:14px">
            Ya cumple el tiempo para optar a <b>${U.esc(p.optativa.etapa)}</b>:
            ${p.optativa.opciones.filter(o => o.disponible).map(o => U.esc(o.v)).join(' o ')}.
          </div>` : ''}
        ${p.desfase > 0 ? `<div class="note warn" style="margin-bottom:14px">
          Por sus días de tratamiento le corresponde <b>${U.esc(p.corresponde)}</b> y está
          registrado en <b>${U.esc(r.etapa)}</b>.</div>` : ''}
        ${Progreso.timeline(r)}`,
      extraFoot: `<button type="button" class="btn btn-sm btn-primary"
        data-action="cambiar-etapa" data-id="${r.id}">⬆ Cambiar etapa</button>`
    });
  }
};

/* ============================================================
   Vista "Evoluciones": progreso de etapa de los residentes
   ============================================================ */

Vistas['evoluciones'] = {
  titulo: 'Evoluciones',
  sub: () => {
    const l = Progreso.lista();
    const cumplidos = l.filter(x => x.p.estado === 'cumplido').length;
    const proximos = l.filter(x => x.p.estado === 'proximo').length;
    return `Progreso de etapa de ${l.length} residentes · ${cumplidos} con plazo cumplido · ${proximos} próximos a progresar`;
  },
  acciones: () => {
    const n = Progreso.desfasados().length;
    return `<button class="btn" data-action="exportar-progreso">⬇ Exportar CSV</button>` +
      (n ? `<button class="btn btn-primary" data-action="ajustar-etapas">⏱️ Actualizar ${n} por tiempo</button>` : '');
  },
  render: () => Progreso.panel()
};

Acciones['ajustar-etapa'] = d => Progreso.ajustar(d.id);
Acciones['ajustar-etapas'] = () => Progreso.ajustarTodos();
Acciones['cambiar-etapa'] = d => Progreso.cambiarEtapa(d.id);
Acciones['corregir-inicio'] = d => Progreso.corregirInicio(d.id);
Acciones['ver-timeline'] = d => Progreso.verTimeline(d.id);

Acciones['exportar-progreso'] = () => {
  const filas = Progreso.lista();
  if (!filas.length) return UI.toast('No hay residentes para exportar.', 'warn');
  U.descargar(`progreso_etapas_${U.hoy()}.csv`, U.csv([
    { l: 'Residente', v: x => x.r.nombre },
    { l: 'Documento', v: x => x.r.documento },
    { l: 'Fecha ingreso', v: x => U.fecha(x.r.fechaIngreso) },
    { l: 'Días de tratamiento', v: x => x.p.diasTratamiento },
    { l: 'Etapa registrada', v: x => x.p.etapa },
    { l: 'Corresponde por tiempo', v: x => x.p.corresponde },
    { l: 'En la etapa desde', v: x => U.fecha(x.p.desde) },
    { l: 'Días en la etapa', v: x => x.p.dias },
    { l: 'Días requeridos', v: x => x.p.requerido || '' },
    { l: 'Días restantes', v: x => x.p.requerido ? x.p.restante : '' },
    { l: 'Fecha prevista', v: x => x.p.requerido ? U.fecha(x.p.fechaPrevista) : '' },
    { l: 'Modalidad', v: x => x.p.modalidad },
    { l: 'Próxima etapa', v: x => x.p.siguiente || '' },
    { l: 'Etapa optativa', v: x => Progreso.textoOptativa(x.p) },
    { l: 'Estado', v: x => (Progreso.ESTADOS[x.p.estado] || {}).l || '' }
  ], filas), 'text/csv;charset=utf-8');
  UI.toast('Archivo CSV descargado.');
};
