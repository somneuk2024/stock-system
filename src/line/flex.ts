/* ຕົວສ້າງ Flex Message — ເປັນ "ໜ້າຕາ" ຂອງລະບົບຝັ່ງແຊັດ LINE */
import type { ActionType } from '../types';
import type { LevelRow, MovementRow, ProductWithStock } from '../db/repo';
import { fmtQty, fmtLaoDateTime } from '../lib/util';

type Flex = any;

export const C = {
  ink: '#101828',
  body: '#475467',
  muted: '#98A2B3',
  line: '#EAECF0',
  soft: '#F9FAFB',
  white: '#FFFFFF',
  brand: '#0F172A',
  issue: '#E5484D',
  receive: '#0E9F6E',
  adjust: '#F59E0B',
  transfer: '#3B82F6',
  ok: '#0E9F6E',
  warn: '#F59E0B',
  danger: '#E5484D',
};

export const ACTION_META: Record<ActionType, { label: string; color: string; icon: string; verb: string }> = {
  issue: { label: 'ເບີກອອກ', color: C.issue, icon: '📤', verb: 'ເບີກ' },
  receive: { label: 'ຮັບເຂົ້າ', color: C.receive, icon: '📥', verb: 'ຮັບເຂົ້າ' },
  adjust: { label: 'ປັບຍອດ', color: C.adjust, icon: '⚖️', verb: 'ປັບຍອດເປັນ' },
  transfer: { label: 'ຍ້າຍສາງ', color: C.transfer, icon: '🔁', verb: 'ຍ້າຍ' },
};

export const VIEW_META = { label: 'ເບິ່ງຂໍ້ມູນສິນຄ້າ', color: C.brand, icon: '🔎', verb: 'ເບິ່ງ' };

export function pb(data: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined) p.set(k, String(v));
  return p.toString();
}

/* ---------------------------------------------------------- primitives */

function kv(label: string, value: string, color = C.ink, bold = false): Flex {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: C.muted, flex: 4 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color,
        flex: 7,
        align: 'end',
        weight: bold ? 'bold' : 'regular',
        wrap: true,
      },
    ],
  };
}

function divider(): Flex {
  return { type: 'separator', color: C.line };
}

function header(title: string, subtitle: string, color: string): Flex {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: color,
    paddingAll: '16px',
    paddingBottom: '14px',
    contents: [
      { type: 'text', text: subtitle, size: 'xxs', color: '#FFFFFFCC', weight: 'bold' },
      { type: 'text', text: title, size: 'lg', color: C.white, weight: 'bold', margin: 'xs', wrap: true },
    ],
  };
}

function button(label: string, data: string, style: 'primary' | 'secondary' | 'link' = 'primary', color?: string): Flex {
  return {
    type: 'button',
    style,
    height: 'sm',
    color: style === 'primary' ? color ?? C.brand : undefined,
    action: { type: 'postback', label, data, displayText: undefined },
  };
}

function uriButton(label: string, uri: string, style: 'primary' | 'secondary' | 'link' = 'link'): Flex {
  return { type: 'button', style, height: 'sm', action: { type: 'uri', label, uri } };
}

export function text(msg: string, quickReplies = true): Flex {
  const m: Flex = { type: 'text', text: msg };
  if (quickReplies) m.quickReply = quickReplyBar();
  return m;
}

export function quickReplyBar(): Flex {
  const items = [
    { label: '📦 ກວດສະຕອກ', text: 'ກວດ ' },
    { label: '📤 ເບີກຂອງ', text: 'ເບີກ ' },
    { label: '📥 ຮັບເຂົ້າ', text: 'ຮັບເຂົ້າ ' },
    { label: '⚠️ ໃກ້ໝົດ', text: 'ໃກ້ໝົດ' },
    { label: '🕘 ປະຫວັດ', text: 'ປະຫວັດ' },
    { label: '❓ ວິທີໃຊ້', text: 'ຊ່ວຍເຫຼືອ' },
  ];
  return {
    items: items.map((i) => ({
      type: 'action',
      action: { type: 'message', label: i.label, text: i.text },
    })),
  };
}

function wrap(altText: string, bubble: Flex, withQuickReply = true): Flex {
  const msg: Flex = { type: 'flex', altText, contents: bubble };
  if (withQuickReply) msg.quickReply = quickReplyBar();
  return msg;
}

