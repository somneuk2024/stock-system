import type { Context, Next } from 'hono';
import type { Env } from '../types';
import * as repo from '../db/repo';

export interface AuthUser {
  lineUserId: string;
  name: string | null;
  picture: string | null;
}

interface VerifyResponse {
  sub: string;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: number;
}

/** ກວດ ID token ທີ່ໄດ້ຈາກ liff.getIDToken() ກັບເຊີບເວີຂອງ LINE */
export async function verifyIdToken(env: Env, idToken: string): Promise<AuthUser | null> {
  if (!env.LINE_LOGIN_CHANNEL_ID) {
    console.error('LINE_LOGIN_CHANNEL_ID ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ');
    return null;
  }
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_LOGIN_CHANNEL_ID }),
  });
  if (!res.ok) {
    console.warn('verify id_token failed', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as VerifyResponse;
  if (!data.sub) return null;
  return { lineUserId: data.sub, name: data.name ?? null, picture: data.picture ?? null };
}

export type AppContext = Context<{ Bindings: Env; Variables: { user: AuthUser } }>;

export async function requireAuth(c: AppContext, next: Next): Promise<Response | void> {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  // ໂໝດພັດທະນາ: ຂ້າມການຢືນຢັນໂຕຕົນເພື່ອເປີດໜ້າ LIFF ໃນເບຣົາເຊີປົກກະຕິ
  if (!token && c.env.ENVIRONMENT === 'dev' && c.env.DEV_LINE_USER_ID) {
    const user: AuthUser = {
      lineUserId: c.env.DEV_LINE_USER_ID,
      name: c.env.DEV_LINE_DISPLAY_NAME ?? 'Dev User',
      picture: null,
    };
    await repo.ensureUser(c.env.DB, user.lineUserId, user.name, null);
    c.set('user', user);
    return next();
  }

  if (!token) return c.json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບຜ່ານ LINE' }, 401);

  const user = await verifyIdToken(c.env, token);
  if (!user) return c.json({ error: 'ເຊສຊັນໝົດອາຍຸ ກະລຸນາເປີດແອັບໃໝ່ອີກຄັ້ງ' }, 401);

  await repo.ensureUser(c.env.DB, user.lineUserId, user.name, user.picture);
  c.set('user', user);
  return next();
}
