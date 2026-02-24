# 013: Звонки в личных чатах (DM)

## Цель

Исправить аудиозвонки в личных сообщениях (DM). Сейчас звонки работают только в каналах (#general и т.д.), в DM — не работают: два участника попадают в разные LiveKit-комнаты и не слышат друг друга.

## Контекст проблемы

Звонок привязывается к LiveKit-комнате по имени. Код использовал `room.name` — человекочитаемое имя Matrix-комнаты. Для каналов это работает: оба пользователя видят `general`.

Но в DM у каждого участника **своё** имя комнаты:
- Alice видит комнату как **«Bob Петров»**
- Bob видит ту же комнату как **«Alice Иванова»**

Они вызывают `joinCall("Bob Петров")` и `joinCall("Alice Иванова")` — попадают в **разные** LiveKit-комнаты.

### Решение

Использовать `room.id` (Matrix room ID, вида `!abc123:uplink.local`) вместо `room.name`. Room ID одинаковый у всех участников комнаты.

## Зависимости

- Задача 005 (LiveKit звонки) — **выполнена** ✅
- Задача 012 (Список пользователей, DM) — **выполнена** ✅

## Что уже исправлено (НЕ ТРОГАТЬ, только проверить)

Правки уже внесены в код на Windows. Агенту нужно: проверить что правки на месте, закоммитить, задеплоить на сервер, протестировать.

### Файл 1: `web/src/components/ChatLayout.tsx`

**Изменение 1** — `handleJoinCall` передаёт `room.id` вместо `room.name`:

```tsx
const handleJoinCall = () => {
    if (activeRoom) {
        // Используем room.id (Matrix room ID), а не room.name:
        // В DM у Alice комната называется "Bob", у Bob — "Alice".
        // room.id одинаковый у обоих → попадают в одну LiveKit-комнату.
        joinCall(activeRoom.id);
    }
};
```

**Изменение 2** — условие отображения CallBar сравнивает с `room.id`:

```tsx
{callState === 'connected' && activeRoomName === activeRoom.id && (
    <CallBar
        roomName={activeRoom.name}  // ← отображаемое имя по-прежнему человекочитаемое
```

### Файл 2: `web/src/components/RoomHeader.tsx`

**Изменение 3** — определение `isThisRoomInCall` сравнивает с `room.id`:

```tsx
const isThisRoomInCall = activeCallRoomName === room.id;
```

---

## Шаги

### ШАГ 1. Проверить правки

Открыть файлы и убедиться что три изменения на месте:

1. `ChatLayout.tsx` — `joinCall(activeRoom.id)` (не `activeRoom.name`)
2. `ChatLayout.tsx` — `activeRoomName === activeRoom.id` (не `activeRoom.name`)
3. `RoomHeader.tsx` — `activeCallRoomName === room.id` (не `room.name`)

Если правок нет — внести вручную по описанию выше.

### ШАГ 2. Закоммитить и запушить

```bash
cd E:\Uplink
git add -A
git commit -m "[livekit][fix] Звонки в DM: room.id вместо room.name для LiveKit-комнаты"
git push
```

### ШАГ 3. Задеплоить на сервер

```bash
ssh flomaster@flomasterserver "cd ~/projects/uplink && ./deploy.sh"
```

### ШАГ 4. Проверить звонки в каналах (регрессия)

1. Открыть http://192.168.1.74:5174
2. Залогиниться как `@alice:uplink.local` / `test123`
3. Открыть #general
4. Нажать кнопку звонка — CallBar появляется, таймер тикает
5. Во второй вкладке: `@bob:uplink.local` / `test123` → #general → звонок
6. Оба видят друг друга в CallBar, аудио работает

### ШАГ 5. Проверить звонки в DM

1. Alice открывает личный чат с Bob (секция «Личные сообщения» или клик по Bob в «Пользователи»)
2. Alice нажимает кнопку звонка — CallBar появляется
3. Bob открывает тот же DM-чат с Alice
4. Bob нажимает кнопку звонка — оба видят двух участников в CallBar
5. Аудио передаётся между Alice и Bob
6. Mute/Unmute работает
7. Завершение звонка — CallBar исчезает у обоих

---

## Критерии приёмки

- [ ] Звонки в DM: два участника попадают в одну LiveKit-комнату
- [ ] Звонки в каналах: по-прежнему работают (регрессии нет)
- [ ] CallBar показывает человекочитаемое имя (не Matrix room ID)
- [ ] Кнопка звонка в RoomHeader корректно подсвечивается (красная = в звонке)
- [ ] Mute/Unmute работает в DM-звонке
- [ ] Задеплоено на сервер

## Коммит

```
[livekit][fix] Звонки в DM: room.id вместо room.name для LiveKit-комнаты

- ChatLayout: joinCall(activeRoom.id) — единый ID для обоих участников DM
- RoomHeader: сравнение activeCallRoomName по room.id
- CallBar: отображает человекочитаемое room.name
```