function stockColor(qty: number, minQty: number): string {
  if (qty <= 0) return C.danger;
  if (minQty > 0 && qty <= minQty) return C.warn;
  return C.ok;
}

/* -------------------------------------------------------------- bubbles */

export function helpMessage(liffUrl: string): Flex {
  const cmd = (title: string, example: string, desc: string) => ({
    type: 'box',
    layout: 'vertical',
    spacing: 'xs',
    margin: 'lg',
    contents: [
      { type: 'text', text: title, size: 'sm', weight: 'bold', color: C.ink },
      { type: 'text', text: example, size: 'xs', color: C.body, wrap: true },
      { type: 'text', text: desc, size: 'xxs', color: C.muted, wrap: true },
    ],
  });

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header('ພິມຄຳສັ່ງສັ້ນໆໄດ້ເລີຍ', 'ວິທີໃຊ້ງານ', C.brand),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: [
        cmd('ກວດສະຕອກ', 'ກວດ ປາກກາ', 'ເບິ່ງຍອດຄົງເຫຼືອແຍກຕາມສາງ (ຫຼືພິມ/ສະແກນບາໂຄ້ດໄດ້ເລີຍ)'),
        divider(),
        cmd('ເບີກອອກ', 'ເບີກ ປາກກາ 5', 'ລະບົບຈະໃຫ້ເລືອກສິນຄ້າ/ສາງ ແລ້ວຢືນຢັນກ່ອນຕັດສະຕອກ'),
        divider(),
        cmd('ຮັບເຂົ້າ', 'ຮັບເຂົ້າ ເຈ້ຍ A4 10 @ສາງກາງ', 'ໃສ່ @ຊື່ສາງ ເພື່ອລະບຸສາງທັນທີ'),
        divider(),
        cmd('ປັບຍອດ', 'ປັບ ປາກກາ 42', 'ປັບໃຫ້ຕົງກັບຈຳນວນທີ່ນັບໄດ້ຈິງ'),
        divider(),
        cmd('ຍ້າຍສາງ', 'ຍ້າຍ ປາກກາ 5 @ສາງກາງ @ຮ້ານຄ້າ', 'ຕັດຈາກສາງທຳອິດ ໄປເພີ່ມທີ່ສາງຫຼັງ'),
        divider(),
        cmd('ລາຍງານ', 'ໃກ້ໝົດ · ປະຫວັດ · ສາງ', 'ເບິ່ງຂອງໃກ້ໝົດ ປະຫວັດລ່າສຸດ ແລະ ລາຍຊື່ສາງ'),
        {
          type: 'text',
          text: 'ເພີ່ມໝາຍເຫດໄດ້ດ້ວຍເຄື່ອງໝາຍ # ເຊັ່ນ  ເບີກ ປາກກາ 5 #ວຽກອິເວນ',
          size: 'xxs',
          color: C.muted,
          wrap: true,
          margin: 'lg',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [uriButton('ເປີດແດຊບອດ', liffUrl, 'primary')],
    },
    styles: { footer: { separator: true, separatorColor: C.line } },
  };
  return wrap('ວິທີໃຊ້ງານລະບົບສະຕອກ', bubble);
}

