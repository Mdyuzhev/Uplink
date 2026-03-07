# Задача 046 — Редизайн поля ввода сообщений

## Проблема

1. При фокусе на поле ввода появляется яркая синяя рамка (браузерный outline / box-shadow) — выглядит грубо и не соответствует стилю приложения.
2. Кнопки-иконки справа (стикеры, скрепка, микрофон, видео, отправка) выглядят разрозненно.
3. Общий вид поля не похож на современные мессенджеры (Claude, Telegram) — хочется мягче, аккуратнее.

## Ожидаемый результат

Поле ввода должно выглядеть как на скриншоте Claude: тёмный контейнер с едва заметной рамкой, без какого-либо синего glow при фокусе, с компактными иконками справа. При наборе текста — только курсор показывает что поле активно, рамка меняется максимально тонко.

---

## Файл для правки

`E:\Uplink\web\src\styles\message-input.css`

Прочитать файл перед правкой.

---

## Конкретные изменения

### 1. Убрать синюю рамку при фокусе

Проблема в трёх местах одновременно — нужно закрыть все три:

```css
/* На обёртке — никаких теней */
.message-input__wrapper:focus-within {
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: none;
}

/* На textarea явно */
.message-input__textarea:focus {
    outline: none !important;
    box-shadow: none !important;
}

/* Ядерный вариант — на всех вложенных элементах */
.message-input__wrapper *:focus {
    outline: none !important;
    box-shadow: none !important;
}
```

Также добавить на textarea:
```css
.message-input__textarea {
    -webkit-appearance: none;
    caret-color: var(--uplink-accent); /* синий курсор вместо синей рамки */
}
```

### 2. Контейнер — мягче и темнее

```css
.message-input__wrapper {
    background: var(--uplink-bg-secondary);   /* было bg-tertiary */
    border: 1.5px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;                       /* было 22px — слишком "таблетка" */
    box-shadow: none;
    transition: border-color 0.15s;
}
```

### 3. Кнопки — квадратные скругления вместо круглых

Все `.message-input__action-btn`, `.message-input__mic-btn`, `.message-input__video-note-btn` — заменить `border-radius: 50%` на `border-radius: 8px`. Только `.message-input__send-btn` (кнопка отправки) остаётся круглой — она должна выделяться.

```css
.message-input__action-btn {
    border-radius: 8px;
    width: 34px;
    height: 34px;
}

.message-input__mic-btn,
.message-input__video-note-btn {
    background: none;
    border: none;
    color: var(--uplink-text-faint);
    cursor: pointer;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
}

.message-input__mic-btn:hover,
.message-input__video-note-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    color: var(--uplink-text-secondary);
}
```

### 4. Кнопка отправки — живее

```css
.message-input__send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin-left: 2px;
    transition: background 0.15s, transform 0.1s;
}

.message-input__send-btn:hover {
    background: var(--uplink-accent-hover);
    transform: scale(1.06);
}

.message-input__send-btn:active {
    transform: scale(0.95);
}
```

### 5. Автокомплит команд и упоминаний — всплывающий стиль

Заменить `bottom: 100%` на `bottom: calc(100% + 6px)`, фон на `var(--uplink-bg-floating)` (`#111214`), `border-radius: 12px`, более глубокая тень:

```css
.command-suggestions,
.mention-suggestions {
    bottom: calc(100% + 6px);
    background: var(--uplink-bg-floating);
    border-radius: 12px;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
}
```

---

## Проверка

1. Открыть любой канал, кликнуть в поле ввода — никакой синей рамки, только чуть светлеет граница контейнера.
2. Нажать `/` — автокомплит появляется как тёмная всплывающая карточка с отступом от поля.
3. Навести на иконки — мягкий hover без круглых фонов.
4. Нажать кнопку отправки — лёгкий scale-эффект.
