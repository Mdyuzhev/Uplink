# 018: Полный редизайн UI — Slack/Discord стиль

## Статус: ГОТОВО К ВЫПОЛНЕНИЮ

---

## Цель

Полный визуальный редизайн Uplink в стиле Slack/Discord: профессиональный тёмный мессенджер для команды. Текущий UI функционален, но выглядит сыро — нет визуальной иерархии, полировки, приятных деталей.

## Референсы

- **Discord** — общая структура (тёмный sidebar, сообщения без пузырей, компактные аватары)
- **Slack** — чистый sidebar с секциями, элегантный message input, кнопки
- Общее: никаких ярких цветов без причины, сдержанная палитра, акцент только на интерактивных элементах

## Принципы

1. **Тёмная тема** — основная (светлую можно оставить, но приоритет — тёмная)
2. **Минимализм** — меньше бордеров, больше пространства и теней
3. **Иерархия** — sidebar самый тёмный, основная область чуть светлее, хедер ещё светлее
4. **Анимации** — subtle transitions на hover, focus, появление элементов
5. **Типографика** — чёткая иерархия размеров, правильные line-height
6. **Иконки** — заменить emoji-иконки на символы или SVG (📎→иконка, 🔒→иконка)

## Зависимости

- Все компоненты уже существуют, менять нужно CSS + минимально JSX
- Файлы стилей: `variables.css`, `global.css`, `login.css`, `chat.css`
- Компоненты: 14 файлов в `E:\Uplink\web\src\components\`

---

## ЧАСТЬ 1: Новая цветовая палитра

### ШАГ 1.1. Переписать variables.css

Файл: `E:\Uplink\web\src\styles\variables.css`

Текущие переменные уже неплохие, но нужна доработка. Заменить **весь файл**. Ключевые изменения:

**Цвета фонов** — три уровня глубины (как в Discord):
- `--uplink-bg-primary`: #313338 — основная область (чат)
- `--uplink-bg-secondary`: #2b2d31 — хедер, панели
- `--uplink-bg-tertiary`: #1e1f22 — sidebar (самый тёмный)
- `--uplink-bg-floating`: #111214 — модалки, всплывашки, overlay

**Текст** — четыре уровня:
- `--uplink-text-primary`: #f2f3f5 — основной текст
- `--uplink-text-secondary`: #b5bac1 — вторичный
- `--uplink-text-muted`: #949ba4 — подсказки, время
- `--uplink-text-faint`: #6d6f78 — ещё более приглушённый

**Акценты:**
- `--uplink-accent`: #5865f2 — основной акцент (Discord blurple)
- `--uplink-accent-hover`: #4752c4
- `--uplink-success`: #23a559 — зелёный (онлайн, успех)
- `--uplink-danger`: #da373c — красный (ошибки, завершить)
- `--uplink-warning`: #f0b232 — жёлтый (предупреждения)

**Интерактив:**
- `--uplink-interactive-normal`: #b5bac1
- `--uplink-interactive-hover`: #dbdee1
- `--uplink-interactive-active`: #fff

**Прочее:**
- `--uplink-input-bg`: #1e1f22
- `--uplink-border`: rgba(255,255,255,0.06) — полупрозрачные бордеры вместо жёстких
- `--uplink-shadow`: 0 1px 4px rgba(0,0,0,0.3)
- `--uplink-radius-sm`: 4px
- `--uplink-radius-md`: 8px
- `--uplink-radius-lg`: 12px
- `--uplink-sidebar-width`: 260px (не менять)

**Шрифт:** оставить текущий `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

Светлую тему `@media (prefers-color-scheme: light)` — **удалить**. В PoC оставляем только тёмную. Светлая — задача на будущее.

---

## ЧАСТЬ 2: Обновить global.css

### ШАГ 2.1. Общие стили

- `body`: использовать `--uplink-bg-primary`, размер шрифта 15px (ок)
- Scrollbar: тоньше (6px), thumb с border-radius, прозрачный на idle → видимый на hover
- Selection: `::selection { background: rgba(88, 101, 242, 0.3); }`
- Focus ring: `outline: 2px solid var(--uplink-accent); outline-offset: 2px;` для кнопок и инпутов
- `a` — цвет `--uplink-accent`, без underline, с hover underline
- Transitions: добавить `* { transition-property: background-color, border-color, color, opacity; transition-duration: 0.15s; }` — НО осторожно, это может замедлить анимации. Лучше добавлять точечно.
- Loading spinner: оставить, но обновить цвета под новую палитру

---

## ЧАСТЬ 3: Редизайн Login

### ШАГ 3.1. Стиль логина

Файл: `E:\Uplink\web\src\styles\login.css`

