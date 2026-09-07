/* ============================================================
   app.js — enrutador, navegación, acciones globales
   ============================================================ */

/** Registro de vistas: cada módulo agrega su entrada aquí.
 *  { titulo, sub, acciones()->html, render(params)->html, luego(params) } */
const Vistas = {};

/** Registro de acciones delegadas: data-action="nombre" */
const Acciones = {};

const App = {

  params: {},
  rutaActual: '',

  /* ---------- arranque ---------- */

  iniciar() {
    document.documentElement.setAttribute('data-theme', DB.config.tema || 'light');

    // El logotipo del centro también se usa como icono de la pestaña.
    const favicon = document.getElementById('favicon');
    if (favicon && typeof LOGO === 'string') favicon.href = LOGO;

    // La primera vez en un equipo se carga la nómina de residentes del centro.
    if (typeof NOMINA !== 'undefined') NOMINA.autoCargar();

    // Cuentas de acceso: se crean la primera vez, después de la nómina para
    // poder vincularlas con los residentes de Nivel 1 y Nivel 2.
    if (!DB.config.cuentasCreadas) Auth.sembrarCuentas();

    window.addEventListener('hashchange', App.enrutar);

    if (!DB.almacenamientoOK) {
      UI.toast('Este navegador bloquea el almacenamiento local. Los datos no se conservarán.', 'err');
    }

    // Si se pulsa un enlace que apunta a la dirección actual, el navegador no
    // emite hashchange: se vuelve a pintar a mano para reaplicar sus filtros.
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#/"]');
      if (a && a.getAttribute('href') === location.hash) {
        e.preventDefault();
        App.enrutar();
      }
    });

    // Delegación de clics
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const fn = Acciones[el.dataset.action];
      if (!fn) return;
      e.preventDefault();
      fn(el.dataset, el, e);
    });

    // Delegación de cambios en filtros
    document.addEventListener('input', e => {
      const el = e.target.closest('[data-filtro]');
      if (el) App.refrescar();
    });
    document.addEventListener('change', e => {
      const el = e.target.closest('[data-filtro]');
      if (el) App.refrescar();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && UI._stack.length) {
        UI._stack[UI._stack.length - 1]._cerrar();
      }
    });

    // Nada se muestra mientras no haya una sesión válida.
    if (Auth.sesion()) {
      document.getElementById('app').hidden = false;
      Auth.entrarALaApp();
    } else {
      Auth.pantallaLogin();
    }
  },

  /* ---------- enrutado ---------- */

  /** Lee los filtros que vienen en el enlace: #/residentes?estado=presentes */
  parseConsulta(s) {
    const o = {};
    if (!s) return o;
    s.split('&').forEach(par => {
      if (!par) return;
      const i = par.indexOf('=');
      const k = decodeURIComponent(i < 0 ? par : par.slice(0, i));
      const v = i < 0 ? '' : decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' '));
      if (k) o[k] = v;
    });
    return o;
  },

  enrutar() {
    const bruto = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const corte = bruto.indexOf('?');
    const camino = corte < 0 ? bruto : bruto.slice(0, corte);
    const consulta = corte < 0 ? '' : bruto.slice(corte + 1);

    const partes = camino.split('/');
    let ruta = partes[0] || 'dashboard';

    // Sin permiso para la sección se redirige a la primera disponible del rol.
    if (!Auth.puede(ruta)) {
      const destino = Auth.rutaInicial();
      if (ruta !== destino) {
        if (Vistas[ruta]) UI.toast('Su cuenta no tiene acceso a esa sección.', 'warn');
        ruta = destino;
        if (location.hash !== '#/' + destino) location.hash = '#/' + destino;
      }
    }

    App.params = { id: partes[1] || null, sub: partes[2] || null };
    App.rutaActual = ruta;

    const v = Vistas[ruta] || Vistas.dashboard;
    // Los filtros son propios de cada vista y se toman del propio enlace,
    // de modo que los indicadores del Dashboard puedan abrir una sección
    // ya filtrada.
    App.filtros = App.parseConsulta(consulta);
    App.rutaPrevia = ruta;
    App.vistaActual = v;

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.ruta === (v.nav || ruta));
    });
    App.menu(false);

    App.pintar();
    window.scrollTo(0, 0);
  },

  pintar() {
    const v = App.vistaActual;
    const p = App.params;
    document.getElementById('titulo').textContent =
      typeof v.titulo === 'function' ? v.titulo(p) : v.titulo;
    document.getElementById('subtitulo').innerHTML =
      typeof v.sub === 'function' ? v.sub(p) : (v.sub || '');
    document.getElementById('acciones-vista').innerHTML =
      v.acciones ? v.acciones(p) : '';
    document.getElementById('vista').innerHTML = v.render(p);
    if (v.luego) v.luego(p);
    App.pintarSidebar();
  },

  /** Vuelve a renderizar la vista actual conservando filtros, foco y cursor. */
  refrescar() {
    const filtros = {};
    document.querySelectorAll('[data-filtro]').forEach(el => { filtros[el.dataset.filtro] = el.value; });
    App.filtros = filtros;

    const activo = document.activeElement;
    const foco = activo && activo.dataset ? activo.dataset.filtro : null;
    const caret = activo && typeof activo.selectionStart === 'number' ? activo.selectionStart : null;

    App.pintar();

    if (foco) {
      const el = document.querySelector(`[data-filtro="${foco}"]`);
      if (el) {
        el.focus();
        if (caret !== null && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(caret, caret); } catch (e) { /* tipos sin selección */ }
        }
      }
    }
  },

  filtros: {},
  f(nombre, def) {
    const v = App.filtros[nombre];
    return v === undefined || v === null ? (def || '') : v;
  },

  ir(ruta) { location.hash = '#/' + ruta; },

  /* ---------- barra lateral ---------- */

  /* Cada contador cuenta solo lo que corresponde a su propia sección:
     el del Dashboard resume todas las alertas, el de Conducta muestra
     únicamente las alertas conductuales. */
  NAV: [
    { g: 'General' },
    {
      r: 'dashboard', l: 'Dashboard', i: '📊',
      badge: () => Alertas.pendientes().length,
      titulo: n => `${n} alerta(s) pendiente(s) de atender`
    },
    { r: 'residentes', l: 'Residentes', i: '👥' },
    { g: 'Registro diario' },
    {
      r: 'evoluciones', l: 'Evoluciones', i: '📈',
      badge: () => DB.activos().filter(r => {
        const p = DB.progresoEtapa(r);
        return p.desfase > 0 || p.estado === 'cumplido';
      }).length,
      titulo: n => `${n} residente(s) con la etapa por actualizar o con el plazo ya cumplido`
    },
    {
      r: 'conducta', l: 'Conducta', i: '⚠️',
      badge: () => Alertas.deConducta().length,
      titulo: n => `${n} alerta(s) de conducta: faltas graves de los últimos 7 días y reincidencias`
    },
    { r: 'salidas', l: 'Salidas y retornos', i: '🚪' },
    { r: 'llamadas', l: 'Llamadas', i: '📞' },
    { r: 'tareas', l: 'Tareas y brigadas', i: '🧹' },
    { g: 'Documentación' },
    { r: 'reportes', l: 'Reportes', i: '📄' },
    { g: 'Administración' },
    { r: 'usuarios', l: 'Usuarios y accesos', i: '🔑' },
    { r: 'configuracion', l: 'Configuración', i: '⚙️' }
  ],

  pintarSidebar() {
    // Solo se muestran las secciones a las que la cuenta tiene acceso. El
    // título de un grupo se emite recién cuando aparece su primera sección
    // visible, para no dejar encabezados sueltos.
    const menu = [];
    let grupoPendiente = null;
    App.NAV.forEach(n => {
      if (n.g) { grupoPendiente = n; return; }
      if (!Auth.puede(n.r)) return;
      if (grupoPendiente) { menu.push(grupoPendiente); grupoPendiente = null; }
      menu.push(n);
    });

    document.getElementById('nav').innerHTML = menu.map(n => {
      if (n.g) return `<div class="nav-label">${U.esc(n.g)}</div>`;
      const cuenta = n.badge ? n.badge() : 0;
      const badge = cuenta ? `<span class="badge-count">${cuenta}</span>` : '';
      const titulo = cuenta && n.titulo ? ` title="${U.esc(n.titulo(cuenta))}"` : '';
      return `<a class="nav-item" href="#/${n.r}" data-ruta="${n.r}"${titulo}>
        <span class="ico">${n.i}</span><span>${U.esc(n.l)}</span>${badge}</a>`;
    }).join('');
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.ruta === (App.vistaActual && App.vistaActual.nav || App.rutaActual));
    });
    document.getElementById('nombre-centro').textContent = DB.config.centro;
    document.getElementById('lema-centro').textContent = DB.config.lema || 'Gestión de residentes';

    const logo = document.getElementById('logo-centro');
    if (logo && logo.src !== LOGO) logo.src = LOGO;

    // Bloque de sesión al pie del menú
    const s = Auth.sesion();
    const caja = document.getElementById('sesion');
    if (caja) {
      caja.innerHTML = s ? `
        <button type="button" class="sesion-chip" data-action="cambiar-clave"
                title="Cambiar mi contraseña">
          <span class="avatar" style="width:28px;height:28px;flex-basis:28px;font-size:11px">
            ${U.esc(U.iniciales(s.nombre))}</span>
          <span style="min-width:0">
            <span class="sesion-nombre">${U.esc(s.nombre)}</span>
            <span class="sesion-rol">${s.rol === 'total' ? 'Acceso total' : 'Acceso limitado'}</span>
          </span>
        </button>` : '';
    }
  },

  /* ---------- ayudas comunes ---------- */

  /** <select> de residentes para formularios. */
  opcionesResidentes(incluirEgresados) {
    const rs = (incluirEgresados ? DB.todos('residentes') : DB.activos())
      .slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
    return rs.map(r => ({ v: r.id, l: r.nombre + (r.estado === 'Egresado' ? ' (egresado)' : '') }));
  },

  /** Enlace a la ficha de un residente; texto plano si la cuenta no puede abrirla. */
  enlaceResidente(id) {
    const r = DB.residente(id);
    if (!r) return `<span class="faint">Residente eliminado</span>`;
    if (!Auth.puede('residente')) return U.esc(r.nombre);
    return `<a href="#/residente/${r.id}">${U.esc(r.nombre)}</a>`;
  },

  /* Color por familia de etapa: grupos (azul), niveles (verde institucional),
     cargos de responsabilidad (morado y verde). */
  COLORES_ETAPA: {
    'Compromiso': 'b-gray',
    'Grupo 4': 'b-info', 'Grupo 3': 'b-info', 'Grupo 2': 'b-info', 'Grupo 1': 'b-info',
    'Nivel 1': 'b-primary', 'Nivel 2': 'b-primary', 'Nivel 3': 'b-primary',
    'Reeducado': 'b-purple', 'Delegado': 'b-purple', 'Encargado de Casa': 'b-purple',
    'Asistente': 'b-ok', 'Operador': 'b-ok'
  },

  badgeEtapa(etapa) {
    const cls = App.COLORES_ETAPA[etapa] || 'b-gray';
    return `<span class="badge ${cls}">${U.esc(etapa || 'Sin etapa')}</span>`;
  },

  badgeEstadoResidente(r) {
    if (r.estado === 'Egresado') return `<span class="badge b-gray">Egresado</span>`;
    const s = DB.salidaAbierta(r.id);
    if (s) {
      return DB.retornoAtrasado(s)
        ? `<span class="badge b-danger">Retorno atrasado</span>`
        : `<span class="badge b-warn">Fuera del centro</span>`;
    }
    return `<span class="badge b-ok">Presente</span>`;
  },

  badgeGravedad(g) {
    const cls = { 'Leve': 'b-warn', 'Grave': 'b-danger', 'Gravísima': 'b-danger' }[g] || 'b-gray';
    return `<span class="badge ${cls}">${U.esc(g || '—')}</span>`;
  },

  badgeEstadoTarea(e) {
    const cls = {
      'Cumplida': 'b-ok', 'Cumplida parcialmente': 'b-warn',
      'No cumplida': 'b-danger', 'Pendiente': 'b-gray'
    }[e] || 'b-gray';
    return `<span class="badge ${cls}">${U.esc(e || '—')}</span>`;
  },

  /** Barra de herramientas estándar: búsqueda + filtros extra. */
  toolbar(partes) {
    return `<div class="toolbar">${partes.join('')}</div>`;
  },

  buscador(ph) {
    return `<div class="search"><input type="search" data-filtro="q" value="${U.esc(App.f('q'))}"
      placeholder="${U.esc(ph || 'Buscar…')}"></div>`;
  },

  selectFiltro(nombre, etiquetaVacia, opciones, valorActual) {
    const v = valorActual !== undefined ? valorActual : App.f(nombre);
    return `<select data-filtro="${nombre}">
      <option value="">${U.esc(etiquetaVacia)}</option>
      ${opciones.map(o => {
        const val = typeof o === 'object' ? o.v : o;
        const lab = typeof o === 'object' ? o.l : o;
        return `<option value="${U.esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${U.esc(lab)}</option>`;
      }).join('')}
    </select>`;
  },

  /** Botones de edición/eliminación para filas de tabla.
   *  Eliminar queda reservado a las cuentas con acceso total. */
  accionesFila(col, id, etiqueta) {
    return `<button class="btn btn-sm btn-ghost" data-action="editar-${col}" data-id="${id}" title="Editar">✏️</button>` +
      (Auth.esTotal()
        ? `<button class="btn btn-sm btn-ghost" data-action="eliminar" data-col="${col}" data-id="${id}"
             data-etiqueta="${U.esc(etiqueta || 'este registro')}" title="Eliminar">🗑️</button>`
        : '');
  }
};

/* ---------- acciones globales ---------- */

Acciones['eliminar'] = d => {
  if (!Auth.esTotal()) {
    return UI.toast('Su cuenta no puede eliminar registros. Solicítelo a la dirección.', 'err');
  }
  UI.confirmar({
    title: 'Eliminar registro',
    peligro: true,
    submit: 'Eliminar',
    body: `¿Seguro que desea eliminar <b>${U.esc(d.etiqueta)}</b>?<br>
      <span class="muted small">Esta acción no se puede deshacer.</span>`,
    onSubmit: () => {
      DB.eliminar(d.col, d.id);
      UI.toast('Registro eliminado.');
      App.pintar();
    }
  });
};

Acciones['tema'] = () => {
  const nuevo = (DB.config.tema === 'dark') ? 'light' : 'dark';
  DB.guardarConfig({ tema: nuevo });
  document.documentElement.setAttribute('data-theme', nuevo);
};

/* ---------- menú lateral en móvil ---------- */

App.menu = function (abrir) {
  const lateral = document.querySelector('.sidebar');
  const scrim = document.getElementById('scrim');
  const abierto = abrir === undefined ? !lateral.classList.contains('open') : abrir;
  lateral.classList.toggle('open', abierto);
  if (scrim) scrim.hidden = !abierto;
  // No se libera el scroll si hay un modal abierto, que también lo bloquea.
  if (abierto) document.body.style.overflow = 'hidden';
  else if (!UI._stack.length) document.body.style.overflow = '';
};

Acciones['menu'] = () => App.menu();
Acciones['cerrar-menu'] = () => App.menu(false);

Acciones['imprimir'] = () => window.print();

document.addEventListener('DOMContentLoaded', App.iniciar);
