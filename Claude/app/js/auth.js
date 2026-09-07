/* ============================================================
   auth.js — cuentas de acceso y permisos por rol
   ============================================================
   IMPORTANTE — alcance de este control de acceso:

   La aplicación funciona sin servidor: todo ocurre en el navegador
   del equipo. Por lo tanto este inicio de sesión separa roles y
   evita cambios accidentales, pero NO es una barrera de seguridad
   frente a alguien con conocimientos: quien tenga el archivo puede
   inspeccionarlo con las herramientas del navegador.

   Las contraseñas no se guardan en texto plano: se almacena un
   resumen (SHA-256 con sal, aplicado en varias vueltas).

   Para una protección real haría falta un servidor con base de
   datos y sesiones, además de cifrar el equipo donde se usa.
   ============================================================ */

/* ---------- SHA-256 (implementación propia, sin dependencias) ---------- */

const SHA256 = (() => {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  /** Texto a bytes UTF-8. */
  function utf8(s) {
    const b = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 0x80) b.push(c);
      else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {
        const c2 = s.charCodeAt(++i);
        const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
        b.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return b;
  }

  return function (texto) {
    const bytes = utf8(texto);
    const bits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push(0, 0, 0, 0,
      (bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);

    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Array(64);

    for (let i = 0; i < bytes.length; i += 64) {
      for (let j = 0; j < 16; j++) {
        w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) |
          (bytes[i + j * 4 + 2] << 8) | bytes[i + j * 4 + 3];
      }
      for (let j = 16; j < 64; j++) {
        const a15 = w[j - 15], a2 = w[j - 2];
        const s0 = rotr(a15, 7) ^ rotr(a15, 18) ^ (a15 >>> 3);
        const s1 = rotr(a2, 17) ^ rotr(a2, 19) ^ (a2 >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }

      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let j = 0; j < 64; j++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    return H.map(x => ('00000000' + x.toString(16)).slice(-8)).join('');
  };
})();


/* ============================================================
   Auth — sesión, cuentas y permisos
   ============================================================ */

const Auth = {

  CLAVE_SESION: 'crc_sesion',
  VUELTAS: 3000,

  /* ---------- roles y permisos ---------- */

  ROLES: [
    { v: 'total', l: 'Acceso total' },
    { v: 'limitado', l: 'Acceso limitado (tareas, llamadas, salidas y conducta)' }
  ],

  SECCIONES: {
    total: ['dashboard', 'residentes', 'residente', 'evoluciones', 'conducta',
      'salidas', 'llamadas', 'tareas', 'reportes', 'usuarios', 'configuracion'],
    limitado: ['tareas', 'llamadas', 'salidas', 'conducta']
  },

  etiquetaRol(rol) {
    const r = Auth.ROLES.find(x => x.v === rol);
    return r ? r.l : rol;
  },

  /* ---------- contraseñas ---------- */

  sal() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  },

  /** Resumen con sal, repetido varias vueltas para encarecer la prueba a ciegas. */
  resumen(clave, sal) {
    let h = SHA256(sal + '|' + clave);
    for (let i = 0; i < Auth.VUELTAS; i++) h = SHA256(h + sal);
    return h;
  },

  /* ---------- cuentas ---------- */

  usuarios() {
    return DB.todos('usuarios');
  },

  porNombre(usuario) {
    const u = U.norm(usuario).trim();
    return Auth.usuarios().find(x => U.norm(x.usuario) === u) || null;
  },

  /**
   * Genera un nombre de usuario libre a partir del nombre de la persona:
   * primer nombre + primer apellido.
   *
   * En el uso chileno los dos últimos términos suelen ser los apellidos, de
   * modo que con cuatro o más palabras el primer apellido es el penúltimo.
   * Con tres palabras el reparto es ambiguo ("Clemente Donoso Barthe" frente a
   * "Julio César Sierralta"), así que se toma la última. El nombre de usuario
   * se puede corregir después desde Usuarios y accesos.
   */
  nombreDeUsuario(nombreCompleto) {
    const partes = U.norm(nombreCompleto).replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    const apellido = partes.length >= 4 ? partes[partes.length - 2] : partes[partes.length - 1];
    let base = (partes[0] || 'usuario') + (partes.length > 1 ? '.' + apellido : '');
    let nombre = base, n = 2;
    while (Auth.porNombre(nombre)) nombre = base + n++;
    return nombre;
  },

  crearUsuario(datos) {
    const sal = Auth.sal();
    return DB.crear('usuarios', {
      usuario: datos.usuario,
      nombre: datos.nombre,
      rol: datos.rol,
      cargo: datos.cargo || '',
      residenteId: datos.residenteId || '',
      sal: sal,
      hash: Auth.resumen(datos.clave, sal),
      debeCambiar: datos.debeCambiar !== false,
      activo: true
    });
  },

  definirClave(id, clave, debeCambiar) {
    const sal = Auth.sal();
    DB.actualizar('usuarios', id, {
      sal: sal,
      hash: Auth.resumen(clave, sal),
      debeCambiar: !!debeCambiar
    });
  },

  /**
   * Crea las cuentas iniciales: dirección, asistente y delegado con acceso
   * total, y una cuenta por cada residente de Nivel 1 y Nivel 2 con acceso
   * limitado. La contraseña inicial es el propio nombre de usuario y debe
   * cambiarse en el primer ingreso.
   */
  sembrarCuentas() {
    const creadas = [];

    const alta = (usuario, nombre, rol, cargo, residenteId) => {
      if (Auth.porNombre(usuario)) return;
      Auth.crearUsuario({ usuario, nombre, rol, cargo, residenteId, clave: usuario, debeCambiar: true });
      creadas.push(usuario);
    };

    // Cuentas con acceso total
    const conCargo = cargo => DB.activos().find(r => r.etapa === cargo);
    const asistente = conCargo('Asistente');
    const delegado = conCargo('Delegado');

    alta('director', 'Dirección del centro', 'total', 'Director', '');
    alta('asistente', asistente ? asistente.nombre : 'Asistente', 'total', 'Asistente',
      asistente ? asistente.id : '');
    alta('delegado', delegado ? delegado.nombre : 'Delegado', 'total', 'Delegado',
      delegado ? delegado.id : '');

    // Una cuenta por cada residente de Nivel 1 y Nivel 2
    creadas.push(...Auth.crearCuentasNiveles());

    if (creadas.length) DB.guardarConfig({ cuentasCreadas: true });
    return creadas;
  },

  /** Crea las cuentas que falten para los residentes de Nivel 1 y Nivel 2. */
  crearCuentasNiveles() {
    const creadas = [];
    const conCuenta = new Set(Auth.usuarios().map(u => u.residenteId).filter(Boolean));

    DB.activos()
      .filter(r => r.etapa === 'Nivel 1' || r.etapa === 'Nivel 2')
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(r => {
        if (conCuenta.has(r.id)) return;
        const usuario = Auth.nombreDeUsuario(r.nombre);
        Auth.crearUsuario({
          usuario, nombre: r.nombre, rol: 'limitado', cargo: r.etapa,
          residenteId: r.id, clave: usuario, debeCambiar: true
        });
        creadas.push(usuario);
      });

    return creadas;
  },

  /* ---------- sesión ---------- */

  _sesion: null,

  sesion() {
    if (Auth._sesion) return Auth._sesion;
    try {
      const id = sessionStorage.getItem(Auth.CLAVE_SESION);
      if (!id) return null;
      const u = DB.obtener('usuarios', id);
      if (!u || !u.activo) return null;
      Auth._sesion = u;
      return u;
    } catch (e) {
      return null;
    }
  },

  entrar(usuario, clave) {
    const u = Auth.porNombre(usuario);
    if (!u || !u.activo) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    if (Auth.resumen(clave, u.sal) !== u.hash) {
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    }
    Auth._sesion = u;
    try { sessionStorage.setItem(Auth.CLAVE_SESION, u.id); } catch (e) { /* sin sessionStorage */ }
    DB.actualizar('usuarios', u.id, { ultimoIngreso: new Date().toISOString() });
    return { ok: true, usuario: u };
  },

  salir() {
    Auth._sesion = null;
    try { sessionStorage.removeItem(Auth.CLAVE_SESION); } catch (e) { /* ignorar */ }
  },

  /* ---------- permisos ---------- */

  rol() {
    const s = Auth.sesion();
    return s ? s.rol : null;
  },

  esTotal() {
    return Auth.rol() === 'total';
  },

  /** ¿La sesión actual puede entrar a esta sección? */
  puede(ruta) {
    const rol = Auth.rol();
    if (!rol) return false;
    return (Auth.SECCIONES[rol] || []).includes(ruta);
  },

  /** Primera sección disponible para el rol actual. */
  rutaInicial() {
    const rol = Auth.rol();
    if (rol === 'total') return 'dashboard';
    return (Auth.SECCIONES[rol] || ['tareas'])[0];
  },

  /* ---------- pantalla de acceso ---------- */

  pantallaLogin(mensaje) {
    document.getElementById('app').hidden = true;
    const cont = document.getElementById('login-root');
    cont.hidden = false;
    cont.innerHTML = `
      <form class="login-caja" id="form-login" novalidate>
        <div class="login-marca">
          <img src="${LOGO}" alt="">
          <div>
            <div class="login-centro">${U.esc(DB.config.centro)}</div>
            <div class="login-sub">${U.esc(DB.config.lema || 'Gestión de residentes')}</div>
          </div>
        </div>

        <h2>Iniciar sesión</h2>
        <p class="login-texto">Ingrese con la cuenta que le entregó la dirección del centro.</p>

        <div class="field">
          <label for="lg-usuario">Usuario</label>
          <input type="text" id="lg-usuario" name="usuario" autocomplete="username"
                 autocapitalize="none" spellcheck="false" placeholder="ej: director">
        </div>
        <div class="field" style="margin-top:12px">
          <label for="lg-clave">Contraseña</label>
          <input type="password" id="lg-clave" name="clave" autocomplete="current-password">
        </div>

        <div class="login-error" id="lg-error" ${mensaje ? '' : 'hidden'}>${U.esc(mensaje || '')}</div>

        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:16px">
          Entrar
        </button>

        <div class="login-pie">
          Control de acceso local: separa los roles dentro del centro, pero no reemplaza
          proteger el equipo con contraseña de usuario.
        </div>
      </form>`;

    const form = document.getElementById('form-login');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const datos = UI.datos(form);
      const err = document.getElementById('lg-error');
      if (!datos.usuario || !datos.clave) {
        err.hidden = false;
        err.textContent = 'Escriba su usuario y su contraseña.';
        return;
      }
      const r = Auth.entrar(datos.usuario, datos.clave);
      if (!r.ok) {
        err.hidden = false;
        err.textContent = r.error;
        document.getElementById('lg-clave').value = '';
        document.getElementById('lg-clave').focus();
        return;
      }
      cont.hidden = true;
      cont.innerHTML = '';
      document.getElementById('app').hidden = false;
      Auth.entrarALaApp();
    });

    setTimeout(() => document.getElementById('lg-usuario').focus(), 40);
  },

  /** Arranca la aplicación una vez validada la sesión. */
  entrarALaApp() {
    const u = Auth.sesion();
    App.pintarSidebar();
    if (!Auth.puede(App.rutaActual)) location.hash = '#/' + Auth.rutaInicial();
    App.enrutar();
    UI.toast(`Sesión iniciada como ${u.nombre}.`);
    if (u.debeCambiar) setTimeout(() => Auth.cambiarClave(true), 400);
  },

  cerrarSesion() {
    UI.confirmar({
      title: 'Cerrar sesión',
      body: '¿Desea salir de su cuenta?',
      submit: 'Cerrar sesión',
      onSubmit: () => {
        Auth.salir();
        location.hash = '#/';
        Auth.pantallaLogin();
      }
    });
  },

  /* ---------- cambio de contraseña ---------- */

  cambiarClave(obligatorio) {
    const u = Auth.sesion();
    if (!u) return;
    UI.modal({
      title: obligatorio ? 'Defina su contraseña' : 'Cambiar contraseña',
      sub: u.nombre,
      size: 'narrow',
      cancel: obligatorio ? 'Más tarde' : 'Cancelar',
      submit: 'Guardar contraseña',
      body: `
        ${obligatorio ? `<div class="note warn" style="margin-bottom:14px">
          Su cuenta todavía usa la contraseña inicial. Defina una propia antes de
          seguir trabajando.</div>` : ''}
        ${UI.campos([
          { n: 'actual', l: 'Contraseña actual', t: 'password', w: 12, req: true },
          { n: 'nueva', l: 'Contraseña nueva', t: 'password', w: 12, req: true,
            help: 'Al menos 6 caracteres.' },
          { n: 'repetir', l: 'Repita la contraseña nueva', t: 'password', w: 12, req: true }
        ])}`,
      onSubmit: d => {
        if (Auth.resumen(d.actual, u.sal) !== u.hash) {
          UI.toast('La contraseña actual no es correcta.', 'err');
          return false;
        }
        if (String(d.nueva).length < 6) {
          UI.toast('La contraseña nueva debe tener al menos 6 caracteres.', 'err');
          return false;
        }
        if (d.nueva !== d.repetir) {
          UI.toast('Las contraseñas nuevas no coinciden.', 'err');
          return false;
        }
        Auth.definirClave(u.id, d.nueva, false);
        Auth._sesion = DB.obtener('usuarios', u.id);
        UI.toast('Contraseña actualizada.');
        App.pintar();
      }
    });
  },

  /* ---------- administración de cuentas ---------- */

  nuevaCuenta() {
    UI.modal({
      title: 'Nueva cuenta de acceso',
      size: 'wide',
      submit: 'Crear cuenta',
      body: UI.campos([
        { n: 'nombre', l: 'Nombre de la persona', t: 'text', w: 7, req: true },
        { n: 'cargo', l: 'Cargo o nivel', t: 'text', w: 5 },
        { n: 'usuario', l: 'Usuario', t: 'text', w: 6, req: true, help: 'Sin espacios ni tildes.' },
        { n: 'rol', l: 'Nivel de acceso', t: 'select', w: 6, req: true, opts: Auth.ROLES, vacio: false },
        {
          n: 'residenteId', l: 'Residente vinculado (opcional)', t: 'select', w: 12,
          opts: App.opcionesResidentes(false)
        },
        { n: 'clave', l: 'Contraseña inicial', t: 'text', w: 12, req: true,
          help: 'Se le pedirá cambiarla en su primer ingreso.' }
      ], { rol: 'limitado' }),
      onSubmit: d => {
        d.usuario = U.norm(d.usuario).replace(/[^a-z0-9._-]/g, '');
        if (!d.usuario) { UI.toast('Escriba un nombre de usuario válido.', 'err'); return false; }
        if (Auth.porNombre(d.usuario)) { UI.toast('Ese usuario ya existe.', 'err'); return false; }
        if (String(d.clave).length < 4) { UI.toast('La contraseña inicial es demasiado corta.', 'err'); return false; }
        Auth.crearUsuario(d);
        UI.toast(`Cuenta «${d.usuario}» creada.`);
        App.pintar();
      }
    });
  },

  editarCuenta(id) {
    const u = DB.obtener('usuarios', id);
    if (!u) return;
    UI.modal({
      title: 'Editar cuenta',
      sub: u.usuario,
      size: 'wide',
      body: UI.campos([
        { n: 'nombre', l: 'Nombre de la persona', t: 'text', w: 7, req: true },
        { n: 'cargo', l: 'Cargo o nivel', t: 'text', w: 5 },
        { n: 'usuario', l: 'Usuario', t: 'text', w: 6, req: true, help: 'Sin espacios ni tildes.' },
        { n: 'rol', l: 'Nivel de acceso', t: 'select', w: 6, req: true, opts: Auth.ROLES, vacio: false },
        { n: 'activo', l: 'Cuenta activa', t: 'checkbox', w: 6 },
        { n: 'residenteId', l: 'Residente vinculado', t: 'select', w: 6, opts: App.opcionesResidentes(true) }
      ], u),
      onSubmit: d => {
        const sesion = Auth.sesion();
        if (sesion && sesion.id === id && (d.rol !== 'total' || !d.activo)) {
          UI.toast('No puede quitarse a sí mismo el acceso total ni desactivar su cuenta.', 'err');
          return false;
        }
        d.usuario = U.norm(d.usuario).replace(/[^a-z0-9._-]/g, '');
        if (!d.usuario) { UI.toast('Escriba un nombre de usuario válido.', 'err'); return false; }
        const otro = Auth.porNombre(d.usuario);
        if (otro && otro.id !== id) { UI.toast('Ese usuario ya está en uso.', 'err'); return false; }
        DB.actualizar('usuarios', id, d);
        UI.toast('Cuenta actualizada.');
        App.pintar();
      }
    });
  },

  restablecerClave(id) {
    const u = DB.obtener('usuarios', id);
    if (!u) return;
    UI.modal({
      title: 'Restablecer contraseña',
      sub: `${u.nombre} · ${u.usuario}`,
      size: 'narrow',
      submit: 'Restablecer',
      body: `
        <div class="note" style="margin-bottom:14px">
          La persona deberá cambiarla la próxima vez que entre.
        </div>
        ${UI.campos([
          { n: 'clave', l: 'Contraseña nueva', t: 'text', w: 12, req: true, val: u.usuario }
        ])}`,
      onSubmit: d => {
        if (String(d.clave).length < 4) { UI.toast('La contraseña es demasiado corta.', 'err'); return false; }
        Auth.definirClave(id, d.clave, true);
        UI.toast(`Contraseña de «${u.usuario}» restablecida.`);
        App.pintar();
      }
    });
  }
};