Текущий экран логина нормальный. Обновить:

- Фон `.login-screen`: добавить subtle gradient или noise-текстуру (`background: radial-gradient(ellipse at center, #2b2d31 0%, #1e1f22 100%);`)
- `.login-card`: `background: var(--uplink-bg-secondary)`, `box-shadow: var(--uplink-shadow)`, `border: none` (убрать бордер), `border-radius: var(--uplink-radius-lg)`
- Логотип "Uplink": сделать крупнее (32px), добавить иконку или символ перед названием (например ⚡ или простой SVG)
- Инпуты: `background: var(--uplink-input-bg)`, `border: none`, `border-radius: var(--uplink-radius-md)`, padding 12px. Focus — подсветка `box-shadow: 0 0 0 2px var(--uplink-accent)`
- Кнопка "Войти": `border-radius: var(--uplink-radius-md)`, font-weight 500, height 44px
- Лейблы: `font-size: 11px`, `text-transform: uppercase`, `letter-spacing: 0.8px`, `color: var(--uplink-text-secondary)`, `font-weight: 700`

---

## ЧАСТЬ 4: Редизайн Sidebar

### ШАГ 4.1. Структура сайдбара

Файл: `E:\Uplink\web\src\styles\chat.css` (секция sidebar)

**Хедер сайдбара** (`.chat-sidebar__header`):
- Убрать нижний бордер → заменить на `box-shadow: 0 1px 0 rgba(0,0,0,0.3)`
- Padding: 12px 16px
- Высота: 52px (не менять)
- Заголовок "Uplink": `font-size: 16px`, `font-weight: 700`, `letter-spacing: -0.2px`
- Кнопка профиля: более стилизованная — маленький аватар (20px) + имя, hover с подсветкой

**Поиск:**
- Input: `background: var(--uplink-bg-primary)`, `border-radius: var(--uplink-radius-md)`, padding 8px 12px
- Placeholder: "Поиск..." в `--uplink-text-faint`
- Лупа (иконка) слева внутри инпута (опционально — если не усложняет JSX)

**Секции** (Каналы / Сообщения / Пользователи):
- Заголовки секций: `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.5px`, `color: var(--uplink-text-faint)`, `padding: 16px 8px 4px`
- Стрелка сворачивания ► / ▼ перед названием — маленькая, 10px

**Элементы списка** (`.sidebar-room-item`):
- `border-radius: var(--uplink-radius-sm)`
- `padding: 7px 8px`
- `margin: 1px 8px` — отступ от краёв сайдбара
- Hover: `background: rgba(255,255,255,0.04)` — очень subtle
- Active: `background: rgba(255,255,255,0.08)`, `color: var(--uplink-text-primary)`
- Иконка `#` для каналов: `color: var(--uplink-text-faint)`, `font-size: 18px`, `font-weight: 400`
- Имя: `font-size: 15px`, `font-weight: 500` (active: `font-weight: 600`)
- Badge непрочитанных: pill с `background: var(--uplink-danger)`, `border-radius: 8px`, `font-size: 12px`, `min-width: 18px`

**DM-элементы:**
- Аватар 24px (вместо 20px) с presence-точкой
- Имя: `font-size: 15px`
- Presence dot: 8px с `border: 2px solid var(--uplink-bg-tertiary)` (обводка цветом фона sidebar)

### ШАГ 4.2. Обновить Sidebar.tsx (минимально)

Если emoji-иконки (📢, 💬) используются для каналов/DM — заменить на текстовые символы:
- Каналы: `#` (хэш, как в Slack/Discord)
- DM: аватар пользователя (уже есть)
- Пользователи: аватар (уже есть)

---

## ЧАСТЬ 5: Редизайн области чата

### ШАГ 5.1. Room Header

**Хедер комнаты** (`.room-header`):
- `background: var(--uplink-bg-secondary)`
- `box-shadow: 0 1px 0 rgba(0,0,0,0.3)` (вместо border-bottom)
- `padding: 12px 16px`
- Иконка `#` + название канала: `font-weight: 600`, `font-size: 16px`
- Topic: `font-size: 13px`, `color: var(--uplink-text-muted)`, `margin-left: 12px`, отделён вертикальной чертой
- Кнопка звонка: `background: transparent`, hover → `background: rgba(255,255,255,0.08)`, иконка телефона (можно 📞 или SVG)
- Кнопка видео (если есть): рядом со звонком

### ШАГ 5.2. Список сообщений

**Лента сообщений** (`.message-list`):
- `background: var(--uplink-bg-primary)`
- Padding bottom больше (24px) — чтобы последнее сообщение не прилипало к инпуту

