/** ຈັດຮູບແບບຈຳນວນ: ຕັດ .0 ອອກ ແລະ ໃສ່ຕົວຄັ່ນຫຼັກພັນ */
export function fmtQty(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/** ເວລາລາວແບບອ່ານງ່າຍ ເຊັ່ນ "30 ສ.ຫ. 69 14:05" */
const LA_MONTHS = ['ມ.ກ.', 'ກ.ພ.', 'ມ.ນ.', 'ເມ.ສ.', 'ພ.ພ.', 'ມິ.ຖ.', 'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.'];
export function fmtLaoDateTime(sqlUtc: string): string {
  const d = new Date(sqlUtc.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return sqlUtc;
  const vte = new Date(d.getTime() + 7 * 3600_000);
  const dd = vte.getUTCDate();
  const mm = LA_MONTHS[vte.getUTCMonth()];
  const yy = String((vte.getUTCFullYear() + 543) % 100).padStart(2, '0');
  const hh = String(vte.getUTCHours()).padStart(2, '0');
  const mi = String(vte.getUTCMinutes()).padStart(2, '0');
  return `${dd} ${mm} ${yy} ${hh}:${mi}`;
}

export function randomToken(len = 16): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** ເລກທີ່ເອກະສານ ເຊັ່ນ MV-690830-8F3A */
export function makeRef(prefix = 'MV'): string {
  const vte = new Date(Date.now() + 7 * 3600_000);
  const y = String((vte.getUTCFullYear() + 543) % 100).padStart(2, '0');
  const m = String(vte.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vte.getUTCDate()).padStart(2, '0');
  return `${prefix}-${y}${m}${d}-${randomToken(2).toUpperCase()}`;
}

/** normalize ຂໍ້ຄວາມຄົ້ນຫາ: ຕັດຊ່ອງວ່າງຊ້ຳ + lower case */
export function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** ແປງເລກລາວ ແລະ ໄທ (໐-໙, ๐-๙) ເປັນເລກອາຣັບ ແລ້ວ parse */
export function parseNumber(raw: string): number | null {
  const LAO = '໐໑໒໓໔໕໖໗໘໙';
  const THAI = '๐๑๒๓๔๕๖๗๘๙';
  const converted = raw
    .replace(/[໐-໙]/g, (c) => String(LAO.indexOf(c)))
    .replace(/[๐-๙]/g, (c) => String(THAI.indexOf(c)));
  const cleaned = converted.replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