/* ============================================================
   Vista: usuarios y accesos (solo para acceso total)
   ============================================================ */

Vistas['usuarios'] = {
  titulo: 'Usuarios y accesos',
  sub: () => {
    const us = Auth.usuarios();
    const pend = us.filter(u => u.debeCambiar && u.activo).length;
    return `${us.length} cuentas · ${us.filter(u => u.rol === 'total').length} con acceso total · ` +
      `${pend} con contraseña inicial sin cambiar`;
  },
  acciones: () => `
    <button class="btn" data-action="crear-cuentas-niveles">↻ Crear cuentas de Nivel 1 y 2</button>
    <button class="btn btn-primary" data-action="nueva-cuenta">+ Nueva cuenta</button>`,

  render() {
    const us = Auth.usuarios().slice().sort((a, b) =>
      (a.rol === b.rol ? 0 : a.rol === 'total' ? -1 : 1) || a.nombre.localeCompare(b.nombre));
    const yo = Auth.sesion();

    const aviso = `
      <div class="note warn" style="margin-bottom:16px">
        <b>Sobre este control de acceso.</b> La aplicación funciona sin servidor, dentro
        del navegador de este equipo. El inicio de sesión separa los roles y evita cambios
        accidentales, pero <b>no protege los datos frente a alguien con conocimientos
        técnicos</b> que tenga acceso al computador o al archivo de respaldo. Proteja
        además el equipo con contraseña de usuario de Windows.
      </div>`;

    const tabla = UI.tabla([
      {
        l: 'Persona', c: u => `
          <div style="font-weight:600">${U.esc(u.nombre)}</div>
          <div class="small faint">${U.esc(u.cargo || '')}</div>`
      },
      { l: 'Usuario', c: u => `<span class="mono">${U.esc(u.usuario)}</span>` +
        (yo && yo.id === u.id ? ' <span class="badge b-info">usted</span>' : '') },
      {
        l: 'Acceso', c: u => u.rol === 'total'
          ? '<span class="badge b-primary">Total</span>'
          : '<span class="badge b-gray">Limitado</span>' +
            '<div class="small faint">Tareas, llamadas, salidas y conducta</div>'
      },
      {
        l: 'Estado', cls: 'nowrap', c: u => (u.activo
          ? '<span class="badge b-ok">Activa</span>'
          : '<span class="badge b-danger">Desactivada</span>') +
          (u.debeCambiar ? '<div class="small" style="color:var(--warn)">Contraseña inicial</div>' : '')
      },
      {
        l: 'Último ingreso', cls: 'nowrap',
        c: u => u.ultimoIngreso
          ? U.fecha(u.ultimoIngreso.slice(0, 10))
          : '<span class="faint">Nunca</span>'
      },
      {
        l: '', cls: 'actions', c: u =>
          `<button class="btn btn-sm" data-action="restablecer-clave" data-id="${u.id}">🔑 Contraseña</button>
           <button class="btn btn-sm btn-ghost" data-action="editar-cuenta" data-id="${u.id}" title="Editar">✏️</button>` +
          (yo && yo.id === u.id ? '' :
            `<button class="btn btn-sm btn-ghost" data-action="eliminar" data-col="usuarios" data-id="${u.id}"
               data-etiqueta="la cuenta de ${U.esc(u.nombre)}" title="Eliminar">🗑️</button>`)
      }
    ], us, {
      vacio: {
        ico: '🔑', titulo: 'Sin cuentas creadas',
        texto: 'Cree las cuentas de acceso del centro.',
        accion: `<button class="btn btn-primary" data-action="nueva-cuenta">+ Nueva cuenta</button>`
      }
    });

    return aviso + `<div class="card"><div class="card-body tight">${tabla}</div></div>`;
  }
};

Acciones['nueva-cuenta'] = () => Auth.nuevaCuenta();
Acciones['editar-cuenta'] = d => Auth.editarCuenta(d.id);
Acciones['restablecer-clave'] = d => Auth.restablecerClave(d.id);
Acciones['cambiar-clave'] = () => Auth.cambiarClave(false);
Acciones['cerrar-sesion'] = () => Auth.cerrarSesion();

Acciones['crear-cuentas-niveles'] = () => {
  const creadas = Auth.crearCuentasNiveles();
  UI.toast(creadas.length
    ? `${creadas.length} cuenta(s) creada(s): ${creadas.join(', ')}.`
    : 'Todos los residentes de Nivel 1 y 2 ya tienen cuenta.');
  App.pintar();
};