**Дивайдер дня** (`.message-day-divider`):
- Линия: `background: rgba(255,255,255,0.06)`
- Текст: `font-size: 12px`, `font-weight: 700`, `color: var(--uplink-text-muted)`, `background: var(--uplink-bg-primary)`, `padding: 0 8px`

### ШАГ 5.3. Сообщения

**Message bubble** (`.message-bubble`):
- `padding: 2px 48px 2px 72px` — отступ под аватар (Discord-стиль: аватар в абсолюте)
- `position: relative`
- Hover: `background: rgba(0,0,0,0.06)`
- `.message-bubble--full`: `margin-top: 16px` (большой отступ между разными авторами)
- Compact (от того же автора): `margin-top: 0` (прилипает к предыдущему)

**Аватар:**
- `position: absolute`, `left: 16px`, `top: 2px`
- 40px размер (чуть больше текущих 36px)
- `border-radius: 50%`
- Hover на аватар: `cursor: pointer`, slight scale

**Имя отправителя:**
- `font-size: 15px`, `font-weight: 600`
- Цвет: можно сделать разные цвета для разных пользователей (простая hash-функция от userId → один из 7-8 цветов). Примерные цвета:
  - `#f47067`, `#c678dd`, `#e5c07b`, `#61afef`, `#56b6c2`, `#98c379`, `#e06c75`, `#d19a66`
- Если это усложняет — просто `color: var(--uplink-text-primary)`, `font-weight: 600`

**Время:**
- `font-size: 11px`, `color: var(--uplink-text-faint)`, `font-weight: 400`
- В compact-режиме (без аватара): время показывается при hover слева от текста

**Текст сообщения:**
- `font-size: 15px`, `line-height: 1.375`, `color: var(--uplink-text-secondary)`
- Ссылки: `color: var(--uplink-accent)`, `text-decoration: none`, hover → underline

**Зашифрованное сообщение** (не расшифровано):
- Серый italic + маленький замок `🔒`

**Изображения:**
- `border-radius: var(--uplink-radius-md)`
- Max-width: 400px, max-height: 300px
- `cursor: pointer`
- Border: `1px solid rgba(255,255,255,0.06)`

**Файлы:**
- Card: `background: var(--uplink-bg-secondary)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: var(--uplink-radius-md)`
- Иконка файла слева, имя + размер, кнопка скачивания справа
- Hover: чуть светлее фон

### ШАГ 5.4. Message Input

**Поле ввода** (`.message-input`):
- `padding: 0 16px 24px`
- Wrapper: `background: var(--uplink-input-bg)`, `border: none`, `border-radius: var(--uplink-radius-md)`, `padding: 8px 16px`
- Focus-within: `box-shadow: none` (без подсветки — Discord-стиль)
- Textarea: `font-size: 16px` (чуть крупнее), `min-height: 44px`, `padding: 10px 0`
- Placeholder: "Написать в #general..." или "Написать Nastya..." (зависит от типа комнаты)
- Кнопка отправки: `background: var(--uplink-accent)`, `border-radius: var(--uplink-radius-sm)`, `width: 36px`, `height: 36px`
- Кнопка аттача 📎: `color: var(--uplink-interactive-normal)`, hover → `color: var(--uplink-interactive-hover)`
- Drag-and-drop overlay: `background: rgba(88, 101, 242, 0.08)`, `border: 2px dashed var(--uplink-accent)`, `border-radius: var(--uplink-radius-md)`

---

## ЧАСТЬ 6: Редизайн звонков

### ШАГ 6.1. Call Bar

**Панель звонка** (`.call-bar`):
- `background: #1a1e1b` — очень тёмный зеленоватый
- `border-bottom: none`
- `padding: 12px 16px`
- `border-radius: 0` (на всю ширину)
- Название: `color: var(--uplink-success)`, `font-weight: 600`
- Таймер: `font-variant-numeric: tabular-nums`, `color: var(--uplink-text-muted)`
- Участники: pill'ы с `border-radius: 12px`, subtle background, speaking → зелёная обводка с мягким glow
- Кнопки управления: скруглённые (`border-radius: var(--uplink-radius-md)`), высота 36px
  - Mute: `background: rgba(255,255,255,0.1)`, active → `background: rgba(218, 55, 60, 0.3)`
  - Камера: `background: rgba(255,255,255,0.1)`, active → `background: rgba(88, 101, 242, 0.3)`
  - Завершить: `background: var(--uplink-danger)`, `border-radius: 20px` (pill)

### ШАГ 6.2. Video Grid

**Сетка видео** (`.video-grid`):
- `background: #111214`
- `padding: 12px`
- `gap: 8px`
- `max-height: 50vh` (ограничить чтобы чат был виден)

