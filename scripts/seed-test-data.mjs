#!/usr/bin/env node
/**
 * Скрипт наполнения Synapse тестовыми данными.
 * Создаёт пользователей, комнаты, invite/join, сообщения.
 * Запуск: node scripts/seed-test-data.mjs
 */

const SYNAPSE = 'http://localhost:8008';

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SYNAPSE}${path}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function login(user, password) {
  const r = await api('/_matrix/client/v3/login', {
    method: 'POST',
    body: { type: 'm.login.password', user, password }
  });
  if (!r.access_token) throw new Error(`Login failed for ${user}: ${JSON.stringify(r)}`);
  return r.access_token;
}

async function createUser(token, username, displayname) {
  return api(`/_synapse/admin/v2/users/@${username}:uplink.local`, {
    method: 'PUT', token,
    body: { password: 'test123', admin: false, deactivated: false, displayname }
  });
}

async function getRoomId(token, alias) {
  const encoded = encodeURIComponent(`#${alias}:uplink.local`);
  const r = await api(`/_matrix/client/v3/directory/room/${encoded}`, { token });
  return r.room_id || null;
}

async function createRoom(token, alias, name, topic) {
  const r = await api('/_matrix/client/v3/createRoom', {
    method: 'POST', token,
    body: {
      room_alias_name: alias,
      name,
      topic,
      visibility: 'public',
      preset: 'public_chat'
    }
  });
  return r.room_id;
}

async function invite(token, roomId, userId) {
  return api(`/_matrix/client/v3/rooms/${roomId}/invite`, {
    method: 'POST', token, body: { user_id: userId }
  });
}

async function joinRoom(token, roomId) {
  return api(`/_matrix/client/v3/join/${roomId}`, {
    method: 'POST', token, body: {}
  });
}

