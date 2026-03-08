# Задача 058 — Исправить мобильную навигацию между разделами

## Диагностика

Три независимых бага, которые вместе полностью ломают навигацию на мобильном.

---

## Баг 1 — Главный: вкладки разделов исчезают при входе в ЛС и Треды

В `Sidebar.tsx` полоска `sidebar-space-tabs` рендерится условно:

```tsx
{!isDMsMode && spaces.length > 1 && (
    <div className="sidebar-space-tabs">
        ...
    </div>
)}
```

Когда пользователь переходит в ЛС (`isDMsMode = true`) — полоска полностью
исчезает. Нет ни кнопок пространств, ни кнопки ЛС, ни кнопки Тредов.
Вернуться к пространствам невозможно. Единственный выход — обновить страницу.

Та же проблема при входе в Треды (`isThreadsMode = true`) — но там вообще
рендерится другой компонент (`ThreadsPanel`), и sidebar-tabs не видны в принципе.

**Исправление:** убрать `!isDMsMode` из условия и отвязаться от `spaces.length > 1`.
Показывать вкладки всегда — это основная навигация мобильного приложения.

---

## Баг 2 — В вкладках нет кнопки «Треды», нет пропа `onSelectThreads`

В `Sidebar.tsx` нет пропа `onSelectThreads` и нет кнопки для перехода в Треды.
В `ChatLayout.tsx` `onSelectThreads` в Sidebar не передаётся.
Следовательно попасть в Треды с мобильного через sidebar невозможно совсем
(только через `SpaceSwitcher`, который на мобильном скрыт).

---

## Баг 3 — `handleSelectSpace` автоматически открывает чат

В `useChatState.ts`:

```typescript
const handleSelectSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId);
    setIsDMsMode(false);
    setIsThreadsMode(false);
    storageSet('uplink_last_space', spaceId);

    const space = spaces.find(s => s.id === spaceId);
    if (space?.rooms[0]) {
        handleSelectRoom(space.rooms[0].id);  // ← устанавливает mobileView='chat'
    }
}, [spaces, handleSelectRoom]);
```

`handleSelectRoom` внутри вызывает `setMobileView('chat')`. Пользователь на
мобильном тапнул на вкладку пространства чтобы увидеть список каналов — его
сразу кидает в чат первого канала. Sidebar даже не успевает показаться.

**Исправление:** убрать автоматический `handleSelectRoom` из `handleSelectSpace`.
Пусть пользователь сам выбирает канал. `activeRoomId` остаётся прежним —
если пользователь уже был в каком-то канале, он там и останется.
На десктопе это тоже нормальное поведение.

---

## Изменение 1 — `web/src/components/Sidebar.tsx`

Прочитать файл перед правкой.

### Новые пропсы

Добавить в `SidebarProps`:

```typescript
isThreadsActive: boolean;
onSelectThreads: () => void;
```

### Исправить условие рендера вкладок

Найти:
```tsx
{!isDMsMode && spaces.length > 1 && (
    <div className="sidebar-space-tabs">
```

Заменить на:
```tsx
{(spaces.length > 0 || isDMsMode || isThreadsActive) && (
    <div className="sidebar-space-tabs">
```

Это условие показывает вкладки если есть хоть одно пространство (или если
пользователь уже в ЛС/Тредах и ему нужен выход).

### Добавить кнопку «Треды» в полоску вкладок

Внутри `sidebar-space-tabs` добавить кнопку Тредов рядом с кнопкой ЛС:

```tsx
<div className="sidebar-space-tabs">
    {/* Кнопки пространств */}
    {spaces.map(space => (
        <button
            key={space.id}
            className={`sidebar-space-tab ${space.id === activeSpaceId && !isDMsMode && !isThreadsActive ? 'sidebar-space-tab--active' : ''}`}
            onClick={() => onSelectSpace(space.id)}
            title={space.name}
        >
            {getAbbr(space.name)}
        </button>
    ))}

    {/* Треды */}
    <button
        className={`sidebar-space-tab ${isThreadsActive ? 'sidebar-space-tab--active' : ''}`}
        onClick={onSelectThreads}
        title="Треды"
    >
        Тр
    </button>

    {/* Личные сообщения */}
    <button
        className={`sidebar-space-tab ${isDMsMode ? 'sidebar-space-tab--active' : ''}`}
        onClick={onSelectDMs}
        title="Личные сообщения"
    >
        ЛС
    </button>
</div>
```

Обратить внимание: условие активности для кнопок пространств теперь учитывает
все три режима — `!isDMsMode && !isThreadsActive`.

---

## Изменение 2 — `web/src/hooks/useChatState.ts`

Прочитать файл перед правкой.

Найти в `handleSelectSpace`:

```typescript
const space = spaces.find(s => s.id === spaceId);
if (space?.rooms[0]) {
    handleSelectRoom(space.rooms[0].id);
}
```

Удалить эти три строки полностью. Итоговый `handleSelectSpace`:

```typescript
const handleSelectSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId);
    setIsDMsMode(false);
    setIsThreadsMode(false);
    storageSet('uplink_last_space', spaceId);
    // Не открываем канал автоматически — пользователь выберет сам.
    // Это особенно важно на мобильном: setMobileView('chat') в handleSelectRoom
    // немедленно скрывал бы sidebar не дав пользователю увидеть список каналов.
}, []);
```

---

## Изменение 3 — `web/src/components/ChatLayout.tsx`

Прочитать файл перед правкой.

Найти блок передачи пропсов в `<Sidebar ...>`. Добавить два новых пропса:

```tsx
<Sidebar
    {/* ... существующие пропсы ... */}
    isThreadsActive={chat.isThreadsMode}
    onSelectThreads={() => {
        chat.setIsThreadsMode(true);
        chat.setIsDMsMode(false);
    }}
    {/* ... остальные ... */}
/>
```

---

## Проверка после применения

На телефоне (или DevTools, эмуляция iPhone):

1. Зайти в приложение — в шапке sidebar видна полоска вкладок с аббревиатурами
   пространств + «Тр» + «ЛС».
2. Тапнуть «ЛС» — переход в режим личных сообщений. Полоска вкладок
   **остаётся видимой** с активной вкладкой «ЛС».
3. Тапнуть на пространство — переход обратно к каналам. Sidebar показывает
   каналы, чат **не открывается автоматически**.
4. Тапнуть «Тр» — переход в треды. Полоска видна.
5. Тапнуть на канал — открывается чат. Кнопка «назад» возвращает в sidebar.
6. В sidebar полоска по-прежнему на месте, переключение работает.

---

## Файлы для изменения

| Файл | Что делать |
|------|-----------|
| `web/src/components/Sidebar.tsx` | Добавить пропсы `isThreadsActive`/`onSelectThreads`, исправить условие рендера tabs, добавить кнопку «Тр» |
| `web/src/hooks/useChatState.ts` | Убрать автоматический `handleSelectRoom` из `handleSelectSpace` |
| `web/src/components/ChatLayout.tsx` | Передать `isThreadsActive` и `onSelectThreads` в Sidebar |
