/* ============================================================
   utils.js — utilidades generales, formularios, modales, toasts
   ============================================================ */

const U = {

  /* ---------- ids y fechas ---------- */

  uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  },

  /** Fecha de hoy en formato ISO local (YYYY-MM-DD), sin desfase de zona horaria. */
  hoy() {
    return U.toISO(new Date());
  },

  toISO(d) {
    const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return x.toISOString().slice(0, 10);
  },

  ahora() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },

  /** "2025-03-08" -> "08-03-2025" */
  fecha(iso) {
    if (!iso) return '—';
    const p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return `${p[2]}-${p[1]}-${p[0]}`;
  },

  /** "2025-03-08" -> "8 de marzo de 2025" */
  fechaLarga(iso) {
    if (!iso) return '—';
    const d = U.parse(iso);
    if (!d) return iso;
    return `${d.getDate()} de ${U.MESES[d.getMonth()]} de ${d.getFullYear()}`;
  },

  fechaHora(iso, hora) {
    if (!iso) return '—';
    return U.fecha(iso) + (hora ? ' · ' + hora : '');
  },

  parse(iso) {
    if (!iso) return null;
    const p = String(iso).slice(0, 10).split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  },

  /** Días transcurridos entre dos fechas ISO (b - a). */
  dias(a, b) {
    const da = U.parse(a), db = U.parse(b || U.hoy());
    if (!da || !db) return 0;
    return Math.round((db - da) / 86400000);
  },

  /** Suma días a una fecha ISO. */
  sumaDias(iso, n) {
    const d = U.parse(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + n);
    return U.toISO(d);
  },

  edad(fechaNac) {
    const d = U.parse(fechaNac);
    if (!d) return null;
    const h = new Date();
    let a = h.getFullYear() - d.getFullYear();
    const m = h.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  },

  /** Rango [desde, hasta] de la semana (lunes-domingo) que contiene la fecha dada. */
  semanaDe(iso) {
    const d = U.parse(iso) || new Date();
    const dow = (d.getDay() + 6) % 7; // lunes = 0
    const ini = new Date(d); ini.setDate(d.getDate() - dow);
    const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
    return [U.toISO(ini), U.toISO(fin)];
  },

  /** Rango [desde, hasta] del mes "YYYY-MM". */
  mesDe(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    const ini = new Date(y, m - 1, 1);
    const fin = new Date(y, m, 0);
    return [U.toISO(ini), U.toISO(fin)];
  },

  mesActual() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },

  nombreMes(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    return `${U.MESES[m - 1]} de ${y}`;
  },

  enRango(iso, desde, hasta) {
    if (!iso) return false;
    const f = String(iso).slice(0, 10);
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  },

  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],

  /* ---------- texto ---------- */

  esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /** Texto con saltos de línea preservados y escapado. */
  nl(s) {
    return U.esc(s).replace(/\n/g, '<br>');
  },

  corta(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  },

  iniciales(nombre) {
    const p = String(nombre || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  },

  /** Normaliza para búsquedas: minúsculas y sin acentos. */
  norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  },

  plural(n, sing, plu) {
    return n === 1 ? `1 ${sing}` : `${n} ${plu}`;
  },

  /* ---------- ordenar / agrupar ---------- */

  porFechaDesc(campo) {
    campo = campo || 'fecha';
    return (a, b) => String(b[campo] || '').localeCompare(String(a[campo] || '')) ||
      String(b.creado || '').localeCompare(String(a.creado || ''));
  },

  agrupar(arr, fn) {
    const m = {};
    arr.forEach(x => {
      const k = fn(x);
      (m[k] = m[k] || []).push(x);
    });
    return m;
  },

  contar(arr, fn) {
    const m = {};
    arr.forEach(x => { const k = fn(x); m[k] = (m[k] || 0) + 1; });
    return m;
  },

  suma(arr, fn) {
    return arr.reduce((t, x) => t + (Number(fn ? fn(x) : x) || 0), 0);
  },

  /* ---------- descarga de archivos ---------- */

  descargar(nombre, contenido, mime) {
    const blob = new Blob([contenido], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /** Convierte filas a CSV con separador ";" (compatible con Excel en español). */
  csv(cols, rows) {
    const q = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const out = [cols.map(c => q(c.l)).join(';')];
    rows.forEach(r => out.push(cols.map(c => q(c.v(r))).join(';')));
    return '﻿' + out.join('\r\n');
  }
};


/* ============================================================
   UI — componentes de interfaz reutilizables
   ============================================================ */

const UI = {

  /* ---------- toasts ---------- */

  toast(msg, tipo) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (tipo ? ' ' + tipo : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 260);
    }, 3200);
  },

  /* ---------- modales ---------- */

  _stack: [],

  /**
   * opts: { title, sub, body, size, submit, cancel, extraFoot, onSubmit(datos, form), onOpen(modalEl) }
   * onSubmit devuelve false para mantener el modal abierto.
   */
  modal(opts) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `
      <form class="modal ${opts.size || ''}" novalidate>
        <div class="modal-head">
          <div>
            <h3>${U.esc(opts.title || '')}</h3>
            ${opts.sub ? `<div class="sub">${U.esc(opts.sub)}</div>` : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-icon" style="margin-left:auto" data-close>✕</button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        <div class="modal-foot">
          ${opts.extraFoot ? `<div class="left">${opts.extraFoot}</div>` : ''}
          <button type="button" class="btn" data-close>${U.esc(opts.cancel || 'Cancelar')}</button>
          ${opts.submit === null ? '' :
            `<button type="submit" class="btn btn-primary">${U.esc(opts.submit || 'Guardar')}</button>`}
        </div>
      </form>`;

    const cerrar = () => {
      back.remove();
      UI._stack = UI._stack.filter(x => x !== back);
      if (!UI._stack.length) document.body.style.overflow = '';
    };

    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) cerrar();
    });

    const form = back.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!UI.valida(form)) return;
      const datos = UI.datos(form);
      const r = opts.onSubmit ? opts.onSubmit(datos, form) : true;
      if (r !== false) cerrar();
    });

    document.getElementById('modal-root').appendChild(back);
    document.body.style.overflow = 'hidden';
    UI._stack.push(back);

    const primero = back.querySelector('input:not([type=hidden]), select, textarea');
    if (primero) setTimeout(() => primero.focus(), 30);
    if (opts.onOpen) opts.onOpen(back);

    back._cerrar = cerrar;
    return back;
  },

  confirmar(opts) {
    return UI.modal({
      title: opts.title || '¿Confirmar?',
      size: 'narrow',
      body: `<div style="font-size:13.5px;line-height:1.6">${opts.body || ''}</div>`,
      submit: opts.submit || 'Confirmar',
      onSubmit: () => { opts.onSubmit(); },
      onOpen: back => {
        if (opts.peligro) back.querySelector('button[type=submit]').className = 'btn btn-danger';
      }
    });
  },

  /* ---------- formularios ---------- */

  /**
   * Renderiza campos. Cada campo:
   * { n:nombre, l:etiqueta, t:tipo, w:ancho(1-12), req, opts:[], ph, rows, min, max, step, help, val }
   * Tipos: text, textarea, date, time, number, select, checkbox, tel, hidden, sep, html
   */
  campos(defs, valores) {
    valores = valores || {};
    return `<div class="form-grid">` + defs.map(f => {
      if (f.t === 'sep') {
        return `<div style="grid-column:span 12"><div class="section-title" style="margin:6px 0 0">${U.esc(f.l)}</div></div>`;
      }
      if (f.t === 'html') {
        return `<div style="grid-column:span ${f.w || 12}">${f.html}</div>`;
      }
      const v = valores[f.n] !== undefined && valores[f.n] !== null ? valores[f.n] : (f.val !== undefined ? f.val : '');
      const w = f.w || 12;
      const req = f.req ? ' data-req="1"' : '';
      let ctrl;

      if (f.t === 'hidden') {
        return `<input type="hidden" name="${f.n}" value="${U.esc(v)}">`;
      }
      if (f.t === 'select') {
        ctrl = `<select name="${f.n}"${req}>
          ${f.vacio === false ? '' : `<option value="">${U.esc(f.ph || '— Seleccionar —')}</option>`}
          ${(f.opts || []).map(o => {
            const val = typeof o === 'object' ? o.v : o;
            const lab = typeof o === 'object' ? o.l : o;
            return `<option value="${U.esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${U.esc(lab)}</option>`;
          }).join('')}
        </select>`;
      } else if (f.t === 'textarea') {
        ctrl = `<textarea name="${f.n}" rows="${f.rows || 3}" placeholder="${U.esc(f.ph || '')}"${req}>${U.esc(v)}</textarea>`;
      } else if (f.t === 'checkbox') {
        return `<div class="field check-row" style="grid-column:span ${w}">
          <input type="checkbox" name="${f.n}" id="f_${f.n}" value="1"${v ? ' checked' : ''}>
          <label for="f_${f.n}">${U.esc(f.l)}</label>
        </div>`;
      } else if (f.t === 'checks') {
        // Selección múltiple: el valor se recoge como arreglo.
        const sel = Array.isArray(v) ? v.map(String) : (v ? [String(v)] : []);
        return `<div class="field" style="grid-column:span ${w}">
          <label>${U.esc(f.l)}${f.req ? ' <span class="req">*</span>' : ''}</label>
          <div class="checks">
            ${(f.opts || []).map((o, i) => {
              const val = typeof o === 'object' ? o.v : o;
              const lab = typeof o === 'object' ? o.l : o;
              return `<label class="check">
                <input type="checkbox" name="${f.n}" data-multi="1" value="${U.esc(val)}"
                  ${sel.includes(String(val)) ? ' checked' : ''}>
                <span>${U.esc(lab)}</span>
              </label>`;
            }).join('')}
          </div>
          ${f.help ? `<div class="help">${U.esc(f.help)}</div>` : ''}
        </div>`;
      } else {
        const extra = [
          f.min !== undefined ? `min="${f.min}"` : '',
          f.max !== undefined ? `max="${f.max}"` : '',
          f.step !== undefined ? `step="${f.step}"` : ''
        ].join(' ');
        ctrl = `<input type="${f.t || 'text'}" name="${f.n}" value="${U.esc(v)}"
                 placeholder="${U.esc(f.ph || '')}" ${extra}${req}>`;
      }

      return `<div class="field" style="grid-column:span ${w}">
        <label>${U.esc(f.l)}${f.req ? ' <span class="req">*</span>' : ''}</label>
        ${ctrl}
        ${f.help ? `<div class="help">${U.esc(f.help)}</div>` : ''}
      </div>`;
    }).join('') + `</div>`;
  },

  /** Extrae los valores de un formulario como objeto plano. */
  datos(form) {
    const o = {};
    form.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (el.dataset.multi) {
          // Varias casillas comparten el nombre: se acumulan en un arreglo.
          if (!Array.isArray(o[el.name])) o[el.name] = [];
          if (el.checked) o[el.name].push(el.value);
        } else {
          o[el.name] = el.checked;
        }
      } else {
        o[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
      }
    });
    return o;
  },

  /** Validación de campos marcados data-req. */
  valida(form) {
    let ok = true, primero = null;
    form.querySelectorAll('[data-req]').forEach(el => {
      const vacio = !String(el.value || '').trim();
      el.style.borderColor = vacio ? 'var(--danger)' : '';
      if (vacio) { ok = false; primero = primero || el; }
    });
    if (!ok) {
      UI.toast('Complete los campos obligatorios marcados con *', 'err');
      if (primero) primero.focus();
    }
    return ok;
  },

  /* ---------- tablas ---------- */

  /**
   * cols: [{ l:'Título', c:(fila)=>html, cls:'' }]
   * opts: { vacio:{ico,titulo,texto,accion}, click:(fila)=>void via data-attrs }
   */
  tabla(cols, filas, opts) {
    opts = opts || {};
    if (!filas.length) return UI.vacio(opts.vacio || {});
    // data-l lleva el título de la columna: en pantallas pequeñas la hoja de
    // estilos convierte cada fila en una tarjeta y lo usa como etiqueta.
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${U.esc(c.l)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => {
        const attrs = opts.filaAttrs ? opts.filaAttrs(f) : '';
        return `<tr ${attrs}>${cols.map(c =>
          `<td class="${c.cls || ''}" data-l="${U.esc(c.l)}">${c.c(f)}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  vacio(o) {
    return `<div class="empty">
      <div class="big">${o.ico || '📋'}</div>
      <div style="font-weight:600;color:var(--text-soft)">${U.esc(o.titulo || 'Sin registros')}</div>
      <p>${U.esc(o.texto || 'Todavía no hay información en esta sección.')}</p>
      ${o.accion || ''}
    </div>`;
  },

  /**
   * Indicador. Con `href` o `accion` se vuelve pulsable y lleva a la sección
   * correspondiente; sin ellos es solo informativo.
   */
  stat(o) {
    const interior = `
      <div class="stat-ico" style="${o.color ? `background:${o.color}` : ''}">${o.ico || '•'}</div>
      <div style="min-width:0">
        <div class="stat-val">${o.val}</div>
        <div class="stat-lab">${U.esc(o.lab)}</div>
        ${o.nota ? `<div class="stat-note">${U.esc(o.nota)}</div>` : ''}
      </div>
      ${o.href || o.accion ? '<span class="stat-ir" aria-hidden="true">›</span>' : ''}`;

    const titulo = o.titulo ? ` title="${U.esc(o.titulo)}"` : '';
    if (o.href) return `<a class="stat stat-link" href="${o.href}"${titulo}>${interior}</a>`;
    if (o.accion) return `<button type="button" class="stat stat-link" data-action="${o.accion}"${titulo}>${interior}</button>`;
    return `<div class="stat">${interior}</div>`;
  },

  barras(items, total) {
    const max = Math.max(total || 0, ...items.map(i => i.v), 1);
    if (!items.length) return `<div class="faint small">Sin datos.</div>`;
    return `<div class="bars">${items.map(i => {
      const etiqueta = U.esc(U.corta(i.l, 20));
      return `<div class="bar-row">
        <div class="nowrap" title="${U.esc(i.l)}">${i.href ? `<a href="${i.href}">${etiqueta}</a>` : etiqueta}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.v / max * 100).toFixed(1)}%;${i.color ? `background:${i.color}` : ''}"></div></div>
        <div class="bar-num">${i.v}</div>
      </div>`;
    }).join('')}</div>`;
  },

  persona(r, opts) {
    opts = opts || {};
    return `<div class="person">
      <div class="avatar${opts.lg ? ' lg' : ''}">${U.esc(U.iniciales(r.nombre))}</div>
      <div style="min-width:0">
        <div class="nm">${U.esc(r.nombre || 'Sin nombre')}</div>
        <div class="mt">${U.esc(opts.meta || r.documento || '')}</div>
      </div>
    </div>`;
  }
};
