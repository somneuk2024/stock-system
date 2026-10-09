/* ============================================================
   LINE Stock — ແດຊບອດ LIFF
   ============================================================ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  config: null,
  idToken: null,
  me: null,
  tab: 'overview',
  products: [],
  locations: [],
  filters: { q: '', status: 'all', locationId: '' },
  historyType: 'all',
  summary: null,
};

const ACTIONS = {
  issue:    { label: 'ເບີກອອກ', icon: '📤', cls: 'issue',    verb: 'ເບີກ' },
  receive:  { label: 'ຮັບເຂົ້າ', icon: '📥', cls: 'receive',  verb: 'ຮັບເຂົ້າ' },
  adjust:   { label: 'ປັບຍອດ', icon: '⚖️', cls: 'adjust',   verb: 'ປັບເປັນ' },
  transfer: { label: 'ຍ້າຍສາງ', icon: '🔁', cls: 'transfer', verb: 'ຍ້າຍ' },
};

const MOVE_META = {
  issue:        { label: 'ເບີກອອກ', icon: '📤', cls: 'issue' },
  receive:      { label: 'ຮັບເຂົ້າ', icon: '📥', cls: 'receive' },
  adjust:       { label: 'ປັບຍອດ', icon: '⚖️', cls: 'adjust' },
  transfer_out: { label: 'ຍ້າຍອອກ', icon: '🔁', cls: 'transfer' },
  transfer_in:  { label: 'ຍ້າຍເຂົ້າ', icon: '🔁', cls: 'transfer' },
};

/* ------------------------------------------------------------ helpers */

