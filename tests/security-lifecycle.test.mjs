import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../server/db.mjs';
import {createApp} from '../server/index.mjs';
import {totpCode,salesEnabled} from '../server/security.mjs';

test('admin MFA elevation, sales kill-switch, privacy export/delete and consent withdraw', async t => {
  const db = database(':memory:');
  const server = createApp(db);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.close(); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const req = async (path, body, extra = {}) => {
    const res = await fetch(base + path, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: {
        Origin: 'http://localhost:3100',
        Cookie: cookie,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extra
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      if (c.startsWith('everwick=')) cookie = c.split(';')[0];
      if (c.startsWith('everwick_admin=')) {
        const part = c.split(';')[0];
        cookie = cookie ? `${cookie}; ${part}` : part;
      }
    }
    return { res, data };
  };

  const reg = await req('/api/auth/register', { name: 'SecAdmin', email: 'sec@example.com', password: 'password for testing' });
  assert.equal(reg.res.status, 201);
  db.prepare("UPDATE users SET role='admin' WHERE email=?").run('sec@example.com');

  assert.equal(salesEnabled(db), true);
  const beforeMfa = await req('/api/admin');
  assert.equal(beforeMfa.res.status, 200);
  assert.equal(beforeMfa.data.sales_enabled, true);
  assert.equal(beforeMfa.data.mfa.enabled, false);

  const setup = await req('/api/admin/mfa/setup', {});
  assert.equal(setup.res.status, 200);
  assert.match(setup.data.secret, /^[A-Z2-7]+$/);
  assert.match(setup.data.otpauth, /^otpauth:\/\/totp\//);
  const badConfirm = await req('/api/admin/mfa/confirm', { code: '000000' });
  assert.equal(badConfirm.res.status, 401);
  const confirm = await req('/api/admin/mfa/confirm', { code: totpCode(setup.data.secret) });
  assert.equal(confirm.res.status, 200);
  assert.equal(confirm.data.enabled, true);

  const blocked = await req('/api/admin');
  assert.equal(blocked.res.status, 401);
  assert.match(blocked.data.error, /MFA elevation/i);

  const elevate = await req('/api/admin/mfa/elevate', { code: totpCode(setup.data.secret) });
  assert.equal(elevate.res.status, 200);

  const kill = await req('/api/admin/sales', { enabled: false });
  assert.equal(kill.res.status, 200);
  assert.equal(kill.data.sales_enabled, false);
  assert.equal(salesEnabled(db), false);
  const checkout = await req('/api/checkout', { tier: 'citizen' });
  assert.equal(checkout.res.status, 503);
  assert.match(checkout.data.error, /paused/i);

  const resume = await req('/api/admin/sales', { enabled: true });
  assert.equal(resume.res.status, 200);
  assert.equal(resume.data.sales_enabled, true);

  const wait = await req('/api/waitlist', { email: 'sec@example.com', consent: true });
  assert.equal(wait.res.status, 201);
  const withdraw = await req('/api/privacy/consent-withdraw', { email: 'sec@example.com', code: wait.data.code });
  assert.equal(withdraw.res.status, 200);
  assert.equal(withdraw.data.withdrawn, true);
  assert.equal(db.prepare('SELECT consent FROM waitlist WHERE email=?').get('sec@example.com').consent, 0);

  const exported = await req('/api/privacy/export');
  assert.equal(exported.res.status, 200);
  assert.equal(exported.data.account.email, 'sec@example.com');
  assert.ok(Array.isArray(exported.data.purchases));

  const delBad = await req('/api/privacy/delete', { confirmEmail: 'wrong@example.com' });
  assert.equal(delBad.res.status, 400);
  const del = await req('/api/privacy/delete', { confirmEmail: 'sec@example.com' });
  assert.equal(del.res.status, 200);
  assert.equal(del.data.deleted, true);
  assert.equal((await req('/api/world')).res.status, 401);
  assert.ok(db.prepare("SELECT email FROM users WHERE id=?").get(reg.data.id).email.endsWith('@invalid.invalid'));
});