**Тайл видео** (`.video-tile`):
- `border-radius: var(--uplink-radius-md)`
- `background: #1e1f22`
- `aspect-ratio: 16 / 9`
- `overflow: hidden`
- Имя: `backdrop-filter: blur(8px)`, `background: rgba(0,0,0,0.5)`, `border-radius: var(--uplink-radius-sm)`, `padding: 2px 8px`
- Если один участник — тайл занимает всю ширину (до max-width: 640px)
- Если два — по 50%
- Если 3-4 — CSS grid 2×2

### ШАГ 6.3. Incoming/Outgoing Call Overlay

- Overlay: `background: rgba(0,0,0,0.85)`, `backdrop-filter: blur(8px)`
- Card: `background: var(--uplink-bg-secondary)`, `border-radius: var(--uplink-radius-lg)`, `padding: 40px 48px`
- Иконка: аватар звонящего (большой, 64px) вместо emoji
- Кнопки: круглые (`width: 56px`, `height: 56px`, `border-radius: 50%`)
  - Accept: зелёный, иконка трубки
  - Reject: красный, иконка трубки перечёркнутой
- Animation: пульсация кольца вокруг аватара

---

## ЧАСТЬ 7: Редизайн Profile Modal

- Overlay: `backdrop-filter: blur(4px)`, `background: rgba(0,0,0,0.7)`
- Card: `background: var(--uplink-bg-secondary)`, `border-radius: var(--uplink-radius-lg)`, `border: none`, `box-shadow: 0 4px 32px rgba(0,0,0,0.5)`
- Аватар: 80px, с hover overlay "Изменить", `transition: transform 0.15s`
- Инпуты: `background: var(--uplink-input-bg)`, `border: none`, `border-radius: var(--uplink-radius-md)`
- Кнопки: высота 40px, `border-radius: var(--uplink-radius-md)`
- Разделители: `background: rgba(255,255,255,0.06)`

---

## ЧАСТЬ 8: Мобильная адаптация

### ШАГ 8.1. Responsive

- `@media (max-width: 768px)`: sidebar → полноэкранный выезд с overlay
- Sidebar overlay: `background: rgba(0,0,0,0.5)` за сайдбаром
- Кнопка "назад" в хедере: стрелка ←, `font-size: 20px`
- Message input: `padding-bottom: env(safe-area-inset-bottom)` для iPhone с нотчем
- Touch targets: минимум 44px для кнопок и элементов списка

---

## ЧАСТЬ 9: Коммит и деплой

### ШАГ 9.1. Проверить локально

```bash
cd E:\Uplink\web
npm run dev
```

Открыть http://localhost:5173, проверить:
- Login screen
- Sidebar с каналами и DM
- Чат с сообщениями (текст, картинки, файлы)
- Звонок (call bar, видео)
- Profile modal
- Мобильный вид (DevTools → responsive mode)

### ШАГ 9.2. Коммит

```powershell
cd E:\Uplink
git add -A
git commit -m "[ui] Полный редизайн: Slack/Discord стиль

- Новая цветовая палитра (3 уровня фона, 4 уровня текста)
- Sidebar: чище, тоньше, Discord-стиль элементов
- Сообщения: Discord layout (аватар слева, absolute)
- Message input: чистый, rounded, без лишних бордеров
- Call bar: тёмно-зелёный, скруглённые кнопки
- Video grid: 16:9 тайлы, blur-имена
- Login: gradient bg, без бордеров
- Profile modal: polished, blur overlay
- Мобильная адаптация: safe-area, touch targets"
git push
```

### ШАГ 9.3. Деплой

```bash
ssh flomaster@flomasterserver
cd ~/projects/uplink
./deploy.sh
```

---

## Критерии приёмки

- [ ] Новая палитра в variables.css (3 фона, 4 текста, акценты)
- [ ] Login: gradient фон, карточка без бордера, polished
- [ ] Sidebar: тёмный, чистые элементы, # для каналов, аватары для DM
- [ ] Room header: shadow вместо бордера, чистый layout
- [ ] Сообщения: аватар absolute слева, правильные отступы, hover
- [ ] Message input: чистый, rounded, без бордера
- [ ] Call bar: тёмно-зелёный, скруглённые кнопки
- [ ] Video grid: 16:9 тайлы, backdrop-blur имена
- [ ] Profile modal: blur overlay, polished
- [ ] Мобильный: sidebar overlay, safe-area, touch targets 44px
- [ ] `npm run build` без ошибок
- [ ] Задеплоено на сервер

## Коммит

```
[ui] Полный редизайн: Slack/Discord стиль

Новая цветовая палитра, полированные компоненты,
mobile-first responsive, CSS transitions
```