export function productCard(
  product: ProductWithStock | (ProductWithStock & { total_qty: number }),
  levels: LevelRow[],
  liffUrl: string,
): Flex {
  const total = product.total_qty ?? 0;
  const color = stockColor(total, product.min_qty);
  const levelRows = levels.map((l) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: l.name, size: 'sm', color: C.body, flex: 5 },
      {
        type: 'text',
        text: `${fmtQty(l.qty)} ${product.unit}`,
        size: 'sm',
        align: 'end',
        flex: 4,
        weight: 'bold',
        color: l.qty > 0 ? C.ink : C.muted,
      },
    ],
  }));

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: product.sku, size: 'xxs', color: C.muted, weight: 'bold', flex: 5 },
            {
              type: 'text',
              text: product.category ?? '—',
              size: 'xxs',
              color: C.muted,
              align: 'end',
              flex: 5,
            },
          ],
        },
        { type: 'text', text: product.name, size: 'lg', weight: 'bold', color: C.ink, wrap: true, margin: 'sm' },
        {
          type: 'box',
          layout: 'baseline',
          margin: 'md',
          contents: [
            { type: 'text', text: fmtQty(total), size: 'xxl', weight: 'bold', color, flex: 0 },
            { type: 'text', text: ` ${product.unit}`, size: 'sm', color: C.muted, margin: 'sm', flex: 0 },
          ],
        },
        {
          type: 'text',
          text:
            total <= 0
              ? '🔴 ສິນຄ້າໝົດ'
              : product.min_qty > 0 && total <= product.min_qty
                ? `🟠 ຕ່ຳກວ່າຈຸດສັ່ງຊື້ (ຂັ້ນຕ່ຳ ${fmtQty(product.min_qty)})`
                : `🟢 ຄົງເຫຼືອປົກກະຕິ${product.min_qty > 0 ? ` (ຂັ້ນຕ່ຳ ${fmtQty(product.min_qty)})` : ''}`,
          size: 'xxs',
          color: color,
          margin: 'sm',
        },
        { type: 'separator', color: C.line, margin: 'lg' },
        { type: 'text', text: 'ຄົງເຫຼືອແຍກຕາມສາງ', size: 'xxs', color: C.muted, weight: 'bold', margin: 'lg' },
        { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: levelRows },
        ...(product.barcode
          ? [{ type: 'text', text: `ບາໂຄ້ດ ${product.barcode}`, size: 'xxs', color: C.muted, margin: 'lg' }]
          : []),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '12px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            button('ເບີກອອກ', pb({ a: 'start', act: 'issue', pid: product.id }), 'primary', C.issue),
            button('ຮັບເຂົ້າ', pb({ a: 'start', act: 'receive', pid: product.id }), 'primary', C.receive),
          ],
        },
        uriButton('ເບິ່ງລາຍລະອຽດໃນແດຊບອດ', `${liffUrl}?p=${product.id}`),
      ],
    },
    styles: { footer: { separator: true, separatorColor: C.line } },
  };
  return wrap(`${product.name} ຄົງເຫຼືອ ${fmtQty(total)} ${product.unit}`, bubble);
}

export function productPicker(
  items: ProductWithStock[],
  action: ActionType | 'view',
  token: string,
  hint?: string,
): Flex {
  const meta = action === 'view' ? VIEW_META : ACTION_META[action];
  const rows = items.slice(0, 8).map((p) => ({
    type: 'box',
    layout: 'vertical',
    paddingAll: '10px',
    cornerRadius: '10px',
    backgroundColor: C.soft,
    margin: 'sm',
    action: { type: 'postback', data: pb({ a: 'pick_product', t: token, pid: p.id }) },
    contents: [
      { type: 'text', text: p.name, size: 'sm', weight: 'bold', color: C.ink, wrap: true },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'xs',
        contents: [
          { type: 'text', text: p.sku, size: 'xxs', color: C.muted, flex: 5 },
          {
            type: 'text',
            text: `ຄົງເຫຼືອ ${fmtQty(p.total_qty)} ${p.unit}`,
            size: 'xxs',
            color: stockColor(p.total_qty, p.min_qty),
            align: 'end',
            flex: 6,
            weight: 'bold',
          },
        ],
      },
    ],
  }));

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header(hint ?? 'ເລືອກສິນຄ້າທີ່ຕ້ອງການ', `${meta.icon} ${meta.label}`, meta.color),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      contents: [
        { type: 'text', text: `ພົບ ${items.length} ລາຍການທີ່ຕົງກັນ`, size: 'xxs', color: C.muted },
        ...rows,
        ...(items.length > 8
          ? [{ type: 'text', text: 'ສະແດງ 8 ລາຍການທຳອິດ — ພິມໃຫ້ຈຳເພາະຂຶ້ນເພື່ອຫຼຸດຜົນລັບ', size: 'xxs', color: C.muted, margin: 'md', wrap: true }]
          : []),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '10px',
      contents: [button('ຍົກເລິກ', pb({ a: 'cancel', t: token }), 'secondary')],
    },
  };
  return wrap('ເລືອກສິນຄ້າ', bubble);
}

