export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  /** Messaging API — ໃຊ້ກວດລາຍເຊັນ webhook */
  LINE_CHANNEL_SECRET: string;
  /** Messaging API — ໃຊ້ຕອບກັບ/ສົ່ງຂໍ້ຄວາມ */
  LINE_CHANNEL_ACCESS_TOKEN: string;
  /** LINE Login channel id ຂອງ LIFF — ໃຊ້ກວດ ID token */
  LINE_LOGIN_CHANNEL_ID: string;
  LIFF_ID: string;

  ENVIRONMENT?: string;
  DEV_LINE_USER_ID?: string;
  DEV_LINE_DISPLAY_NAME?: string;
}

export type MovementType = 'issue' | 'receive' | 'adjust' | 'transfer_out' | 'transfer_in';
export type ActionType = 'issue' | 'receive' | 'adjust' | 'transfer';

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  min_qty: number;
  note: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  is_default: number;
  active: number;
}

export interface Actor {
  lineUserId: string | null;
  name: string | null;
  source: 'line' | 'liff' | 'system';
}

export interface DraftPayload {
  action: ActionType;
  query: string;
  productId?: number;
  locationId?: number;
  toLocationId?: number;
  qty?: number;
  note?: string;
  /** true = ຜູ້ໃຊ້ພຽງແຕ່ຕ້ອງການເບິ່ງຂໍ້ມູນສິນຄ້າ ບໍ່ໄດ້ເຮັດລາຍການ */
  view?: boolean;
}

export type DraftStep = 'pick_product' | 'pick_location' | 'pick_to_location' | 'ask_qty' | 'confirm';

export interface Draft {
  lineUserId: string;
  token: string;
  step: DraftStep;
  payload: DraftPayload;
}