let txnCounter = 0;
async function sendMessage(token, roomId, body, extra = {}) {
  const txn = `seed_${Date.now()}_${txnCounter++}`;
  return api(`/_matrix/client/v3/rooms/${roomId}/send/m.room.message/${txn}`, {
    method: 'PUT', token,
    body: { msgtype: 'm.text', body, ...extra }
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──

async function main() {
  // 1. Admin token
  console.log('=== ШАГ 1: Admin token ===');
  const adminToken = await login('admin', 'admin_poc_pass');
  console.log('  Admin token OK');

  // 2. Create users
  console.log('\n=== ШАГ 2: Создание пользователей ===');
  const users = [
    { username: 'alice', displayname: 'Alice Иванова' },
    { username: 'bob', displayname: 'Bob Петров' },
    { username: 'charlie', displayname: 'Charlie Сидоров' },
    { username: 'diana', displayname: 'Diana Козлова' },
    { username: 'eve', displayname: 'Eve Смирнова' },
  ];

  for (const u of users) {
    await createUser(adminToken, u.username, u.displayname);
    console.log(`  Created @${u.username}:uplink.local (${u.displayname})`);
  }

  // 3. Verify users
  const usersList = await api('/_synapse/admin/v2/users?from=0&limit=20', { token: adminToken });
  console.log(`  Total users in Synapse: ${usersList.users?.length || '?'}`);

  // 4. Get/create rooms
  console.log('\n=== ШАГ 3: Комнаты ===');
  const rooms = {};
  const roomDefs = [
    { alias: 'general', name: 'General', topic: 'Общий канал команды' },
    { alias: 'backend', name: 'Backend', topic: 'Backend-разработка' },
    { alias: 'frontend', name: 'Frontend', topic: 'Frontend-разработка' },
  ];

  for (const rd of roomDefs) {
    let roomId = await getRoomId(adminToken, rd.alias);
    if (!roomId) {
      roomId = await createRoom(adminToken, rd.alias, rd.name, rd.topic);
      console.log(`  Created #${rd.alias} → ${roomId}`);
    } else {
      console.log(`  Found #${rd.alias} → ${roomId}`);
    }
    rooms[rd.alias] = roomId;
  }

  // 5. Login all users
  console.log('\n=== ШАГ 4: Login пользователей ===');
  const tokens = {};
  for (const u of users) {
    tokens[u.username] = await login(u.username, 'test123');
    console.log(`  ${u.username} logged in`);
  }

  // 6. Invite + Join
  console.log('\n=== ШАГ 5: Invite + Join ===');
  const membership = {
    general: ['alice', 'bob', 'charlie', 'diana', 'eve'],
    backend: ['bob', 'charlie', 'eve'],
    frontend: ['alice', 'diana', 'eve'],
  };

  for (const [room, members] of Object.entries(membership)) {
    const roomId = rooms[room];
    for (const username of members) {
      const userId = `@${username}:uplink.local`;
      await invite(adminToken, roomId, userId);
      await joinRoom(tokens[username], roomId);
      console.log(`  ${username} → #${room}`);
    }
  }

  // Verify membership
  for (const [room, _] of Object.entries(membership)) {
    const m = await api(`/_synapse/admin/v1/rooms/${rooms[room]}/members`, { token: adminToken });
    console.log(`  #${room}: ${m.members?.length || '?'} участников`);
  }

  // 7. Send messages to #general
  console.log('\n=== ШАГ 6: Сообщения в #general ===');
  const generalMsgs = [
    { user: 'eve', text: 'Всем привет! Сегодня планируем спринт, кто готов?' },
    { user: 'alice', text: 'Привет! Я готова, вчера закончила компонент Sidebar' },
    { user: 'bob', text: 'Привет, я тоже. API авторизации готов, нужен ревью' },
    { user: 'charlie', text: 'Я написал автотесты на Matrix-клиент, 12 тестов, все зелёные' },
    { user: 'diana', text: 'Docker-инфра обновлена, добавила мониторинг через Prometheus' },
    { user: 'eve', text: 'Отлично! Давайте созвон через 15 минут в #general, обсудим приоритеты' },
  ];

  for (const msg of generalMsgs) {
    await sendMessage(tokens[msg.user], rooms.general, msg.text);
    console.log(`  [${msg.user}] ${msg.text.slice(0, 50)}...`);
    await sleep(500);
  }

  // Code snippet from Bob
  const snippetBody = '📄 src/matrix/auth.ts:15-28\n```typescript\nasync login(homeserver: string, userId: string, password: string): Promise<Credentials> {\n    const client = sdk.createClient({ baseUrl: homeserver });\n    const response = await client.login("m.login.password", {\n        user: userId,\n        password: password,\n        initial_device_display_name: "Uplink VS Code"\n    });\n    return { accessToken: response.access_token, deviceId: response.device_id };\n}\n```';

  await sendMessage(tokens.bob, rooms.general, snippetBody, {
    format: 'org.matrix.custom.html',
    formatted_body: '<div data-uplink-snippet="true"><p><strong>📄 src/matrix/auth.ts:15-28</strong></p><pre><code class="language-typescript">async login(homeserver: string, userId: string, password: string): Promise&lt;Credentials&gt; {\n    const client = sdk.createClient({ baseUrl: homeserver });\n    const response = await client.login("m.login.password", {\n        user: userId,\n        password: password,\n        initial_device_display_name: "Uplink VS Code"\n    });\n    return { accessToken: response.access_token, deviceId: response.device_id };\n}</code></pre></div>',
    'dev.uplink.code_context': {
      language: 'typescript',
      fileName: 'src/matrix/auth.ts',
      lineStart: 15,
      lineEnd: 28,
      gitBranch: 'main'
    }
  });
  console.log('  [bob] code snippet sent');

  // 8. Messages in #backend
  console.log('\n=== ШАГ 7: Сообщения в #backend ===');
  const backendMsgs = [
    { user: 'bob', text: 'Ребят, мигрировал БД на PostgreSQL 15, тесты прошли' },
    { user: 'charlie', text: 'Отлично, запускаю регресс. Результаты скину через час' },
    { user: 'eve', text: 'Bob, не забудь обновить README с новыми env-переменными' },
  ];

  for (const msg of backendMsgs) {
    await sendMessage(tokens[msg.user], rooms.backend, msg.text);
    console.log(`  [${msg.user}] ${msg.text.slice(0, 50)}...`);
    await sleep(500);
  }

  // 9. Messages in #frontend
  console.log('\n=== ШАГ 8: Сообщения в #frontend ===');
  const frontendMsgs = [
    { user: 'alice', text: 'Закончила стили для dark theme, всё на CSS-переменных VS Code' },
    { user: 'diana', text: 'Классно! Можешь показать скриншот? Хочу убедиться что в light theme тоже ок' },
    { user: 'eve', text: 'Alice, добавь пожалуйста responsive для мобильной версии, ширина < 500px' },
  ];

  for (const msg of frontendMsgs) {
    await sendMessage(tokens[msg.user], rooms.frontend, msg.text);
    console.log(`  [${msg.user}] ${msg.text.slice(0, 50)}...`);
    await sleep(500);
  }

  // 10. DM (личные сообщения)
  console.log('\n=== ШАГ 9: Личные сообщения ===');

  // Удалить старые DM-комнаты (не публичные каналы)
  const knownRoomIds = new Set(Object.values(rooms));
  const allRooms = await api('/_synapse/admin/v1/rooms?limit=100', { token: adminToken });
  for (const r of (allRooms.rooms || [])) {
    if (!knownRoomIds.has(r.room_id) && !r.canonical_alias) {
      // Это не публичный канал — удаляем (старые DM)
      await api(`/_synapse/admin/v1/rooms/${r.room_id}`, {
        method: 'DELETE', token: adminToken,
        body: { purge: true }
      });
      console.log(`  Удалена старая комната ${r.room_id} (${r.name || 'без имени'})`);
      await sleep(200);
    }
  }

  // Очистить m.direct данные у всех пользователей
  for (const u of users) {
    const uid = `@${u.username}:uplink.local`;
    await api(`/_matrix/client/v3/user/${uid}/account_data/m.direct`, {
      method: 'PUT', token: tokens[u.username],
      body: {}
    });
  }
  console.log('  Очищены старые m.direct данные');

  const dmPairs = [
    { from: 'alice', to: 'bob', messages: [
      { user: 'alice', text: 'Привет! Можешь глянуть мой PR по Sidebar?' },
      { user: 'bob', text: 'Да, сейчас посмотрю. Скинь ссылку' },
      { user: 'alice', text: 'https://github.com/uplink/pr/42 — там небольшой рефакторинг TreeView' },
    ]},
    { from: 'alice', to: 'eve', messages: [
      { user: 'eve', text: 'Alice, как дела с responsive версией?' },
      { user: 'alice', text: 'Почти готово, осталось поправить sidebar на мобилке' },
    ]},
    { from: 'bob', to: 'charlie', messages: [
      { user: 'bob', text: 'Charlie, результаты регресса есть?' },
      { user: 'charlie', text: '12/12 тестов прошли, всё ок' },
      { user: 'bob', text: 'Супер, тогда мержим' },
    ]},
  ];

  for (const dm of dmPairs) {
    const fromId = `@${dm.from}:uplink.local`;
    const toId = `@${dm.to}:uplink.local`;

    // Создать DM комнату без шифрования (для PoC в браузере без crypto)
    const createResp = await api('/_matrix/client/v3/createRoom', {
      method: 'POST', token: tokens[dm.from],
      body: {
        is_direct: true,
        invite: [toId],
        preset: 'private_chat',
        initial_state: [],
      }
    });
    const dmRoomId = createResp.room_id;
    console.log(`  DM ${dm.from} ↔ ${dm.to} → ${dmRoomId}`);

    // Принять invite
    await joinRoom(tokens[dm.to], dmRoomId);

    // Установить m.direct account data для обоих
    for (const [user, peer] of [[dm.from, toId], [dm.to, fromId]]) {
      const existing = await api('/_matrix/client/v3/user/' + `@${user}:uplink.local` + '/account_data/m.direct', {
        token: tokens[user]
      });
      const directMap = (existing && !existing.errcode) ? existing : {};
      if (!directMap[peer]) directMap[peer] = [];
      if (!directMap[peer].includes(dmRoomId)) directMap[peer].push(dmRoomId);
      await api('/_matrix/client/v3/user/' + `@${user}:uplink.local` + '/account_data/m.direct', {
        method: 'PUT', token: tokens[user],
        body: directMap
      });
    }

    // Отправить сообщения
    for (const msg of dm.messages) {
      await sendMessage(tokens[msg.user], dmRoomId, msg.text);
      console.log(`    [${msg.user}] ${msg.text.slice(0, 50)}`);
      await sleep(300);
    }
  }

  console.log('\n=== ГОТОВО ===');
  console.log('Пользователи: alice, bob, charlie, diana, eve (пароль: test123)');
  console.log(`Комнаты: #general (${rooms.general}), #backend (${rooms.backend}), #frontend (${rooms.frontend})`);
  console.log('DM: alice↔bob, alice↔eve, bob↔charlie');
}

main().catch(err => {
  console.error('ОШИБКА:', err.message);
  process.exit(1);
});