export function locationPicker(
  productName: string,
  unit: string,
  levels: LevelRow[],
  action: ActionType,
  token: string,
  target: 'from' | 'to' = 'from',
): Flex {
  const meta = ACTION_META[action];
  const title =
    target === 'to' ? 'ເລືອກສາງປາຍທາງ' : action === 'receive' ? 'ຮັບເຂົ້າທີ່ສາງໃດ' : 'ເບີກຈາກສາງໃດ';
  const rows = levels.map((l) => ({
    type: 'box',
    layout: 'horizontal',
    paddingAll: '10px',
    cornerRadius: '10px',
    backgroundColor: C.soft,
    margin: 'sm',
    action: {
      type: 'postback',
      data: pb({ a: target === 'to' ? 'pick_to_location' : 'pick_location', t: token, lid: l.location_id }),
    },
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 6,
        contents: [
          { type: 'text', text: l.name, size: 'sm', weight: 'bold', color: C.ink },
          { type: 'text', text: l.code, size: 'xxs', color: C.muted, margin: 'xs' },
        ],
      },
      {
        type: 'text',
        text: `${fmtQty(l.qty)} ${unit}`,
        size: 'sm',
        weight: 'bold',
        color: l.qty > 0 ? C.ink : C.muted,
        align: 'end',
        gravity: 'center',
        flex: 4,
      },
    ],
  }));

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header(title, `${meta.icon} ${meta.label}`, meta.color),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      contents: [{ type: 'text', text: productName, size: 'sm', color: C.body, wrap: true, weight: 'bold' }, ...rows],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '10px',
      contents: [button('ຍົກເລິກ', pb({ a: 'cancel', t: token }), 'secondary')],
    },
  };
  return wrap(title, bubble);
}

export interface ConfirmView {
  action: ActionType;
  productName: string;
  sku: string;
  unit: string;
  qty: number;
  locationName: string;
  toLocationName?: string;
  currentQty: number;
  afterQty: number;
  minQty: number;
  note?: string | null;
  token: string;
}

export function confirmCard(v: ConfirmView): Flex {
  const meta = ACTION_META[v.action];
  const afterColor = stockColor(v.afterQty, v.minQty);
  const rows: Flex[] = [
    kv('ສາງ', v.action === 'transfer' ? `${v.locationName} → ${v.toLocationName}` : v.locationName),
    kv(v.action === 'adjust' ? 'ປັບເປັນ' : 'ຈຳນວນ', `${fmtQty(v.qty)} ${v.unit}`, meta.color, true),
    divider(),
    kv('ຄົງເຫຼືອປັດຈຸບັນ', `${fmtQty(v.currentQty)} ${v.unit}`),
    kv('ຄົງເຫຼືອຫຼັງເຮັດລາຍການ', `${fmtQty(v.afterQty)} ${v.unit}`, afterColor, true),
  ];
  if (v.note) rows.push(divider(), kv('ໝາຍເຫດ', v.note));

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header('ກວດສອບກ່ອນຢືນຢັນ', `${meta.icon} ${meta.label}`, meta.color),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: v.productName, size: 'md', weight: 'bold', color: C.ink, wrap: true },
            { type: 'text', text: v.sku, size: 'xxs', color: C.muted, margin: 'xs' },
          ],
        },
        divider(),
        ...rows,
        ...(v.afterQty <= 0
          ? [{ type: 'text', text: '⚠️ ເຮັດລາຍການນີ້ແລ້ວສິນຄ້າຈະໝົດສາງ', size: 'xxs', color: C.danger, margin: 'md', wrap: true }]
          : v.minQty > 0 && v.afterQty <= v.minQty
            ? [{ type: 'text', text: `⚠️ ຈະຕ່ຳກວ່າຈຸດສັ່ງຊື້ (ຂັ້ນຕ່ຳ ${fmtQty(v.minQty)})`, size: 'xxs', color: C.warn, margin: 'md', wrap: true }]
            : []),
      ],
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: '12px',
      contents: [
        button('ຍົກເລິກ', pb({ a: 'cancel', t: v.token }), 'secondary'),
        button('ຢືນຢັນ', pb({ a: 'confirm', t: v.token }), 'primary', meta.color),
      ],
    },
    styles: { footer: { separator: true, separatorColor: C.line } },
  };
  return wrap(`ຢືນຢັນ${meta.label} ${v.productName} ${fmtQty(v.qty)} ${v.unit}`, bubble);
}

export interface ResultView extends Omit<ConfirmView, 'token' | 'currentQty'> {
  ref: string;
  totalQty: number;
  actorName?: string | null;
  toAfterQty?: number;
}

