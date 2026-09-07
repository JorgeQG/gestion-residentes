/* ============================================================
   alertas.js — motor de alertas del centro
   ============================================================
   Cada alerta: { tipo, ico, titulo, detalle, ruta, prioridad }
   prioridad: 1 alta (roja), 2 media (ámbar), 3 informativa
   ============================================================ */

const Alertas = {

  /** Nº de faltas en 30 días que dispara una alerta de reincidencia. */
  FALTAS_REINCIDENCIA: 3,

  /* ---------- alertas atendidas ---------- */

  /**
   * Marca una alerta como atendida para que deje de mostrarse.
   * La clave incluye la gravedad de la situación, de modo que si esta empeora
   * (un día más de atraso, una falta más) la alerta vuelve a aparecer.
   */
  marcarVista(clave) {
    const vistas = Object.assign({}, DB.config.alertasVistas || {});
    vistas[clave] = U.hoy();
    DB.guardarConfig({ alertasVistas: vistas });
  },

  restaurarTodas() {
    DB.guardarConfig({ alertasVistas: {} });
  },

  estaVista(clave) {
    return !!(DB.config.alertasVistas || {})[clave];
  },

  /** Alertas que aún no han sido atendidas. */
  pendientes() {
    return Alertas.todas().filter(a => !Alertas.estaVista(a.clave));
  },

  atendidas() {
    return Alertas.todas().filter(a => Alertas.estaVista(a.clave));
  },

  todas() {
    const out = [];
    const hoy = U.hoy();

    /* --- 1. Retornos atrasados --- */
    DB.salidasAbiertas().forEach(s => {
      if (!DB.retornoAtrasado(s)) return;
      const r = DB.residente(s.residenteId);
      const atraso = U.dias(s.fechaRetornoPrev, hoy);
      out.push({
        tipo: 'salida',
        clave: `salida:${s.id}:${atraso}`,
        prioridad: 1,
        ico: '🚨',
        titulo: `${r.nombre} no ha retornado al centro`,
        detalle: `Salió el ${U.fecha(s.fechaSalida)} por "${s.tipo}". Retorno previsto: ${U.fecha(s.fechaRetornoPrev)}` +
          (atraso > 0 ? ` (${U.plural(atraso, 'día de atraso', 'días de atraso')}).` : ' (hora vencida).'),
        ruta: `#/residente/${r.id}`
      });
    });

    /* --- 2. Faltas graves recientes --- */
    const desde7 = U.sumaDias(hoy, -7);
    DB.todos('conductas')
      .filter(c => c.fecha >= desde7 && (c.gravedad === 'Grave' || c.gravedad === 'Gravísima'))
      .sort(U.porFechaDesc())
      .forEach(c => {
        const r = DB.residente(c.residenteId);
        if (!r) return;
        out.push({
          tipo: 'conducta',
          clave: `conducta:${c.id}`,
          prioridad: c.gravedad === 'Gravísima' ? 1 : 2,
          ico: c.gravedad === 'Gravísima' ? '🔴' : '⚠️',
          titulo: `Falta ${c.gravedad.toLowerCase()} de ${r.nombre}`,
          detalle: `${c.tipoFalta} · ${U.fecha(c.fecha)}${c.medida ? ' · Medida: ' + c.medida : ' · Sin medida registrada'}`,
          ruta: `#/residente/${r.id}`
        });
      });

    /* --- 3. Reincidencia conductual --- */
    DB.activos().forEach(r => {
      const faltas = DB.faltasRecientes(r.id, 30);
      if (faltas.length >= Alertas.FALTAS_REINCIDENCIA) {
        const peso = U.suma(faltas, f => DB.pesoFalta(f.gravedad));
        out.push({
          tipo: 'reincidencia',
          clave: `reincidencia:${r.id}:${faltas.length}`,
          prioridad: 2,
          ico: '📈',
          titulo: `${r.nombre} acumula ${faltas.length} faltas en 30 días`,
          detalle: `Puntaje de gravedad acumulado: ${peso}. Se sugiere evaluación por el equipo técnico.`,
          ruta: `#/residente/${r.id}`
        });
      }
    });

    /* --- 4. Tareas pendientes vencidas --- */
    const vencidas = DB.todos('tareas').filter(t => t.estado === 'Pendiente' && t.fecha < hoy);
    if (vencidas.length) {
      out.push({
        tipo: 'tarea',
        clave: `tarea:vencidas:${vencidas.length}`,
        prioridad: 3,
        ico: '🧹',
        titulo: `${vencidas.length} ${vencidas.length === 1 ? 'tarea pendiente vencida' : 'tareas pendientes vencidas'}`,
        detalle: 'Hay tareas asignadas cuya fecha ya pasó y siguen sin evaluar.',
        ruta: '#/tareas'
      });
    }

    /* --- 5. Exceso de llamadas --- */
    const max = Number(DB.config.maxLlamadasDia) || 0;
    if (max > 0) {
      const desde = U.sumaDias(hoy, -7);
      const porDia = {};
      DB.todos('llamadas').filter(l => l.fecha >= desde).forEach(l => {
        const k = l.residenteId + '|' + l.fecha;
        porDia[k] = (porDia[k] || 0) + (Number(l.cantidad) || 0);
      });
      Object.keys(porDia).forEach(k => {
        if (porDia[k] <= max) return;
        const [rid, fecha] = k.split('|');
        const r = DB.residente(rid);
        if (!r) return;
        out.push({
          tipo: 'llamada',
          clave: `llamada:${rid}:${fecha}:${porDia[k]}`,
          prioridad: 3,
          ico: '📞',
          titulo: `${r.nombre} superó el máximo de llamadas`,
          detalle: `${porDia[k]} llamadas el ${U.fecha(fecha)} (máximo configurado: ${max}).`,
          ruta: `#/residente/${r.id}`
        });
      });
    }

    /* --- 6. Residentes próximos a progresar de etapa --- */
    DB.activos().forEach(r => {
      const p = DB.progresoEtapa(r);

      /* El tiempo de tratamiento manda: si la etapa registrada quedó atrás,
         el aviso es que corresponde actualizarla. */
      if (p.desfase > 0) {
        out.push({
          tipo: 'etapa',
          clave: `etapa:${r.id}:desfase:${p.corresponde}`,
          prioridad: 2,
          ico: '⏱️',
          titulo: `${r.nombre} debería estar en ${p.corresponde}`,
          detalle: `Lleva ${p.diasTratamiento} días de tratamiento y figura en ${p.etapa}. ` +
            `Corresponde actualizar su etapa (${U.plural(p.desfase, 'etapa', 'etapas')} de diferencia).`,
          ruta: '#/evoluciones'
        });
        return;
      }

      /* Etapa optativa (Nivel 3): el tiempo habilita la opción, no la impone. */
      if (p.optativa) {
        const listas = p.optativa.opciones.filter(o => o.disponible);
        if (listas.length) {
          out.push({
            tipo: 'etapa',
            clave: `optativa:${r.id}:${listas.length}`,
            prioridad: 3,
            ico: '🤝',
            titulo: `${r.nombre} puede optar a ${p.optativa.etapa}`,
            detalle: `Lleva ${p.diasTratamiento} días de tratamiento (${DB.meses(p.diasTratamiento)} meses). ` +
              `Modalidades disponibles: ${listas.map(o => `${o.v} (${o.meses} meses)`).join(' y ')}.`,
            ruta: '#/evoluciones'
          });
        }
        // No se insiste con «cumplió el plazo»: entrar a Nivel 3 es optativo.
        return;
      }

      if (p.estado !== 'proximo' && p.estado !== 'cumplido') return;
      if (!p.siguiente) return;
      const cumplido = p.estado === 'cumplido';
      out.push({
        tipo: 'etapa',
        clave: `etapa:${r.id}:${p.etapa}:${cumplido ? 'cumplido' : 'proximo'}`,
        prioridad: 2,
        ico: cumplido ? '⬆️' : '📅',
        titulo: cumplido
          ? `${r.nombre} cumplió el plazo de ${p.etapa}`
          : `${r.nombre} está próximo a progresar`,
        detalle: cumplido
          ? `Lleva ${p.dias} días en ${p.etapa} (plazo: ${p.requerido}). Corresponde evaluar el paso a ${p.siguiente}.`
          : `Faltan ${U.plural(p.restante, 'día', 'días')} para completar ${p.etapa} y pasar a ${p.siguiente}.`,
        ruta: '#/evoluciones'
      });
    });

    return out.sort((a, b) => a.prioridad - b.prioridad);
  },

  /** Alertas de conducta e incidentes pendientes (para el panel de conducta). */
  deConducta() {
    return Alertas.pendientes().filter(a => a.tipo === 'conducta' || a.tipo === 'reincidencia');
  },

  render(lista, opts) {
    opts = opts || {};
    if (!lista.length) {
      const atendidas = Alertas.atendidas().length;
      return `<div class="empty" style="padding:30px">
        <div class="big">✅</div>
        <div style="font-weight:600;color:var(--text-soft)">Sin alertas pendientes</div>
        <p>No hay situaciones que requieran atención en este momento.</p>
        ${atendidas ? `<button class="btn btn-sm" data-action="restaurar-alertas">
          ↺ Volver a mostrar ${U.plural(atendidas, 'alerta atendida', 'alertas atendidas')}</button>` : ''}
      </div>`;
    }
    const limite = opts.limite || lista.length;
    return lista.slice(0, limite).map(a => {
      // El botón solo se ofrece si la cuenta puede abrir esa sección.
      const seccion = String(a.ruta || '').replace(/^#\//, '').split('/')[0];
      const accesible = Auth.puede(seccion);
      return `
      <div class="alert-item">
        <div class="ai-ico">${a.ico}</div>
        <div class="ai-c">
          <div class="ai-t">${U.esc(a.titulo)}</div>
          <div class="ai-d">${U.esc(a.detalle)}</div>
        </div>
        <div class="ai-a">
          <button class="btn btn-sm" data-action="ver-alerta"
                  data-clave="${U.esc(a.clave)}"
                  data-ruta="${accesible ? U.esc(a.ruta) : ''}"
                  title="${accesible ? 'Ir al detalle y marcar como atendida' : 'Marcar como atendida'}">
            ${accesible ? 'Ver' : 'Visto'}
          </button>
        </div>
      </div>`;
    }).join('') +
      (lista.length > limite
        ? `<div class="alert-item"><div class="ai-d" style="margin:0 auto">
             y ${lista.length - limite} alerta(s) más…</div></div>`
        : '');
  }
};

/* Al pulsar «Ver» la alerta se marca como atendida y desaparece del panel.
   Si la situación empeora (otro día de atraso, una falta más) vuelve a
   aparecer, porque la clave de la alerta cambia. */
Acciones['ver-alerta'] = d => {
  Alertas.marcarVista(d.clave);
  if (d.ruta) {
    location.hash = d.ruta;
    App.enrutar();
  } else {
    UI.toast('Alerta marcada como atendida.');
    App.pintar();
  }
};

Acciones['restaurar-alertas'] = () => {
  Alertas.restaurarTodas();
  UI.toast('Se volvieron a mostrar todas las alertas.');
  App.pintar();
};
