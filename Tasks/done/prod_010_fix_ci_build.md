# Задача prod_010_fix: Починить CI сборку — vscode extension и desktop

## Контекст

GitHub Actions workflow `build-desktop.yml` падает на шаге `build-vscode` с двумя ошибками:
1. `Error: invalid relative path: extension/../.git/config` — vsce находит `.git` монорепо через `..` и отказывается работать (security policy в vsce 2.x)
2. `Warning: LICENSE.md, LICENSE.txt or LICENSE not found` → `Error: Process completed with exit code 1`
3. Используется `npx vsce` который тянет deprecated `vsce` пакет вместо установленного `@vscode/vsce` из devDependencies

Дополнительно: workflow не собирает macOS Intel (только ARM64) и версии не синхронизированы.

---

## Шаг 1. Фикс шага `build-vscode` в workflow

Файл: `.github/workflows/build-desktop.yml`

Найти шаг `Build & package extension` и заменить его полностью:

```yaml
      - name: Build & package extension
        working-directory: vscode
        run: |
          npm run build
          # Убираем prepublish (web/dist уже скопирован выше)
          node -e "const p=require('./package.json'); delete p.scripts['vscode:prepublish']; delete p.scripts['build:webview']; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 4))"
          # Создаём локальный git чтобы vsce не лез в ../  (монорепо — это его ограничение)
          git init
          git config user.email "ci@uplink.local"
          git config user.name "CI"
          git add -A
          git commit -m "ci packaging"
          # LICENSE файл (обязателен для vsce)
          echo 'MIT License - Copyright (c) 2025 Uplink' > LICENSE
          # Используем @vscode/vsce из devDependencies (не npx vsce который deprecated)
          ./node_modules/.bin/vsce package --skip-license
```

**Почему git init:** vsce ищет `.git` вверх по дереву. В монорепо он находит корневой `.git` и пытается добраться до `extension/../.git/config` — что запрещено в vsce 2.x. Локальный `git init` внутри `vscode/` делает этот каталог корнем своего репо, и vsce останавливается там.

**Почему --skip-license:** LICENSE файл создаётся строчкой выше. Флаг нужен чтобы не падать на проверке до того как commit добавит файл в staging. Альтернатива — убрать флаг, тогда LICENSE должен быть в репо заранее (см. Шаг 2).

---

## Шаг 2. Добавить LICENSE в vscode/

Чтобы не генерировать LICENSE в CI каждый раз — добавить его в репо.

Создать файл `vscode/LICENSE`:
```
MIT License

Copyright (c) 2025 Uplink

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

После добавления убрать `echo 'MIT License...' > LICENSE` из workflow — LICENSE уже в репо.

---

## Шаг 3. Добавить macOS Intel в матрицу сборки

В `.github/workflows/build-desktop.yml` в секции `build-desktop` → `strategy.matrix.include` добавить:

```yaml
          - platform: macos-13
            target: x86_64-apple-darwin
            artifact-name: Uplink-macOS-Intel
```

`macos-13` — последний GitHub Actions runner с Intel архитектурой. `macos-latest` и выше — ARM.

В шаге `Flatten and rename artifacts` добавить:
```bash
# macOS Intel
find artifacts/Uplink-macOS-Intel -name "*.dmg" -exec sh -c \
  'cp "$1" "release-assets/Uplink-macOS-Intel.dmg"' _ {} \;
```

Обновить release body — добавить строку в таблицу:
```
| **macOS** Intel | `Uplink-macOS-Intel.dmg` |
```

---

## Шаг 4. Проверить .vscodeignore

Файл `vscode/.vscodeignore` НЕ должен содержать `webview-dist/` — эта папка должна попасть в .vsix.

Убедиться что текущий `.vscodeignore` содержит примерно:
```
src/**
node_modules/**
.gitignore
tsconfig.json
esbuild.config.mjs
*.md
```

Если `webview-dist` там есть — убрать.

---

## Шаг 5. Коммит и тест

```bash
git add .github/workflows/build-desktop.yml vscode/LICENSE vscode/.vscodeignore
git commit -m "[ci] Фикс build-vscode: git init для vsce, LICENSE, @vscode/vsce из deps"
git push
```

Затем запустить workflow вручную:
GitHub → Actions → Build & Release → Run workflow → выбрать ветку → Run.

### Ожидаемый результат

Все 4 шага зелёные:
- `build-web` — собрал web/dist
- `build-desktop` — 4 платформы (Windows, macOS ARM, macOS Intel, Linux)
- `build-vscode` — создал `uplink-1.0.0.vsix`
- Артефакты доступны в разделе Artifacts

---

## Шаг 6. Проверка .vsix

Скачать артефакт `Uplink-VSCode-Extension` из Actions → Artifacts.

```bash
# Проверить содержимое — webview-dist должен быть внутри
unzip -l uplink-*.vsix | grep webview-dist | head -5
```

Ожидаемый вывод:
```
extension/webview-dist/index.html
extension/webview-dist/assets/index-xxx.js
extension/webview-dist/assets/index-xxx.css
```

Если `webview-dist` пустой или отсутствует — шаг `Copy SPA into extension` в CI не отработал.

---

## Модифицируемые файлы

| Файл | Изменение |
|------|-----------|
| `.github/workflows/build-desktop.yml` | Фикс build-vscode шага + macOS Intel |
| `vscode/LICENSE` | Создать новый файл |
| `vscode/.vscodeignore` | Убедиться что webview-dist НЕ исключён |

---

## Чего НЕ делать

- НЕ менять `vscode/package.json` scripts — `build:webview` и `vscode:prepublish` нужны для локальной сборки, workflow их удаляет сам через `node -e`
- НЕ использовать `npx @vscode/vsce` — ставит свежую версию которая может вести себя иначе; использовать `./node_modules/.bin/vsce` из зафиксированных deps
- НЕ добавлять `--no-git-tag-version` — это для npm publish, не для vsce
- НЕ пытаться запустить vsce без локального git — упадёт с той же ошибкой про relative path