export function resultCard(v: ResultView, liffUrl: string): Flex {
  const meta = ACTION_META[v.action];
  const afterColor = stockColor(v.afterQty, v.minQty);
  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header('ບັນທຶກລາຍການຮຽບຮ້ອຍ', `✅ ${meta.label}ສຳເລັດ`, meta.color),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: v.productName, size: 'md', weight: 'bold', color: C.ink, wrap: true },
            { type: 'text', text: `${v.sku} · ເລກທີ ${v.ref}`, size: 'xxs', color: C.muted, margin: 'xs' },
          ],
        },
        divider(),
        kv('ສາງ', v.action === 'transfer' ? `${v.locationName} → ${v.toLocationName}` : v.locationName),
        kv(meta.label, `${fmtQty(v.qty)} ${v.unit}`, meta.color, true),
        kv(
          v.action === 'transfer' ? `ຄົງເຫຼືອ ${v.locationName}` : 'ຄົງເຫຼືອໃນສາງນີ້',
          `${fmtQty(v.afterQty)} ${v.unit}`,
          afterColor,
          true,
        ),
        ...(v.action === 'transfer' && v.toAfterQty !== undefined
          ? [kv(`ຄົງເຫຼືອ ${v.toLocationName}`, `${fmtQty(v.toAfterQty)} ${v.unit}`, C.ink, true)]
          : []),
        kv('ລວມທຸກສາງ', `${fmtQty(v.totalQty)} ${v.unit}`),
        ...(v.note ? [kv('ໝາຍເຫດ', v.note)] : []),
        ...(v.actorName ? [kv('ຜູ້ເຮັດລາຍການ', v.actorName)] : []),
        ...(v.totalQty <= 0
          ? [{ type: 'text', text: '🔴 ສິນຄ້າໝົດສະຕອກແລ້ວ ຄວນສັ່ງຊື້ເພີ່ມ', size: 'xxs', color: C.danger, margin: 'md', wrap: true }]
          : v.minQty > 0 && v.totalQty <= v.minQty
            ? [{ type: 'text', text: `🟠 ຄົງເຫຼືອລວມຕ່ຳກວ່າຈຸດສັ່ງຊື້ (ຂັ້ນຕ່ຳ ${fmtQty(v.minQty)})`, size: 'xxs', color: C.warn, margin: 'md', wrap: true }]
            : []),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [uriButton('ເປີດແດຊບອດ', liffUrl)],
    },
    styles: { footer: { separator: true, separatorColor: C.line } },
  };
  return wrap(`${meta.label} ${v.productName} ${fmtQty(v.qty)} ${v.unit} ສຳເລັດ`, bubble);
}

export function lowStockCard(items: ProductWithStock[], liffUrl: string): Flex {
  const rows = items.slice(0, 10).map((p) => ({
    type: 'box',
    layout: 'horizontal',
    margin: 'md',
    action: { type: 'postback', data: pb({ a: 'view', pid: p.id }) },
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 7,
        contents: [
          { type: 'text', text: p.name, size: 'sm', color: C.ink, wrap: true, weight: 'bold' },
          { type: 'text', text: `ຂັ້ນຕ່ຳ ${fmtQty(p.min_qty)} ${p.unit}`, size: 'xxs', color: C.muted, margin: 'xs' },
        ],
      },
      {
        type: 'text',
        text: `${fmtQty(p.total_qty)} ${p.unit}`,
        size: 'sm',
        weight: 'bold',
        color: stockColor(p.total_qty, p.min_qty),
        align: 'end',
        gravity: 'center',
        flex: 4,
      },
    ],
  }));

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header(`${items.length} ລາຍການຕ້ອງເຕີມສະຕອກ`, '⚠️ ສິນຄ້າໃກ້ໝົດ / ໝົດ', C.warn),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: rows.length
        ? rows
        : [{ type: 'text', text: 'ຍອດດີເລີດ — ບໍ່ມີສິນຄ້າຕ່ຳກວ່າຈຸດສັ່ງຊື້ 🎉', size: 'sm', color: C.body, wrap: true }],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [uriButton('ເບິ່ງທັງໝົດໃນແດຊບອດ', `${liffUrl}?tab=products&status=low`)],
    },
  };
  return wrap('ລາຍການສິນຄ້າໃກ້ໝົດ', bubble);
}

