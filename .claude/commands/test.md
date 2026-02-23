Запуск тестов.

```bash
npm test 2>/dev/null
```

Если тестовый фреймворк не настроен:
```bash
echo "Тесты не настроены. Проверяю наличие test runner..."
cat package.json | grep -E '"test"|"mocha"|"jest"'
ls test/ 2>/dev/null
```

Если есть падения:
- Покажи какой тест упал и почему
- Предложи исправление
- Спроси нужно ли чинить сейчас

Дополнительно проверь линтер:
```bash
npx eslint src/ --ext .ts,.tsx 2>/dev/null || echo "ESLint не настроен"
```

Формат:
```
Тесты Uplink
═════════════
✅ X passed
❌ X failed
⏭️ X skipped

ESLint: ✅ clean / ❌ X errors, X warnings

Модули без тестов: ...
```