const fmt = (n) => {
  const v = Math.round((Number(n) || 0) * 1000) / 1000;
  return v.toLocaleString('lo-LA', { maximumFractionDigits: 3 });
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function stockClass(qty, min) {
  if (qty <= 0) return 'out';
  if (min > 0 && qty <= min) return 'low';
  return 'ok';
}

function relTime(sqlUtc) {
  const d = new Date(String(sqlUtc).replace(' ', 'T') + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ດຽວນີ້';
  if (diff < 3600) return `${Math.floor(diff / 60)} ນາທີກ່ອນ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ຊົ່ວໂມງກ່ອນ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ວັນກ່ອນ`;
  return d.toLocaleDateString('lo-LA', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Vientiane' });
}

function toast(message, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind ? 'toast--' + kind : ''}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (state.idToken) headers.authorization = `Bearer ${state.idToken}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `ເກີດຂໍ້ຜິດພາດ (${res.status})`);
  return data;
}

/* --------------------------------------------------------- bootstrap */

async function boot() {
  try {
    state.config = await fetch('/api/config').then((r) => r.json());
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    const useLiff = state.config.liffId && !(local && state.config.dev);

    if (useLiff) {
      await liff.init({ liffId: state.config.liffId });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: location.href });
        return;
      }
      state.idToken = liff.getIDToken();
      if (!state.idToken) throw new Error('ບໍ່ໄດ້ຮັບ ID token — ກວດສອບວ່າເປີດ scope "openid" ໃນ LINE Login ແລ້ວ');
    }

    state.me = await api('/me');
    paintUser();
    await refreshAll();

    $('#boot').hidden = true;
    $('#app').hidden = false;
    applyDeepLink();
  } catch (err) {
    $('#boot').innerHTML = `
      <div class="boot__logo">⚠️</div>
      <div class="boot__text" style="max-width:280px;text-align:center">${esc(err.message)}</div>
      <button class="btn btn--ghost" onclick="location.reload()">ລອງໃໝ່</button>`;
  }
}

function applyDeepLink() {
  const p = new URLSearchParams(location.search);
  if (p.get('status')) {
    state.filters.status = p.get('status');
    $$('#statusChips .chip').forEach((c) => c.classList.toggle('is-active', c.dataset.status === state.filters.status));
  }
  if (p.get('tab')) switchTab(p.get('tab'));
  if (p.get('p')) openProduct(Number(p.get('p')));
}

function paintUser() {
  const name = state.me?.name || 'ຜູ້ໃຊ້';
  $('#userInitial').textContent = name.trim().charAt(0).toUpperCase();
  if (state.me?.picture) {
    const img = $('#userAvatar');
    img.src = state.me.picture;
    img.hidden = false;
    $('#userInitial').hidden = true;
  }
  $('#meName').textContent = name;
  $('#meId').textContent = state.me?.lineUserId ?? '-';
}

async function refreshAll() {
  const [data, products] = await Promise.all([api('/summary'), loadProducts()]);
  state.summary = data.summary;
  state.locations = data.locations;
  renderOverview(data);
  renderLocationFilter();
  renderProducts(products);
  renderSettingsLocations(data.byLocation);
}

async function loadProducts() {
  const p = new URLSearchParams();
  if (state.filters.q) p.set('q', state.filters.q);
  if (state.filters.status !== 'all') p.set('status', state.filters.status);
  if (state.filters.locationId) p.set('locationId', state.filters.locationId);
  state.products = await api(`/products?${p}`);
  return state.products;
}

/* ------------------------------------------------------------ ພາບລວມ */

function renderOverview(data) {
  const s = data.summary;
  $('#statGrid').innerHTML = `
    ${statTile('ລາຍການສິນຄ້າ', fmt(s.productCount), `${s.locationCount} ສາງ`, '')}
    ${statTile('ໜ່ວຍຄົງເຫຼືອລວມ', fmt(s.totalUnits), 'ທຸກສາງລວມກັນ', '')}
    ${statTile('ໃກ້ໝົດ', fmt(s.lowCount), 'ຕ່ຳກວ່າຈຸດສັ່ງຊື້', 'warn')}
    ${statTile('ໝົດສະຕອກ', fmt(s.outCount), 'ຕ້ອງສັ່ງຊື້ດ່ວນ', 'danger')}
    <div class="stat" style="grid-column:1/-1">
      <div class="stat__label">ການເຄື່ອນໄຫວມື້ນີ້</div>
      <div style="display:flex;gap:22px;margin-top:8px">
        <div><div class="stat__value" style="color:var(--issue);font-size:22px">${fmt(s.todayIssue)}</div><div class="stat__hint">ເບີກອອກ</div></div>
        <div><div class="stat__value" style="color:var(--receive);font-size:22px">${fmt(s.todayReceive)}</div><div class="stat__hint">ຮັບເຂົ້າ</div></div>
        <div><div class="stat__value" style="font-size:22px">${fmt(s.todayMovements)}</div><div class="stat__hint">ລາຍການ</div></div>
      </div>
    </div>`;

  const max = Math.max(1, ...data.byLocation.map((l) => Number(l.units) || 0));
  $('#locationBars').innerHTML = data.byLocation.length
    ? data.byLocation
        .map(
          (l) => `
      <div class="loc-bar">
        <div class="loc-bar__top">
          <span class="loc-bar__name">${esc(l.name)}</span>
          <span class="loc-bar__value">${fmt(l.units)} ໜ່ວຍ · ${l.items} ລາຍການ</span>
        </div>
        <div class="loc-bar__track"><div class="loc-bar__fill" style="width:${((Number(l.units) || 0) / max) * 100}%"></div></div>
      </div>`,
        )
        .join('')
    : '<div class="empty">ຍັງບໍ່ມີສາງສິນຄ້າ</div>';

  $('#lowList').innerHTML = data.low.length
    ? data.low.map((p) => productRow(p, true)).join('')
    : '<div class="empty">ບໍ່ມີສິນຄ້າຕ່ຳກວ່າຈຸດສັ່ງຊື້ 🎉</div>';

  $('#recentList').innerHTML = data.recent.length
    ? data.recent.slice(0, 6).map(movementRow).join('')
    : '<div class="empty">ຍັງບໍ່ມີການເຄື່ອນໄຫວ</div>';
}

function statTile(label, value, hint, kind) {
  return `<div class="stat ${kind ? 'stat--' + kind : ''}">
    <div class="stat__label">${kind ? `<span class="dot"></span>` : ''}${esc(label)}</div>
    <div class="stat__value">${value}</div>
    <div class="stat__hint">${esc(hint)}</div>
  </div>`;
}

function productRow(p, plain = false) {
  const cls = stockClass(Number(p.total_qty), Number(p.min_qty));
  const badge = cls === 'out' ? 'ໝົດ' : cls === 'low' ? 'ໃກ້ໝົດ' : '';
  return `<button class="item ${plain ? 'item--plain' : ''}" data-product="${p.id}">
    <div class="item__main">
      <div class="item__name">${esc(p.name)}</div>
      <div class="item__meta">
        <span>${esc(p.sku)}</span>
        ${p.category ? `<span>· ${esc(p.category)}</span>` : ''}
        ${badge ? `<span class="badge badge--${cls}">${badge}</span>` : ''}
      </div>
    </div>
    <div class="item__qty">
      <b class="qty-${cls}">${fmt(p.total_qty)}</b>
      <span>${esc(p.unit)}</span>
    </div>
  </button>`;
}

function movementRow(m) {
  const meta = MOVE_META[m.type] ?? { label: m.type, icon: '•', cls: '' };
  const positive = Number(m.delta) > 0;
  return `<div class="tl">
    <div class="tl__icon badge--${meta.cls}">${meta.icon}</div>
    <div>
      <div class="tl__name">${esc(m.product_name)}</div>
      <div class="tl__meta">${meta.label} · ${esc(m.location_name)} · ${relTime(m.created_at)}${m.actor_name ? ' · ' + esc(m.actor_name) : ''}${m.note ? ' · ' + esc(m.note) : ''}</div>
    </div>
    <div>
      <div class="tl__delta" style="color:var(--${positive ? 'receive' : 'issue'})">${positive ? '+' : ''}${fmt(m.delta)}</div>
      <div class="tl__balance">ຄົງເຫຼືອ ${fmt(m.balance_after)}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------- ສິນຄ້າ */

function renderLocationFilter() {
  const sel = $('#locationFilter');
  sel.innerHTML =
    '<option value="">ທຸກສາງ</option>' +
    state.locations.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  sel.value = state.filters.locationId;
}

function renderProducts(products) {
  $('#productList').innerHTML = products.length
    ? products.map((p) => productRow(p)).join('')
    : `<div class="empty">ບໍ່ພົບສິນຄ້າທີ່ຕົງກັບເງື່ອນໄຂ</div>`;
}

function renderSettingsLocations(byLocation = []) {
  const stats = Object.fromEntries(byLocation.map((l) => [l.id, l]));
  $('#locationList').innerHTML = state.locations
    .map((l) => {
      const s = stats[l.id] ?? { units: 0, items: 0 };
      return `<button class="item item--plain" data-location="${l.id}">
        <div class="item__main">
          <div class="item__name">${esc(l.name)} ${l.is_default ? '<span class="badge badge--ok">ຄ່າເລີ່ມຕົ້ນ</span>' : ''}</div>
          <div class="item__meta"><span>${esc(l.code)}</span><span>· ${s.items} ລາຍການ</span></div>
        </div>
        <div class="item__qty"><b>${fmt(s.units)}</b><span>ໜ່ວຍ</span></div>
      </button>`;
    })
    .join('');
}

/* ------------------------------------------------------------ ປະຫວັດ */

async function renderHistory() {
  const list = $('#historyList');
  list.innerHTML = '<div class="skeleton"></div>';
  const rows = await api('/movements?limit=100');
  const filtered =
    state.historyType === 'all'
      ? rows
      : rows.filter((r) => (state.historyType === 'transfer' ? r.type.startsWith('transfer') : r.type === state.historyType));
  list.innerHTML = filtered.length ? filtered.map(movementRow).join('') : '<div class="empty">ບໍ່ມີລາຍການ</div>';
}

/* -------------------------------------------------------- bottom sheet */

function openSheet(html) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  $('#backdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheet() {
  $('#sheet').hidden = true;
  $('#backdrop').hidden = true;
  document.body.style.overflow = '';
}

function sheetHead(title, subtitle) {
  return `<div class="sheet__head">
    <div><div class="sheet__title">${esc(title)}</div>${subtitle ? `<div class="sheet__sub">${esc(subtitle)}</div>` : ''}</div>
    <button class="sheet__close" data-close>✕</button>
  </div>`;
}

/* -------------------------------------------------- ລາຍລະອຽດສິນຄ້າ */

async function openProduct(id) {
  openSheet(`${sheetHead('ກຳລັງໂຫຼດ…', '')}<div class="skeleton" style="height:120px"></div>`);
  try {
    const { product, levels, movements, total } = await api(`/products/${id}`);
    const cls = stockClass(total, product.min_qty);
    openSheet(`
      ${sheetHead(product.name, `${product.sku}${product.barcode ? ' · ' + product.barcode : ''}`)}
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:10px">
        <div class="confirm__big qty-${cls}" style="font-size:34px">${fmt(total)}</div>
        <div style="color:var(--muted);font-size:13px">${esc(product.unit)} ລວມທຸກສາງ</div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">
        ${product.min_qty > 0 ? `ຈຸດສັ່ງຊື້ຂັ້ນຕ່ຳ ${fmt(product.min_qty)} ${esc(product.unit)}` : 'ຍັງບໍ່ຕັ້ງຈຸດສັ່ງຊື້'}
        ${product.category ? ' · ' + esc(product.category) : ''}
      </div>

      <div class="btn-grid" style="margin-top:16px">
        <button class="btn btn--issue" data-move="issue" data-id="${product.id}">📤 ເບີກອອກ</button>
        <button class="btn btn--receive" data-move="receive" data-id="${product.id}">📥 ຮັບເຂົ້າ</button>
        <button class="btn btn--ghost" data-move="adjust" data-id="${product.id}">⚖️ ປັບຍອດ</button>
        <button class="btn btn--ghost" data-move="transfer" data-id="${product.id}">🔁 ຍ້າຍສາງ</button>
      </div>

      <section>
        <h3>ຄົງເຫຼືອແຍກຕາມສາງ</h3>
        <div class="list">
          ${levels
            .map(
              (l) => `<div class="row"><span class="row__label">${esc(l.name)} · ${esc(l.code)}</span>
              <span class="row__value">${fmt(l.qty)} ${esc(product.unit)}</span></div>`,
            )
            .join('')}
        </div>
      </section>

      <section>
        <h3>ການເຄື່ອນໄຫວລ່າສຸດ</h3>
        <div class="timeline">${movements.length ? movements.slice(0, 12).map(movementRow).join('') : '<div class="empty">ຍັງບໍ່ມີລາຍການ</div>'}</div>
      </section>

      <section>
        <button class="btn btn--ghost btn--block" data-edit-product="${product.id}">ແກ້ໄຂຂໍ້ມູນສິນຄ້າ</button>
      </section>
    `);
  } catch (err) {
    toast(err.message, 'error');
    closeSheet();
  }
}

/* ------------------------------------------------------- ເຮັດລາຍການສະຕອກ */

async function openMovement(productId, action = 'issue') {
  const { product, levels } = await api(`/products/${productId}`);
  const meta = ACTIONS[action];
  const defaultLoc = levels.find((l) => l.qty > 0) ?? levels[0];

  openSheet(`
    ${sheetHead(meta.label, product.name)}
    <div class="seg" style="margin-top:6px">
      ${Object.entries(ACTIONS)
        .map(([key, a]) => `<button data-action="${key}" class="${key === action ? 'is-active' : ''}">${a.icon} ${a.label}</button>`)
        .join('')}
    </div>

    <form id="moveForm" style="margin-top:18px">
      <div class="field">
        <label>${action === 'transfer' ? 'ສາງຕົ້ນທາງ' : 'ສາງ'}</label>
        <select name="locationId">
          ${levels.map((l) => `<option value="${l.location_id}" ${l.location_id === defaultLoc?.location_id ? 'selected' : ''}>${esc(l.name)} — ຄົງເຫຼືອ ${fmt(l.qty)} ${esc(product.unit)}</option>`).join('')}
        </select>
      </div>

      ${
        action === 'transfer'
          ? `<div class="field"><label>ສາງປາຍທາງ</label>
              <select name="toLocationId">
                ${levels.map((l) => `<option value="${l.location_id}">${esc(l.name)} — ຄົງເຫຼືອ ${fmt(l.qty)} ${esc(product.unit)}</option>`).join('')}
              </select></div>`
          : ''
      }

      <div class="field">
        <label>${action === 'adjust' ? `ຈຳນວນທີ່ນັບໄດ້ຈິງ (${esc(product.unit)})` : `ຈຳນວນ (${esc(product.unit)})`}</label>
        <div class="stepper">
          <button type="button" data-step="-1">−</button>
          <input name="qty" type="number" inputmode="decimal" min="0" step="any" value="${action === 'adjust' ? fmt(defaultLoc?.qty ?? 0).replace(/,/g, '') : 1}" />
          <button type="button" data-step="1">+</button>
        </div>
      </div>

      <div class="field">
        <label>ໝາຍເຫດ (ບໍ່ບັງຄັບ)</label>
        <input name="note" placeholder="ເຊັ່ນ ໃຊ້ໃນວຽກອິເວນ / ຜູ້ຮັບຂອງ" />
      </div>

      <div class="confirm" id="preview"></div>

      <button class="btn btn--${meta.cls} btn--block" style="margin-top:14px" type="submit" id="submitBtn">ຢືນຢັນ</button>
    </form>
  `);

  const form = $('#moveForm');
  const unit = product.unit;

  const updatePreview = () => {
    const locId = Number(form.locationId.value);
    const level = levels.find((l) => l.location_id === locId);
    const current = level?.qty ?? 0;
    const qty = Number(form.qty.value || 0);
    const after = action === 'receive' ? current + qty : action === 'adjust' ? qty : current - qty;
    const cls = stockClass(after, product.min_qty);
    const invalid = (action !== 'adjust' && qty <= 0) || (action !== 'receive' && action !== 'adjust' && after < 0);

    $('#preview').innerHTML = `
      <div class="row"><span class="row__label">ຄົງເຫຼືອປັດຈຸບັນ</span><span class="row__value">${fmt(current)} ${esc(unit)}</span></div>
      <div class="row"><span class="row__label">${ACTIONS[action].verb}</span><span class="row__value" style="color:var(--${meta.cls})">${fmt(qty)} ${esc(unit)}</span></div>
      <div class="row"><span class="row__label">ຄົງເຫຼືອຫຼັງເຮັດລາຍການ</span><span class="confirm__big qty-${cls}">${fmt(after)} ${esc(unit)}</span></div>
      ${after < 0 ? '<div style="color:var(--danger);font-size:12px">ສະຕອກບໍ່ພໍສຳລັບຈຳນວນນີ້</div>' : ''}
      ${after >= 0 && product.min_qty > 0 && after <= product.min_qty ? `<div style="color:var(--warn);font-size:12px">⚠️ ຈະຕ່ຳກວ່າຈຸດສັ່ງຊື້ (ຂັ້ນຕ່ຳ ${fmt(product.min_qty)})</div>` : ''}`;

    const btn = $('#submitBtn');
    btn.disabled = invalid;
    btn.textContent = `ຢືນຢັນ${ACTIONS[action].label} ${fmt(qty)} ${unit}`;
  };

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  $$('[data-step]', form).forEach((b) =>
    b.addEventListener('click', () => {
      const input = form.qty;
      input.value = Math.max(0, (Number(input.value) || 0) + Number(b.dataset.step));
      updatePreview();
    }),
  );
  $$('[data-action]').forEach((b) => b.addEventListener('click', () => openMovement(productId, b.dataset.action)));
  updatePreview();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'ກຳລັງບັນທຶກ…';
    try {
      const payload = {
        action,
        productId,
        locationId: Number(form.locationId.value),
        qty: Number(form.qty.value),
        note: form.note.value.trim() || undefined,
      };
      if (action === 'transfer') payload.toLocationId = Number(form.toLocationId.value);
      const result = await api('/movements', { method: 'POST', body: JSON.stringify(payload) });
      closeSheet();
      toast(`${meta.label}ສຳເລັດ · ເລກທີ ${result.ref}`, 'ok');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      updatePreview();
    }
  });
}

/* ------------------------------------------------------ ຟອມສິນຄ້າ */

function openProductForm(product = null) {
  const p = product ?? {};
  openSheet(`
    ${sheetHead(product ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່', product ? p.sku : 'ປ້ອນຂໍ້ມູນສິນຄ້າທີ່ຕ້ອງການເກັບສະຕອກ')}
    <form id="productForm" style="margin-top:14px">
      <div class="field"><label>ຊື່ສິນຄ້າ *</label><input name="name" required value="${esc(p.name ?? '')}" placeholder="ເຊັ່ນ ປາກກາລູກລື່ນ ສີຟ້າ" /></div>
      <div class="field--row">
        <div class="field"><label>ລະຫັດສິນຄ້າ (SKU)</label><input name="sku" value="${esc(p.sku ?? '')}" placeholder="ປະຫວ່າງໃຫ້ລະບົບສ້າງ" /></div>
        <div class="field"><label>ໜ່ວຍນັບ</label><input name="unit" value="${esc(p.unit ?? 'ອັນ')}" /></div>
      </div>
      <div class="field">
        <label>ບາໂຄ້ດ</label>
        <div style="display:flex;gap:8px">
          <input name="barcode" value="${esc(p.barcode ?? '')}" placeholder="ສະແກນ ຫຼື ພິມ" style="flex:1" />
          <button type="button" class="btn btn--ghost" id="scanIntoField">ສະແກນ</button>
        </div>
      </div>
      <div class="field--row">
        <div class="field"><label>ໝວດໝູ່</label><input name="category" value="${esc(p.category ?? '')}" placeholder="ເຊັ່ນ ເຄື່ອງຂຽນ" /></div>
        <div class="field"><label>ຈຸດສັ່ງຊື້ຂັ້ນຕ່ຳ</label><input name="min_qty" type="number" min="0" step="any" value="${p.min_qty ?? 0}" /></div>
      </div>
      ${
        product
          ? ''
          : `<div class="field--row">
              <div class="field"><label>ຍອດຍົກມາ</label><input name="initial_qty" type="number" min="0" step="any" value="0" /></div>
              <div class="field"><label>ເກັບຢູ່ສາງ</label><select name="location_id">${state.locations.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></div>
            </div>`
      }
      <div class="field"><label>ໝາຍເຫດ</label><input name="note" value="${esc(p.note ?? '')}" /></div>
      <button class="btn btn--primary btn--block" type="submit">${product ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມສິນຄ້າ'}</button>
      ${product ? `<button class="btn btn--danger btn--block" style="margin-top:8px" type="button" id="archiveBtn">ນຳສິນຄ້າອອກຈາກລະບົບ</button>` : ''}
    </form>
  `);

  const form = $('#productForm');
  $('#scanIntoField')?.addEventListener('click', async () => {
    const code = await scan();
    if (code) form.barcode.value = code;
  });

  $('#archiveBtn')?.addEventListener('click', async () => {
    if (!confirm('ຕ້ອງການນຳສິນຄ້ານີ້ອອກຈາກລະບົບຫຼືບໍ່? ປະຫວັດເກົ່າຈະຍັງຢູ່')) return;
    try {
      await api(`/products/${p.id}`, { method: 'DELETE' });
      closeSheet();
      toast('ນຳສິນຄ້າອອກແລ້ວ', 'ok');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form).entries());
    body.min_qty = Number(body.min_qty || 0);
    if (body.initial_qty !== undefined) body.initial_qty = Number(body.initial_qty || 0);
    if (body.location_id !== undefined) body.location_id = Number(body.location_id || 0);
    try {
      if (product) await api(`/products/${p.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/products', { method: 'POST', body: JSON.stringify(body) });
      closeSheet();
      toast(product ? 'ບັນທຶກແລ້ວ' : 'ເພີ່ມສິນຄ້າແລ້ວ', 'ok');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

/* -------------------------------------------------------- ຟອມສາງ */

function openLocationForm(location = null) {
  const l = location ?? {};
  openSheet(`
    ${sheetHead(location ? 'ແກ້ໄຂສາງ' : 'ເພີ່ມສາງໃໝ່', location ? l.code : 'ສ້າງບ່ອນເກັບສິນຄ້າໃໝ່')}
    <form id="locForm" style="margin-top:14px">
      <div class="field--row">
        <div class="field"><label>ລະຫັດສາງ *</label><input name="code" required value="${esc(l.code ?? '')}" placeholder="MAIN" /></div>
        <div class="field"><label>ຊື່ສາງ *</label><input name="name" required value="${esc(l.name ?? '')}" placeholder="ສາງກາງ" /></div>
      </div>
      <label style="display:flex;gap:10px;align-items:center;font-size:13px;margin:6px 0 16px">
        <input type="checkbox" name="is_default" ${l.is_default ? 'checked' : ''} style="width:18px;height:18px" />
        ຕັ້ງເປັນສາງເລີ່ມຕົ້ນ
      </label>
      <button class="btn btn--primary btn--block" type="submit">${location ? 'ບັນທຶກ' : 'ເພີ່ມສາງ'}</button>
      ${location ? `<button class="btn btn--danger btn--block" style="margin-top:8px" type="button" id="delLoc">ລຶບສາງນີ້</button>` : ''}
    </form>
  `);

  const form = $('#locForm');
  $('#delLoc')?.addEventListener('click', async () => {
    if (!confirm('ລຶບສາງນີ້ຫຼືບໍ່?')) return;
    try {
      await api(`/locations/${l.id}`, { method: 'DELETE' });
      closeSheet();
      toast('ລຶບສາງແລ້ວ', 'ok');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      code: form.code.value.trim(),
      name: form.name.value.trim(),
      is_default: form.is_default.checked,
    };
    try {
      if (location) await api(`/locations/${l.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/locations', { method: 'POST', body: JSON.stringify(body) });
      closeSheet();
      toast('ບັນທຶກແລ້ວ', 'ok');
      await refreshAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

/* ------------------------------------------------------------- ສະແກນ */

async function scan() {
  try {
    if (window.liff?.isInClient?.() && liff.scanCodeV2) {
      const result = await liff.scanCodeV2();
      return result?.value ?? null;
    }
  } catch (err) {
    console.warn('scanCodeV2 failed', err);
  }
  const manual = prompt('ປ້ອນບາໂຄ້ດ (ອຸປະກອນນີ້ເປີດກ້ອງສະແກນຜ່ານ LINE ບໍ່ໄດ້)');
  return manual?.trim() || null;
}

async function scanAndOpen() {
  const code = await scan();
  if (!code) return;
  try {
    const { product } = await api(`/products/lookup/${encodeURIComponent(code)}`);
    openProduct(product.id);
  } catch {
    if (confirm(`ບໍ່ພົບສິນຄ້າບາໂຄ້ດ ${code}\nຕ້ອງການເພີ່ມເປັນສິນຄ້າໃໝ່ຫຼືບໍ່?`)) {
      openProductForm();
      setTimeout(() => {
        const el = $('#productForm')?.barcode;
        if (el) el.value = code;
      }, 60);
    }
  }
}

/* ----------------------------------------------------------- routing */

function switchTab(tab) {
  if (!['overview', 'products', 'history', 'settings'].includes(tab)) return;
  state.tab = tab;
  $$('.view').forEach((v) => (v.hidden = v.dataset.view !== tab));
  $$('.tab[data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  $('#topbarSubtitle').textContent = {
    overview: 'ພາບລວມມື້ນີ້',
    products: 'ລາຍການສິນຄ້າທັງໝົດ',
    history: 'ປະຫວັດການເຄື່ອນໄຫວ',
    settings: 'ຕັ້ງຄ່າລະບົບ',
  }[tab];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tab === 'history') renderHistory();
}

/* ---------------------------------------------------------- listeners */

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab[data-tab]');
  if (tab) return switchTab(tab.dataset.tab);

  if (e.target.closest('#fabScan') || e.target.closest('#scanBtn')) return scanAndOpen();
  if (e.target.closest('[data-close]') || e.target.closest('#backdrop')) return closeSheet();

  const goto = e.target.closest('[data-goto]');
  if (goto) {
    if (goto.dataset.status) {
      state.filters.status = goto.dataset.status;
      $$('#statusChips .chip').forEach((c) => c.classList.toggle('is-active', c.dataset.status === goto.dataset.status));
      loadProducts().then(renderProducts);
    }
    return switchTab(goto.dataset.goto);
  }

  const product = e.target.closest('[data-product]');
  if (product) return openProduct(Number(product.dataset.product));

  const move = e.target.closest('[data-move]');
  if (move) return openMovement(Number(move.dataset.id), move.dataset.move);

  const edit = e.target.closest('[data-edit-product]');
  if (edit) {
    const id = Number(edit.dataset.editProduct);
    return api(`/products/${id}`).then(({ product }) => openProductForm(product));
  }

  const loc = e.target.closest('[data-location]');
  if (loc) return openLocationForm(state.locations.find((l) => l.id === Number(loc.dataset.location)));

  if (e.target.closest('#addProductBtn')) return openProductForm();
  if (e.target.closest('#addLocationBtn')) return openLocationForm();

  const chip = e.target.closest('#statusChips .chip[data-status]');
  if (chip) {
    state.filters.status = chip.dataset.status;
    $$('#statusChips .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    return loadProducts().then(renderProducts);
  }

  const hChip = e.target.closest('#historyChips .chip');
  if (hChip) {
    state.historyType = hChip.dataset.type;
    $$('#historyChips .chip').forEach((c) => c.classList.toggle('is-active', c === hChip));
    return renderHistory();
  }
});

let searchTimer;
$('#searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.q = e.target.value.trim();
    loadProducts().then(renderProducts);
  }, 280);
});

$('#locationFilter').addEventListener('change', (e) => {
  state.filters.locationId = e.target.value;
  loadProducts().then(renderProducts);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
});

boot();