export function historyCard(rows: MovementRow[], liffUrl: string, title = 'ການເຄື່ອນໄຫວລ່າສຸດ'): Flex {
  const typeLabel: Record<string, { t: string; c: string }> = {
    issue: { t: 'ເບີກອອກ', c: C.issue },
    receive: { t: 'ຮັບເຂົ້າ', c: C.receive },
    adjust: { t: 'ປັບຍອດ', c: C.adjust },
    transfer_out: { t: 'ຍ້າຍອອກ', c: C.transfer },
    transfer_in: { t: 'ຍ້າຍເຂົ້າ', c: C.transfer },
  };
  const items = rows.slice(0, 10).map((m) => {
    const meta = typeLabel[m.type] ?? { t: m.type, c: C.body };
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: m.product_name, size: 'sm', weight: 'bold', color: C.ink, flex: 7, wrap: true },
            {
              type: 'text',
              text: `${m.delta > 0 ? '+' : ''}${fmtQty(m.delta)}`,
              size: 'sm',
              weight: 'bold',
              color: meta.c,
              align: 'end',
              flex: 3,
            },
          ],
        },
        {
          type: 'text',
          text: `${meta.t} · ${m.location_name} · ${fmtLaoDateTime(m.created_at)}${m.actor_name ? ' · ' + m.actor_name : ''}`,
          size: 'xxs',
          color: C.muted,
          margin: 'xs',
          wrap: true,
        },
      ],
    };
  });

  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header(title, '🕘 ປະຫວັດ', C.brand),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: items.length
        ? items
        : [{ type: 'text', text: 'ຍັງບໍ່ມີການເຄື່ອນໄຫວ', size: 'sm', color: C.body }],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [uriButton('ເບິ່ງປະຫວັດທັງໝົດ', `${liffUrl}?tab=history`)],
    },
  };
  return wrap(title, bubble);
}

export function locationsCard(rows: { name: string; code: string; items: number; units: number }[]): Flex {
  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header(`ທັງໝົດ ${rows.length} ສາງ`, '🏬 ສາງສິນຄ້າ', C.brand),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: rows.map((r) => ({
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 6,
            contents: [
              { type: 'text', text: r.name, size: 'sm', weight: 'bold', color: C.ink },
              { type: 'text', text: r.code, size: 'xxs', color: C.muted, margin: 'xs' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 5,
            contents: [
              { type: 'text', text: `${fmtQty(r.units)} ໜ່ວຍ`, size: 'sm', align: 'end', color: C.ink, weight: 'bold' },
              { type: 'text', text: `${r.items} ລາຍການ`, size: 'xxs', align: 'end', color: C.muted, margin: 'xs' },
            ],
          },
        ],
      })),
    },
  };
  return wrap('ລາຍຊື່ສາງ', bubble);
}

export function summaryCard(
  s: { productCount: number; totalUnits: number; lowCount: number; outCount: number; todayIssue: number; todayReceive: number },
  liffUrl: string,
): Flex {
  const stat = (label: string, value: string, color = C.ink) => ({
    type: 'box',
    layout: 'vertical',
    flex: 1,
    contents: [
      { type: 'text', text: value, size: 'xl', weight: 'bold', color },
      { type: 'text', text: label, size: 'xxs', color: C.muted, margin: 'xs', wrap: true },
    ],
  });
  const bubble: Flex = {
    type: 'bubble',
    size: 'mega',
    header: header('ພາບລວມສະຕອກມື້ນີ້', '📊 ສະຫຼຸບ', C.brand),
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [stat('ລາຍການສິນຄ້າ', fmtQty(s.productCount)), stat('ໜ່ວຍຄົງເຫຼືອລວມ', fmtQty(s.totalUnits))],
        },
        divider(),
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            stat('ໃກ້ໝົດ', fmtQty(s.lowCount), C.warn),
            stat('ໝົດສະຕອກ', fmtQty(s.outCount), C.danger),
          ],
        },
        divider(),
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            stat('ເບີກມື້ນີ້', fmtQty(s.todayIssue), C.issue),
            stat('ຮັບເຂົ້າມື້ນີ້', fmtQty(s.todayReceive), C.receive),
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [uriButton('ເປີດແດຊບອດ', liffUrl, 'primary')],
    },
    styles: { footer: { separator: true, separatorColor: C.line } },
  };
  return wrap('ພາບລວມສະຕອກ', bubble);
}
