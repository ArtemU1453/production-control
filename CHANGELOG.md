# CHANGELOG

## Этап 9 — Финальная оптимизация, тестирование и подготовка к релизу

> Заключительный этап. **Новая бизнес-логика не добавлялась**; производственный
> и математический алгоритм расчёта (`core/calculator/calculatorLogic.ts`) не
> изменён — файл **байт-в-байт** идентичен `main` (`git diff` пуст). Работа
> свелась к аудиту, удалению мёртвого кода, повышению надёжности, доступности и
> подготовке к публикации.

### Платформа

Репозиторий назван «iOS», но проект — это веб-PWA (React 19 + TypeScript +
Vite). Требования этапа спроецированы на веб-эквиваленты: SwiftData →
`KeyValueStore`/репозитории; Swift Concurrency/MainActor → `async/await` + модель
рендеринга React; App Store → релиз PWA (манифест, иконки, версия/сборка,
приватность); `Localizable.strings` → архитектура i18n; Accessibility → ARIA и
медиазапросы `prefers-*`.

### 1. Архитектурный аудит

Проверены SOLID, DRY, KISS, MVVM, Repository Pattern и DI. Слои чистые:
Models → Storage(`KeyValueStore`) → Repositories → Services → Composition
(`AppContainer`) → ViewModels(hooks) → Views. Нарушений инвариантов не найдено.

Устранён **мёртвый код**, оставшийся от ранних этапов:

- Удалены неиспользуемые сервисы `services/ReportService.ts`,
  `services/EmailService.ts`, `services/EmailQueue.ts` — их роль давно
  выполняют `reportCenter` (Этап 5) и модуль `documents/` (Этап 6). Ни один
  экран/ViewModel их не потреблял (мёртвая DI-обвязка в контейнере).
- Из `AppContainer` убраны поля `reports`, `email`, `emailQueue`; удалён
  осиротевший ключ хранилища `emailQueue`.
- Удалены неиспользуемые строки (`comingSoon`, группа `reports`); устаревшие
  тексты «на следующем этапе» приведены к релизным формулировкам.

Проверено отсутствие `TODO/FIXME`, `console.*`, `debugger`, `any`,
force-unwrap `!` во всём клиентском коде.

### 2. Надёжность и обработка ошибок

- **React ErrorBoundary** (`app/ErrorBoundary.tsx`) — React не пропускает
  ошибки отрисовки через `window.onerror`, поэтому это единственное место, где
  их можно перехватить. Boundary показывает понятный экран с перезагрузкой и не
  «гасит» приложение.
- **Краш-лог**: `CrashLoggingBoundary` в `AppProviders` направляет пойманные
  ошибки рендера в `admin.errorLog` (описание + стек компонента). Вместе с
  глобальным обработчиком `window.onerror`/`unhandledrejection` (Этап 8) это
  даёт полный контур журналирования сбоев (ErrorLog + AuditLog + CrashLog).

### 3. Доступность (Accessibility)

- **Reduce Motion**: `<MotionConfig reducedMotion="user">` подчиняет все
  анимации framer-motion системной настройке; CSS-медиазапрос
  `prefers-reduced-motion` глушит остальные переходы/анимации.
- **Increase Contrast**: `prefers-contrast: more` усиливает границы и текст,
  убирает декоративный «шум»; `forced-colors` (Windows High Contrast)
  передаёт стеклянные поверхности системной палитре.
- **Dynamic Type**: типографика на `rem`-классах Tailwind масштабируется вслед
  за системным размером шрифта; включён pinch-zoom (снят `maximum-scale=1`).
- **VoiceOver**: у всех иконочных кнопок есть `aria-label`, у таб-бара —
  `role`/`aria-current`.

### 4. Подготовка к релизу (App Store / PWA)

- `manifest.webmanifest` — standalone, `lang: ru`, иконки, тема/фон, категории;
  подключён в `index.html`.
- `index.html` переписан: добавлены `<title>`, `description`, `theme-color`
  (light/dark), apple-mobile-web-app-теги, `apple-touch-icon`; удалён
  вендорный мусор (og/twitter-картинки Replit).
- `appInfo` расширен полями `build` и `bundleId`; версия/сборка/идентификатор
  выводятся на экране «О приложении».
- **Приватность**: приложение не запрашивает разрешений устройства, работает
  офлайн и хранит данные только в `localStorage` — эквивалент «пустого» Privacy
  Manifest.

### 5. Локализация

`resources/i18n.ts` — архитектура i18n поверх единого каталога `strings.ts`
(аналог `Localizable.strings`, русский — основной). `getStrings(locale)`
собирает каталог из русской базы и оверрайдов локали; недостающие ключи
прозрачно берутся из базы, поэтому частичный перевод безопасен. Английская
локаль зарегистрирована (пока рендерит русскую базу) и заполняется по ключам.

### 6. Производительность

Нагрузочный прогон (10 000 Джамбов + 100 000 операций, in-memory store):

| Операция | Время |
| --- | --- |
| Диагностика (счётчики + размер БД по всем ключам) | ~0,22 с |
| Проверка целостности (полный `scan`) | ~0,09 с |
| Резервная копия (снимок всех коллекций) | ~0,08 с |

Тяжёлых вычислений во View нет; графики (recharts) изолированы в ленивом чанке;
аналитика и отчёты кэшируются по ключу «фильтр + сигнатура данных»; складские
записи используют замороженные аккумуляторы (история не пересчитывается).

### 7. Итоговая структура проекта

```
client/src/
├── core/          calculator (алгоритм — НЕ изменяется), di, theme
├── models/        доменные модели (15)
├── storage/       KeyValueStore, LocalStorageStore, StorageKeys
├── repositories/  CollectionRepository<T> + 7 коллекций + Settings
├── services/      Calculation, Warehouse, ReportBuilder, validation
├── reports/       Report Center (ReportContext, builders×7, cache, export)
├── documents/     PDF (печать HTML), email (симуляция), scheduler
├── analytics/     KpiEngine, AnalyticsService, charts (lazy)
├── admin/         logs, audit, users, backup, maintenance, diagnostics
├── app/           providers, navigation, ErrorBoundary
├── components/    дизайн-система (карточки, кнопки, списки, TabBar…)
├── viewmodels/    хуки-ViewModel (26)
├── views/         экраны (31)
└── resources/     strings, i18n, icons, appInfo
```

### 8. Список моделей (15)

Material, MaterialStatus · Jumbo, JumboStatus, JumboOperation · CuttingOrder,
CuttingRoll, CuttingSession · Machine · Waste · ArchivedJumbo · Report ·
Settings · DocumentSchedule. Модели администрирования: User/UserRole,
ErrorLogEntry, AuditEntry/AuditAction, BackupData/Meta, DiagnosticsInfo,
IntegrityReport.

### 9. Список экранов (31)

Dashboard · Calculator (+CuttingScheme) · Production · History · Materials,
MaterialEditor · Warehouse, Receipt, JumboDetail · Archive, ArchiveDetail ·
Reports (Analytics list), ReportPreview · AnalyticsCenter (+Charts) ·
Documents, DocumentCompose, DocumentPreview (+DocumentFrame) · Settings (хаб) +
General/Production/Email/Security/Backup/Maintenance/Diagnostics/Logs/About
(+SettingsScaffold).

### 10. Список сервисов

Ядро: CalculationService (обёртка неизменного движка), WarehouseService
(транзакционная запись, close/archive), ReportBuilder, validation. Модульные:
ReportCenterService, DocumentService, AnalyticsService (+KpiEngine).
Администрирование: ErrorLog, AuditLog, User, Backup, Maintenance, Diagnostics.

### 11. Список репозиториев

Базовый `CollectionRepository<T>` над `KeyValueStore`; коллекции: Material,
Jumbo, JumboOperation, CuttingSession, Waste, ArchivedJumbo; плюс
SettingsRepository и админ-репозитории Error/Audit/User.

### 12. Диаграмма архитектуры

```
        ┌───────────────── Views (31) ──────────────────┐
        │  экраны + дизайн-система (components)          │
        └───────────────┬───────────────────────────────┘
                        │ hooks (ViewModels, 26)
        ┌───────────────▼───────────────────────────────┐
        │ Services / Centers                             │
        │ Calculation · Warehouse · ReportCenter ·       │
        │ Documents · Analytics · Admin                  │
        └───────────────┬───────────────────────────────┘
                        │ Repositories (CollectionRepository<T>)
        ┌───────────────▼───────────────────────────────┐
        │ KeyValueStore = StorageProvider                │
        │ local (localStorage) │ cloud (заготовка)        │
        └────────────────────────────────────────────────┘
   Composition root: createAppContainer(store) → useServices()
   Providers: QueryClient → Services → ErrorBoundary → Theme →
              MotionConfig → Tooltip → (screens) → Toaster
```

### 13. Диаграмма потоков данных (производственный цикл)

```
Приём сырья  → warehouse.receiveBatch → Jumbo(onStock) + операция «Приход»
Начало работы→ warehouse.startUsage   → Jumbo(inWork)  + «Начало использования»
Расчёт+заказ → calculation.calculate (движок) → warehouse.completeCalculation
              (транзакция: списание остатка, CuttingSession, аккумуляторы, аудит)
Остаток<300  → becameWriteOff → Jumbo(toWriteOff)
Закрытие     → warehouse.closeJumbo → ArchivedJumbo(снимок+статистика)+Waste
Отчёты       → ReportContext (агрегация 1×) → builders → ReportData → PDF/Email
Аналитика    → KpiEngine(ReportContext) → кэш → Dashboard/AnalyticsCenter
Копия        → backup.createBackup (снимок всех ключей) ⇄ restore
```

### Результаты архитектурного аудита

SOLID/DRY/KISS/MVVM/Repository/DI — соблюдены. Дублирование агрегаций устранено
ещё на Этапе 7 (единый `KpiEngine`); на Этапе 9 удалена мёртвая обвязка
сервисов. Расширяемость обеспечена реестрами (builders, export/email providers,
storage/export providers, роли пользователей) — новое подключается без правки
существующего кода.

### Результаты тестирования

Прогон harness (in-memory store) — **28/28**:

- Пустая база: диагностика, целостность, генерация отчёта, backup/restore.
- Полный цикл: приём → склад → начало работы → несколько расчётов → переход
  <300 м (write-off) → закрытие → архив → отчёт (Джамб + производство) →
  диагностика → целостность → восстановление.
- Edge-cases: очень длинные названия, невалидные e-mail (разделение), фильтры
  на границе года и пустой будущий период.
- Масштаб: 10 000 Джамбов + 100 000 операций — корректные счётчики и время
  диагностики/скана/копии в пределах порогов.

Совокупно за все этапы автотестами покрыты расчёт, склад, полный жизненный цикл
Джамба, отчёты (7 видов), PDF/e-mail, аналитика/KPI и администрирование.

### Перечень исправленных проблем (Этап 9)

- Мёртвые сервисы и DI-поля (ReportService/EmailService/EmailQueue) — удалены.
- Осиротевший ключ хранилища `emailQueue` — удалён.
- Устаревшие строки и копия «на следующем этапе» — вычищены/переписаны.
- Ошибки отрисовки React нигде не логировались — добавлены ErrorBoundary +
  краш-лог.
- Анимации игнорировали Reduce Motion; не было high-contrast/forced-colors —
  добавлены.
- `maximum-scale=1` блокировал pinch-zoom (анти-паттерн доступности) — снят.
- Отсутствовали PWA-манифест, `<title>`, корректные meta; висел вендорный
  og/twitter-мусор — исправлено.

### Рекомендации по дальнейшему развитию

- Реализовать заготовки: облачная синхронизация/многопользовательский режим,
  экспорт CSV/Excel, импорт сырья/справочников, биометрия, автобэкап по
  расписанию, миграции по `DB_VERSION`.
- Наполнить английскую локаль и добавить переключатель языка в настройках.
- Самостоятельные иконки 192/512 (maskable) и офлайн Service Worker для полного
  PWA-офлайна; самостоятельный хостинг шрифтов.
- Перенести хранилище на IndexedDB при росте объёмов (протокол уже готов).

### Итоговая оценка готовности

Приложение функционально завершено и **готово к ежедневной эксплуатации на
производстве**: полный цикл работает и покрыт тестами, данные целостны и
резервируются, сбои журналируются, интерфейс доступен в Light/Dark/высоком
контрасте и масштабируется по размеру шрифта. Проект собирается в production
без предупреждений (все чанки < 500 КБ), `tsc` — 0 ошибок, движок расчёта не
изменён. Для публикации именно в App Store как нативного приложения потребуется
обёртка (Capacitor/PWA-упаковка) и материалы стора; как PWA приложение готово к
установке. Прочие пункты (облако, CSV/Excel, английский перевод) оформлены как
расширяемые заготовки и не блокируют эксплуатацию.

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений; все чанки < 500 КБ.
- Harness (in-memory) — **28/28** (пустая база, полный цикл, edge-cases, масштаб).
- Движок расчёта идентичен `main` (диф пуст).

---

## Этап 8 — Администрирование, безопасность, резервное копирование и подготовка к масштабированию

> Изменения **аддитивны**: существующие модели, сервисы и алгоритм расчёта
> (`core/calculator/calculatorLogic.ts`) не тронуты — файл движка **байт-в-байт**
> идентичен `main`. Новый модуль `admin/` подключается одной точкой в
> композиционном корне (`core/di/container.ts`). Слой хранения остаётся единым
> (`KeyValueStore`), поэтому облачные бэкенды и многопользовательский режим
> добавляются без изменения бизнес-логики.

### Главное

Добавлен единый центр администрирования (`admin/`): резервное копирование и
восстановление, обслуживание базы, журнал ошибок, аудит действий, диагностика,
подготовка к многопользовательской работе и облачному хранилищу, а также
архитектура экспорта/импорта. Экран «Настройки» переработан в **хаб** с
группами и фокусными под-экранами.

### Структура модуля

```
admin/
├── models/
│   ├── User.ts           UserRole (operator/master/admin), User
│   ├── ErrorLog.ts       ErrorLogEntry
│   ├── AuditLog.ts       AuditAction, AuditEntry
│   ├── Backup.ts         BACKUP_VERSION, BackupData, BackupMeta
│   ├── Diagnostics.ts    RecordCounts, DiagnosticsInfo
│   ├── Maintenance.ts    IntegrityIssue/Report, MaintenanceResult
│   └── index.ts
├── storage/StorageProvider.ts   протокол хранилища (= KeyValueStore) + local/cloud
├── repositories/AdminRepositories.ts  error/audit/user поверх CollectionRepository
├── services/
│   ├── ErrorLogService.ts     log / list / clear
│   ├── AuditLogService.ts     record / list / clear
│   ├── UserService.ts         ensureDefault / list / current / add
│   ├── BackupService.ts       createBackup / restore / exportJson / importJson / meta
│   ├── MaintenanceService.ts  checkIntegrity / checkRelations / optimize / rebuild / clearCache
│   └── DiagnosticsService.ts  DB_VERSION, info()
├── export/DataExport.ts   JSON (рабочий) + CSV/Excel (заготовки), импорт (заготовки)
├── adminCenter.ts         createAdminCenter(store) → AdminCenter
├── viewmodels/            backup, maintenance, diagnostics, logs, users, bootstrap
├── views/                 SettingsScaffold + 9 под-экранов
└── index.ts
```

### Хранилище как протокол (`StorageProvider`)

Всё приложение уже персистит через `KeyValueStore` — значит, **это и есть**
протокол провайдера хранения. Локальный провайдер активен; облачный
(iCloud/CloudKit/Firebase/собственный сервер) — заготовка, реализующая тот же
интерфейс. Переключение бэкенда не затрагивает бизнес-логику.

### Резервное копирование и восстановление

`BackupService` снимает единый JSON-снимок всех коллекций
(`backupStorageKeys`): Джамбы, материалы, сессии, операции, потери, архив,
документы, журналы, пользователи, настройки. `restore()` записывает их обратно
(с проверкой версии копии), `exportJson()/importJson()` работают с файлом
(скачивание через Blob, импорт через `FileReader`), `isBackupData` защищает от
некорректного ввода. Каждое копирование/восстановление фиксируется в аудите,
метки времени хранятся в `backupMeta`.

### Обслуживание базы

`MaintenanceService.scan()` — единая проверка связей: у Джамба существует
`materialId`; остаток в диапазоне `[0; initialWinding]`; `session.jumboId`,
`operation.jumboId`, `waste.jumboId` указывают на существующий Джамб (активный
или архивный). `checkIntegrity()` возвращает полный отчёт, `checkRelations()`
— только нарушения связей. `optimize/rebuildIndexes/clearCache` для локального
хранилища — безопасные операции с честным описанием (индексы для KV-хранилища
не требуются). Проверки **только читают** данные; все действия аудируются.

### Журналы и диагностика

- **Журнал ошибок**: глобальный обработчик (`useAppBootstrap`) ловит
  `window.onerror` и `unhandledrejection` и пишет в `errorLog` (описание, стек,
  версия). Экран журналов показывает ошибки и аудит с переключением и очисткой.
- **Аудит**: аддитивно подключён к ключевым сценариям — расчёт/списание,
  оприходование партии, редактирование и закрытие Джамба, отправка документа.
- **Диагностика**: версии приложения и БД (`DB_VERSION`), счётчики записей,
  оценка размера базы (`TextEncoder` по JSON всех ключей).

### Подготовка к многопользовательскому режиму

Модель `User` с ролями (оператор/мастер/администратор) и `UserService`
готовы заранее; при первом запуске сеется администратор (`ensureDefault`).
Схема хранения не меняется при переходе к нескольким пользователям.

### Экспорт/импорт (архитектура)

Провайдеры под общими интерфейсами: экспорт JSON — рабочий, CSV/Excel —
заготовки (`available:false`); импорт сырья/справочников/настроек — заготовки.
Новый формат подключается без изменения вызывающего кода.

### Настройки — хаб и под-экраны

`SettingsView` переработан в индекс с группами. Под-экраны (общий
`SettingsScaffold` с кнопкой «назад»):

- **Основные** — предприятие, оператор, e-mail, тема.
- **Производство** — порог списания, станки, форматы даты/времени.
- **Рассылка** — получатели, тема/текст, авто-отправка, расписание.
- **Безопасность** — PIN (локальная блокировка), биометрия, автоблокировка,
  подтверждение удаления.
- **Резервное копирование**, **Обслуживание**, **Диагностика**, **Журналы**,
  **О приложении** (версия, пользователи, план развития).

`AppSettings` расширены полями производства, безопасности и `autoBackup`
(значения по умолчанию сохранены, обратная совместимость не нарушена).

### Архитектура (диаграмма)

```
                 ┌─────────────────────────────────────────┐
                 │                Views                     │
                 │  SettingsView (хаб) → 9 под-экранов      │
                 └───────────────┬─────────────────────────┘
                                 │ hooks (ViewModels)
                 ┌───────────────▼─────────────────────────┐
                 │  admin/viewmodels: backup/maintenance/   │
                 │  diagnostics/logs/users/bootstrap        │
                 └───────────────┬─────────────────────────┘
                                 │ useServices() → AppContainer.admin
                 ┌───────────────▼─────────────────────────┐
                 │            AdminCenter                    │
                 │  errorLog · audit · users · backup ·      │
                 │  maintenance · diagnostics ·              │
                 │  export/import · storageProviders         │
                 └───────────────┬─────────────────────────┘
                                 │ repositories (CollectionRepository)
                 ┌───────────────▼─────────────────────────┐
                 │      KeyValueStore = StorageProvider      │
                 │   local (активен) │ cloud (заготовка)     │
                 └───────────────────────────────────────────┘
```

### Поток данных (резервное копирование / восстановление)

```
createBackup: backupStorageKeys ─read→ BackupData{version,appVersion,createdAt,data}
              → backupMeta.lastBackupAt → audit(backup)
exportJson:   createBackup → JSON.stringify → Blob → download
restore:      BackupData ─(version ≤ BACKUP_VERSION)→ write каждый ключ
              → backupMeta.lastRestoreAt → audit(restore)
importJson:   JSON.parse → isBackupData? → restore
```

### Поток данных (журнал ошибок)

```
window.onerror / unhandledrejection ─useAppBootstrap→ errorLog.log(desc,{stack,action})
              → ErrorLogRepository.save → экран «Журналы» (list, newest-first)
```

### Новые файлы

```
admin/models/{User,ErrorLog,AuditLog,Backup,Diagnostics,Maintenance,index}.ts
admin/storage/StorageProvider.ts
admin/repositories/AdminRepositories.ts
admin/services/{ErrorLog,AuditLog,User,Backup,Maintenance,Diagnostics}Service.ts
admin/export/DataExport.ts
admin/adminCenter.ts · admin/index.ts
admin/viewmodels/{useBackupViewModel,useMaintenanceViewModel,useDiagnosticsViewModel,
                  useLogsViewModel,useUsersViewModel,useAppBootstrap,index}.ts
admin/views/{SettingsScaffold,GeneralSettingsView,ProductionSettingsView,
             EmailSettingsView,SecuritySettingsView,BackupView,MaintenanceView,
             DiagnosticsView,LogsView,AboutView,index}.tsx
```

### Изменённые файлы

```
storage/StorageKeys.ts (+errorLogs/auditLogs/users/backupMeta, backupStorageKeys)
models/Settings.ts (поля производства/безопасности/autoBackup + defaults)
core/di/container.ts (admin: AdminCenter)
App.tsx (роуты /settings/*, useAppBootstrap)
views/SettingsView.tsx (переработан в хаб)
resources/icons.ts (+security/database/diagnostics/cloud/maintenance/users/error/
                    download/upload/about/logs/tune), resources/strings.ts (admin)
viewmodels/{useProductionViewModel,useReceiptViewModel,useJumboDetailViewModel}.ts (аудит)
documents/viewmodels/useDocumentComposeViewModel.ts (аудит отправки)
```

### Найденные и устранённые архитектурные проблемы

- **Разрозненность настроек**: единственный экран настроек рос линейно; выделен
  хаб + фокусные под-экраны с общим `SettingsScaffold`.
- **Отсутствие точки сборки администрирования**: введён `AdminCenter` — все
  админ-сервисы конструируются один раз и инжектируются, экраны их не «нюкают».
- **Дублирование логики размера/связей**: проверки связей вынесены в единый
  `scan()`, размер БД считается одной функцией по всем ключам.
- **Необрабатываемые ошибки исчезали**: добавлен глобальный обработчик →
  журнал ошибок; сбои теперь диагностируемы постфактум.
- **Готовность к росту не была явной**: протокол хранилища, роли пользователей
  и провайдеры экспорта/импорта оформлены как точки расширения (Open/Closed).

### Отчёт о техническом состоянии

- Слои: Models → Storage(`KeyValueStore`) → Repositories → Services →
  Composition(`AppContainer`) → ViewModels(hooks) → Views. Админ-модуль повторяет
  ту же слоистость и подключается одной строкой в контейнере.
- Инварианты соблюдены: движок расчёта не изменён (`git diff` пуст); история не
  пересчитывается (замороженные аккумуляторы), запись в склад транзакционна.
- Расширяемость: новый формат экспорта, облачный провайдер, роль пользователя,
  вид проверки целостности добавляются без изменения существующего кода.
- Границы честно задокументированы: PDF = печать HTML; e-mail = симулированный
  транспорт; облако/CSV/Excel/импорт/биометрия — заготовки под будущие фазы.

### Планы развития

- Облачная синхронизация и полноценный многопользовательский режим.
- Экспорт в CSV/Excel и импорт сырья/справочников/настроек.
- Биометрическая аутентификация и автоблокировка по таймеру.
- Автоматическое резервное копирование по расписанию.
- Миграции схемы БД по `DB_VERSION`.

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений; все чанки < 500 КБ (recharts
  изолирован лениво).
- Harness (in-memory store) — **33/33**: сеанс пользователя (seed/идемпотентность/
  current), журнал ошибок, аудит, диагностика (счётчики/размер), целостность
  (чисто и обнаружение битой связи), резервная копия (round-trip), экспорт/импорт
  JSON (в т.ч. отклонение мусора), провайдеры экспорта/хранилища, очистка.
- Движок расчёта идентичен `main` (диф пуст).

---

## Этап 7 — Производственная аналитика и KPI

> Используются существующие модели (Jumbo, CuttingSession, JumboOperation,
> Waste) и агрегирующий слой Report Center (`ReportContext`/`ReportRepository`)
> без изменений. Все показатели строятся автоматически из накопленных данных.
> Графики (Swift Charts → **recharts**, уже в зависимостях) подгружаются лениво.
> Алгоритм расчёта не изменён.

### Главное

Добавлен единый аналитический центр (`analytics/`). **KpiEngine** — чистый,
единственный источник производственных KPI; он же используется Dashboard —
дублирование расчётов устранено.

### Структура KPI Engine

```
analytics/
├── models.ts            ProductionKpi, JumboAnalytics, OperatorStat, MachineStat,
│                        MaterialStat, Ranking, TrendPoint, PeriodComparison, KpiCard
├── KpiEngine.ts         чистые функции ReportContext → KPI (без доступа к хранилищу)
├── AnalyticsService.ts  загрузка 1×, кэш, overview(filter), comparison(kind)
├── viewmodels/          useAnalyticsViewModel
└── views/               AnalyticsCenterView + AnalyticsCharts (recharts, lazy)
```

`KpiEngine` реализует единый контракт: каждая функция получает подготовленный
`ReportContext` (загруженный один раз через общий `ReportRepository`) и никогда
не обращается к хранилищу и не пересчитывает историю. Новый KPI добавляется как
функция движка — существующий код не меняется.

### Экраны/секции аналитики

- **KPI производства**: заказы, рулоны, расход материала, полезная площадь,
  брак, тех. остаток, общие потери, средний % использования, средний расход на
  заказ, средний расход на рулон (с изменением к прошлому периоду).
- **Аналитика Джамбов**: количество по статусам, средняя площадь, средний
  остаток, средний % использования.
- **Операторы / Станки / Материалы**: таблицы показателей.
- **Динамика**: линейные и столбчатые графики с группировкой (день/неделя/
  месяц/квартал/год) + круговая диаграмма по статусам Джамбов.
- **Сравнение периодов**: сегодня/вчера, месяц/прошлый месяц, год/прошлый год —
  с изменением в процентах.
- **Рейтинги**: ТОП материалов, операторов, заказчиков, причин брака.
- **Фильтры**: период, материал, оператор, станок, заказчик.

### Формулы показателей

- `materialUsedM = Σ session.result.used_length_m`
- `usefulAreaM2 = Σ session.result.useful_area_m2`
- `processedArea = Σ (materialWidthMm/1000 × used_length_m)`
- `avgUsagePercent = usefulArea / processedArea × 100`
- `waste/scrap/totalLosses = Σ` замороженной статистики архива за период
- `avgPerOrderM = materialUsedM / orders`; `avgPerRollM = materialUsedM / rolls`
- Джамбы: `avgAreaM2 = avg(initialWinding × width/1000)`,
  `avgRemainderM = avg(остаток)`, `avgUsagePercent = avg(efficiency)`
- Станок: `productivity = rolls / hours`
- Сравнение: `deltaPercent = (current − previous) / previous × 100`
- Тренд: суммы по бакетам `bucketLabel(createdAt, grouping)`

### Кэширование аналитики

`AnalyticsService` загружает данные один раз через общий `ReportRepository`
(`Promise.all`) и кэширует `AnalyticsOverview` по ключу `фильтр + сигнатура
данных`. Пока данные не изменились, повторное открытие экрана не выполняет
вычислений; любая складская операция меняет сигнатуру и инвалидирует кэш.
Тяжёлых вычислений во View нет; графики загружаются лениво (`React.lazy`).

### Dashboard

Главный экран переведён на `AnalyticsService` — те же агрегированные данные,
без дублирования расчётов.

### Новые файлы

```
analytics/{models,KpiEngine,AnalyticsService,index}.ts
analytics/viewmodels/useAnalyticsViewModel.ts
analytics/views/{AnalyticsCenterView,AnalyticsCharts,index}.tsx
```

### Изменённые файлы

```
core/di/container.ts (analytics), viewmodels/useDashboardViewModel.ts (reuse engine),
reports/builders/support.ts (+widthMm в JumboLine), reports/index.ts (экспорт
jumboLines/bucketLabel/JumboLine), App.tsx (роут /analytics),
app/navigation.ts + resources/strings.ts (вкладка «Отчёты»),
views/DashboardView.tsx (карточки «Аналитика»/«Отчёты»)
```

Удалён неиспользуемый `analytics/statistics.ts`.

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений (recharts изолирован в ленивом
  чанке `AnalyticsCharts`, основной бандл < 500 КБ).
- Harness (in-memory store) — **27/27**: KPI производства и формулы, аналитика
  Джамбов, операторы/станки/материалы, рейтинги (в т.ч. причины брака), тренд по
  бакетам, фильтр по материалу, сравнение периодов (%), кэш (hit + инвалидация),
  группировка по дням.
- Движок расчёта идентичен `main`.

---

## Этап 6 — PDF-документы и рассылка по электронной почте

> Report Center Этапа 5 не изменён — используются существующие `ReportBuilder`
> и `ReportData`. В веб-сборке `PDFBuilder` формирует самодостаточный
> print-ready HTML-документ (браузер сохраняет его как PDF; нативный
> PDF-байтовый рендерер — это drop-in провайдер). Отправка идёт через
> подключаемый `EmailTransport` (по умолчанию — симуляция, т.к. в чистом
> клиенте нет SMTP). Алгоритм расчёта не изменён.

### Модуль `documents/`

```
documents/
├── models/       GeneratedDocument (+DocumentStatus), PdfDocument, Email*
├── pdf/          PdfTemplate (единый стиль) + PDFBuilder
├── email/        EmailValidation, EmailTemplate, EmailService
├── providers/    EmailTransport (+ Local; seam для SMTP/API/1С/ERP/SharePoint)
├── history/      DocumentRepository
├── scheduler/    DocumentScheduler
├── services/     DocumentService
├── viewmodels/   useDocuments / useDocumentCompose / useDocumentPreview / useDocumentScheduler
├── views/        DocumentsView, DocumentComposeView, DocumentPreviewView, DocumentFrame
└── documentsCenter.ts, index.ts
```

### Архитектура PDFBuilder

```ts
interface PDFBuilder { build(report: ReportData, options?): PdfDocument }
```

Получает **только `ReportData`**, не обращается к хранилищу и не считает.
Все 7 типов отчётов проходят через единый `PdfTemplate` (логотип, название,
дата формирования, период, таблица, итоговые показатели, номер страницы, дата
печати) — все документы выглядят одинаково.

### Архитектура EmailService

```
DocumentService → EmailService.send(envelope) → EmailTransport.send(envelope)
```

`EmailService` перед отправкой проверяет: наличие получателей, корректность всех
адресов (To/Cc/Bcc), наличие вложения. Поддерживаются несколько получателей.
`EmailTransport` — единственная точка расширения для реальной доставки
(SMTP/API/1С/ERP/SharePoint); бандл-транспорт симулирует доставку.

### Структура истории документов (`GeneratedDocument`)

`id (UUID)`, `title`, `kind`, `createdAt`, `periodLabel`, `recipients[]`,
`cc[]`, `bcc[]`, `sizeBytes`, `status` (generated/sending/sent/failed),
`error?`, `mimeType`, `content` (сохранённый документ), `reportId`,
`automatic`, `sentAt?`. **Повторная отправка использует сохранённый документ**
без повторной генерации.

### Ручная и автоматическая отправка

- **Ручная**: экран «Новый документ» — выбор типа отчёта, периода и получателей,
  предпросмотр PDF, затем «Сформировать и отправить».
- **Автоматическая**: `DocumentScheduler` (ежедневно/еженедельно/ежемесячно,
  по умолчанию ежемесячно). Клиент не имеет фонового демона, поэтому планировщик
  запускается при старте приложения и формирует отчёты один раз за период
  (месяц). В конце месяца автоматически формируются **производственный** и
  **складской** отчёты; при включённой авторассылке — отправляются.

### Обработка ошибок

Неудачная отправка сохраняет статус `Ошибка` и текст ошибки; из истории или
карточки документа доступна повторная отправка.

### Шаблон письма

Тема: `Производственный отчёт за {month}`; текст по умолчанию — авто-письмо.
`{month}` подставляется. Настраивается в разделе настроек.

### Настройки (AppStorage)

Добавлены: получатели, копия (CC), скрытая копия (BCC), тема письма, текст
письма, расписание, включение автоматической отправки.

### UI

Раздел **«Документы»**: история (`DocumentsView`), составление и ручная отправка
(`DocumentComposeView`), просмотр сохранённого документа с печатью/повторной
отправкой (`DocumentPreviewView`). Точки входа — карточка на Dashboard, кнопки в
«Аналитике» и предпросмотре отчёта.

### Диаграмма Documents Module

```
ReportCenterService.generate(kind, filter) → ReportData
        │
        ▼
DocumentService ──► PDFBuilder(ReportData) ──► PdfDocument ──► DocumentRepository (история)
        │                                                         ▲
        └──► EmailService.send(envelope) ──► EmailTransport       │ resend (сохранённый документ)
                                                    ▲
                              DocumentScheduler (по расписанию) ──┘
```

### Точки расширения для будущих интеграций

- **Доставка**: новый `EmailTransport` (SMTP, REST API, 1С, ERP, SharePoint).
- **Форматы**: `PDFBuilder`/`PdfTemplate` может уступить место нативному
  PDF-рендереру; `ReportData` уже готов для Excel/CSV (Этап 5).
- **API**: `ReportData` и `GeneratedDocument` — готовая полезная нагрузка.

### Изменённые файлы

```
models/Settings.ts (email-поля), models/DocumentSchedule.ts (new), models/index.ts,
storage/StorageKeys.ts (documents/documentsMeta), core/di/container.ts,
App.tsx (роуты + запуск планировщика), views/DashboardView.tsx (карточка),
views/SettingsView.tsx (рассылка), reports/views/{AnalyticsView,ReportPreviewView}.tsx,
vite.config.ts (разбиение чанков radix/icons)
```

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений (все чанки < 500 КБ).
- Harness (in-memory store) — **29/29**: PDF для всех 7 отчётов, содержимое
  шаблона (логотип/период/дата печати/страница), история, ручная отправка,
  валидация (нет получателей / некорректный адрес), повторная отправка из
  сохранённого документа, планировщик (ежемесячно, один раз за период, off),
  несколько получателей.
- Движок расчёта идентичен `main`.

---

## Этап 5 — Report Center (универсальные производственные отчёты)

> Платформа та же; «SwiftData» — слой репозиториев над `KeyValueStore`. **PDF,
> Email, Excel, CSV на этом этапе не реализуются** — подготовлены только данные,
> фильтрация, агрегирование и предпросмотр. Алгоритм расчёта нарезки не изменён.

### Главное

Добавлен отдельный модуль **`reports/`** — единый центр формирования отчётов.
Архитектура позволяет добавлять новые отчёты и форматы экспорта **без изменения
существующего кода** (Open/Closed): новый отчёт = новый Builder + строка в
реестре; новый формат = новый провайдер.

### Структура модуля

```
reports/
├── models/       ReportKind, ReportFilter (+grouping/sort), ReportData
├── repositories/ ReportRepository (агрегатор), ReportContext
├── builders/     ReportBuilder (протокол) + 7 построителей + registry + support
├── services/     ReportCenterService, ReportCache
├── export/       ExportProvider, EmailReportProvider, ReportExporter + провайдеры
├── viewmodels/   useAnalyticsViewModel, useReportPreviewViewModel
├── views/        AnalyticsView, ReportPreviewView
└── reportCenter.ts (composition root), index.ts
```

### ReportBuilderProtocol

```ts
interface ReportBuilder {
  readonly kind: ReportKind;
  build(context: ReportContext): ReportData;   // получает только подготовленные данные
}
```

Builder не обращается к хранилищу и не выполняет тяжёлых вычислений: все данные
загружаются один раз через `ReportRepository.loadContext(filter)` и передаются в
контексте.

### Структура ReportData (универсальный источник экспорта)

```ts
interface ReportData {
  id: string;              // UUID
  kind: ReportKind;
  title: string;
  generatedAt: string;
  period: { startDate?; endDate?; label };
  filter: ReportFilter;
  table: { columns: ReportColumn[]; rows: ReportRow[] };   // подготовленная таблица
  summary: ReportSummaryItem[];                            // итоговые показатели
  metadata: Record<string, string | number>;
}
```

Эта модель — единственный вход для будущих PDF / Excel / CSV / Email / API.

### Виды отчётов (7)

Производственный (главный), по заказам, по Джамбам, по складу, по операторам,
по станкам, по материалам. Каждый — отдельный Builder.

### Фильтры / группировка / сортировка

- **Фильтры**: период (дата начала/окончания), материал, оператор, станок,
  заказчик, номер заказа, номер Джамба, статус.
- **Группировка**: день / неделя / месяц / квартал / год (для отчётов по времени).
- **Сортировка**: дата / материал / оператор / станок / заказы / расход.

### Итоговые показатели

Считаются автоматически в Builder из подготовленного контекста (заказы, рулоны,
расход, полезная площадь, брак, тех. остаток, процент использования и др.).

### Кэш и производительность

`ReportCache` кэширует `ReportData` по ключу `kind + фильтр + сигнатура данных`.
Сигнатура вычисляется в `ReportRepository` из объёмов и последних меток времени —
любое изменение данных инвалидирует кэш. История не пересчитывается; агрегация
идёт по замороженным накопителям и снимкам архива.

### Точки расширения (подготовлены, без реализации)

- **PDF** — `ExportProvider` (`createPdfExportProvider`).
- **Excel** — `createExcelProvider`.
- **CSV** — `createCsvProvider`.
- **Email** — `EmailReportProvider` (`createEmailReportProvider`).
- **API** — тот же `ReportData` пригоден как полезная нагрузка.

Провайдеры зарегистрированы в `ReportExporter`; сейчас возвращают
`available: false` без выполнения экспорта.

### UI

Новый раздел **«Аналитика»** (переиспользована вкладка «Отчёты»): список отчётов
с поиском (`AnalyticsView`) и универсальный предпросмотр с фильтрами,
группировкой, сортировкой, таблицей и итогами (`ReportPreviewView`).

### Диаграмма формирования отчёта

```
View (ReportPreviewView)
  → ViewModel (useReportPreviewViewModel)  — фильтр + группировка + сортировка
    → ReportCenterService.generate(kind, filter)
        ├─ ReportRepository.loadContext(filter)  → ReportContext (загрузка 1×)
        ├─ ReportCache (по kind+filter+signature)
        └─ getReportBuilder(kind).build(context) → ReportData
    → таблица + итоги в предпросмотре
```

### Новые файлы

Весь каталог `client/src/reports/**` (модели, ReportRepository, 7 билдеров +
support + registry, ReportCenterService, ReportCache, export-провайдеры,
2 ViewModel, 2 View, reportCenter, барели).

### Изменённые файлы

```
core/di/container.ts (reportCenter), App.tsx (роуты /reports, /reports/:kind),
app/navigation.ts (иконка), resources/strings.ts (Аналитика),
views/DashboardView.tsx (карточка «Аналитика»), views/index.ts, viewmodels/index.ts
```

Удалены заглушки `views/ReportsView.tsx` и `viewmodels/useReportsViewModel.ts`.

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений.
- Harness (in-memory store) — **28/28**: все 7 отчётов формируются, фильтры
  (материал/дата), группировка (месяц), сортировка (материал), итоги,
  включение архива без дублей, кэш (hit + инвалидация), провайдеры экспорта.
- Движок расчёта идентичен `main`.

---

## Этап 4 — Полный жизненный цикл Джамба

> Платформа та же (React + TS + Vite); «SwiftData» — слой репозиториев над
> `KeyValueStore`. **Алгоритм расчёта нарезки не изменён** (движок идентичен
> `main`).

### Главное

Реализован полный жизненный цикл Джамба: поступление → в работе → подлежит
списанию → **закрытие** → архив. При закрытии остаток списывается как
технологический остаток, итоговые показатели вычисляются **один раз** и
замораживаются в архиве.

### Жизненный цикл и закрытие Джамба

1. **Действие «Закрыть Джамб»** на карточке Джамба со сводкой перед закрытием
   (номер, материал, начальная намотка, остаток, использовано, полезная
   площадь, количество заказов, количество рулонов).
2. **Технологический остаток.** Остаток автоматически становится записью
   `Waste` типа «Технологический остаток» (метры, м², дата, оператор,
   комментарий).
3. **Итоговые показатели** (замораживаются в архиве, больше не меняются):
   общая площадь, полезная площадь, площадь брака, площадь тех. остатка,
   общие потери, % полезного использования, % брака, % тех. потерь + метраж,
   заказы, рулоны, операции, коэффициент.
4. **Архивирование.** Статус → «Архив», операция журнала `Archive`, создаётся
   `ArchivedJumbo` — самодостаточный снимок: финальный Джамб, история операций,
   история заказов (`CuttingSession[]`), история потерь (`Waste[]`), итоговая
   статистика. Всё выполняется как одна транзакция (откат частичных записей при
   ошибке).

### Архив

- **Карточка архива**: номер, материал, период использования, начальная
  намотка, остаток, использовано, полезная площадь, брак, технологический
  остаток, общие потери, процент использования, заказы, потери, журнал операций.
- **Поиск** по номеру, материалу, оператору, периоду.
- **Фильтры** по материалу, году и месяцу.

### Dashboard

Добавлены показатели: архивировано Джамбов, использовано материала, средний
процент использования, средний процент брака (из замороженной статистики
архива).

### Подготовка PDF и E-mail

- **`ReportBuilder`** — структура данных отчёта по архивному Джамбу (секции и
  строки), без генерации PDF; значения берутся из замороженной статистики.
- **`EmailQueue`** — персистентная очередь писем (`enqueue` / `pending`), без
  отправки; фундамент для авторассылки.

### Новые файлы

```
models/… (расширения)
repositories/WasteRepository.ts
services/ReportBuilder.ts, services/EmailQueue.ts
viewmodels/useArchiveDetailViewModel.ts
views/ArchiveDetailView.tsx
```

### Изменённые файлы

```
models/Waste.ts (+operator/comment/sessionId/wasteKindTitle)
models/ArchivedJumbo.ts (итоговая статистика + sessions/wastes/период)
models/index.ts, storage/StorageKeys.ts (+wastes/emailQueue)
services/WarehouseService.ts (+closeJumbo/summarizeForClose), services/index.ts
repositories/index.ts, core/di/container.ts
viewmodels/{useJumboDetailViewModel,useArchiveViewModel,useDashboardViewModel,index}.ts
views/{JumboDetailView,ArchiveView,DashboardView,index}.tsx, App.tsx
```

### ER-диаграмма новых сущностей

```
ArchivedJumbo {
  id (= Jumbo.id), jumbo (финальный снимок),
  operations: JumboOperation[], sessions: CuttingSession[], wastes: Waste[],
  statistics: ArchivedJumboStatistics {
    totalAreaM2, usefulAreaM2, wasteAreaM2, scrapAreaM2, totalLossesM2,
    usefulPercent, wastePercent, scrapPercent,
    usedLengthM, initialWindingM, finalRemainderM,
    ordersCount, rollsCount, operationsCount, efficiency },
  usageStartDate, usageEndDate, archivedAt, archivedBy, comment
}
Waste { id, kind (technological|edge|inner), areaM2, lengthM, jumboId,
        sessionId?, operator?, comment?, createdAt }
```

### Описание жизненного цикла (кратко)

`На складе` → (первый расчёт) `В работе` → (остаток < 300 м) `Подлежит
списанию` → (действие «Закрыть Джамб») `Архив`. Показатели Джамба обновляются
инкрементально во время работы; при закрытии считаются итоги и фиксируются в
`ArchivedJumbo` — архив никогда не пересчитывается.

### Подготовка данных для PDF

`ReportBuilder.buildJumboReport(archived)` возвращает `JumboReportData`
(заголовок + секции «Общие сведения / Материал / Площади / Показатели» из строк
label→value). Рендерер PDF следующего этапа использует эту структуру без
пересчёта.

### Проверки

- `npx tsc` — 0 ошибок; `--noUnusedLocals/Parameters` чисто в клиентском коде.
- `npx vite build` — успешно, без предупреждений.
- Harness (in-memory store) — 30/30: закрытие Джамба, создание тех. остатка,
  итоговые показатели, архивирование, неизменяемость истории, ReportBuilder,
  EmailQueue, повторное закрытие = no-op, метрики Dashboard.
- Движок расчёта идентичен `main`.

---

## Этап 3 — Интеграция расчёта нарезки со складом

> Платформа та же (React + TS + Vite). «SwiftData» — слой репозиториев над
> `KeyValueStore`. **Математический алгоритм расчёта нарезки не изменён** —
> движок вызывается с теми же аргументами; изменена только производственная
> логика вокруг расчёта.

### Главное

- Каждый производственный расчёт теперь выполняется по конкретному Джамбу:
  оператор заполняет информацию о заказе, выбирает Джамб вручную, после
  успешного расчёта остаток и накопительные показатели Джамба обновляются
  инкрементально, создаётся операция журнала и сессия истории, Dashboard
  показывает актуальные данные.
- Свободный калькулятор (Этап 1) сохранён как «Быстрый расчёт» — те же
  результаты, без списания со склада.

### Новая логика расчёта и её связь со складом

1. Экран **«Производство»**: карточка «Информация о заказе» (дата, время,
   заказчик, номер заказа, оператор, станок №1/№2, комментарий).
2. Кнопка **«Выбрать Джамб»** открывает список доступных Джамбов (без
   авто-выбора/FIFO). Выбранный Джамб показывается в блоке «Используемый Джамб»
   только для чтения.
3. Материал берётся из выбранного Джамба: ширина материала = ширина Джамба,
   доступная длина = текущий остаток Джамба. Расчёт считается тем же движком.
4. Перед расчётом проверяется: выбран Джамб; остаток > 0; статус ≠ «Подлежит
   списанию»; материала достаточно. Если нет — показывается сообщение
   «Недостаточно материала…», расчёт не выполняется.
5. Первое использование Джамба: дата начала использования, статус «В работе»
   (жёлтый), операция `usageStart`.
6. После выполнения `WarehouseService.completeCalculation` **инкрементально**:
   уменьшает остаток, увеличивает `usedLength`, `usefulArea`, `ordersCount`,
   `rollsCount`, пересчитывает `efficiency` (из накопителей, не по истории),
   создаёт `JumboOperation` типа `calculation` и `CuttingSession`.
7. Если остаток < 300 м — статус «Подлежит списанию» (красный) и уведомление;
   такой Джамб исключается из выбора для новых расчётов.

### Автоматически обновляемые накопительные показатели (в записи Джамба)

`currentRemainderM`, `usedLength`, `usefulArea`, `ordersCount`, `rollsCount`,
`efficiency`. История никогда не пересчитывается целиком.

### Новые файлы

```
models/Machine.ts, models/CuttingSession.ts
repositories/CuttingSessionRepository.ts
viewmodels/useProductionViewModel.ts
views/ProductionView.tsx
```

### Изменённые файлы

```
models/CuttingRoll.ts        (+ RollDestination, sessionId)
models/CuttingOrder.ts       (сведён к CuttingOrderInput)
models/Jumbo.ts              (+ ordersCount, rollsCount)
models/JumboOperation.ts     (+ machine, customer, orderNumber, remainderAfterM, rollsCount)
models/index.ts
services/WarehouseService.ts (+ completeCalculation, порог 300 м)
services/ReportService.ts    (generateSessionReport)
services/index.ts
repositories/index.ts        (- CuttingOrderRepository, + CuttingSessionRepository)
storage/StorageKeys.ts       (- cuttingOrders, + cuttingSessions)
core/di/container.ts
viewmodels/{useCalculatorViewModel,useHistoryViewModel,useDashboardViewModel,index}.ts
views/{CalculatorView,HistoryView,DashboardView,index}.tsx
resources/strings.ts, App.tsx
```

Удалён `repositories/CuttingOrderRepository.ts` (история заменена на
`CuttingSession`).

### Диаграмма новых связей

```
Material 1 ──< Jumbo 1 ──< JumboOperation (receipt / usageStart / calculation …)
                 │
CuttingSession >─┘  (session.jumboId → Jumbo.id)
  ├── order: OrderInfo (станок, заказчик, № заказа, оператор …)
  ├── input: CuttingOrderInput   ├── result: CalcResult
  ├── rolls: CuttingRoll[] (destination: order | warehouse)
  ├── operationIds: [usageStart?, calculation]
  └── wasteIds: []  (Этап 4)
```

### Транзакционная модель, откат и версионирование (доп. к Этапу 3)

- **Атомарная транзакция.** `completeCalculation` выполняется как одна
  транзакция с общим `transactionId`: при ошибке частичные записи
  откатываются (снимок Джамба восстанавливается, созданные операции/сессия
  удаляются), состояние остаётся согласованным.
- **`rollbackTransaction(transactionId)`** в `WarehouseService`: восстанавливает
  остаток, уменьшает `usedLength / usefulArea / ordersCount / rollsCount`,
  пересчитывает `efficiency`, помечает операции `isReverted = true`, а сессию —
  `status = reverted`. **Записи не удаляются** — история неизменяема. UI отката
  на этом этапе не создаётся (по требованию).
- **Версионирование.** `CuttingSession.version` (всегда 1) + `transactionId`,
  `status`, `createdAt`, `updatedAt`; архитектура готова к будущим версиям
  заказа и хранению предыдущих версий.
- **Расширен `JumboOperation`:** `transactionId`, `sessionId`, `createdAt`,
  `updatedAt`, `isReverted` (+ производственный контекст из основной части).
- **Проверка сценариев.** Прогонян отдельный harness (in-memory store):
  новый заказ, повторный заказ, первый запуск, `< 300 м → «Подлежит списанию»`,
  недостаточный остаток, создание сессии/журнала, откат с восстановлением
  накопителей и неизменяемой историей — 32/32 проверки пройдены. Harness не
  коммитится.

### ER-диаграмма новых сущностей

```
CuttingSession { id, transactionId, version, status, createdAt, updatedAt,
                 order: OrderInfo, jumboId, materialCode,
                 input, result, rolls[], operationIds[], wasteIds[] }
   │ 1                         │ transactionId (общий)
   │                           ▼
   └──< CuttingRoll        JumboOperation { id, transactionId, sessionId, type,
        { destination:                       usedLengthDeltaM, usefulAreaDeltaM2,
          order|warehouse }                  remainderAfterM, isReverted, … }
                                             │ jumboId
Material 1 ──< Jumbo 1 ──────────────────────┘
   (Jumbo: currentRemainderM, usedLength, usefulArea, ordersCount,
    rollsCount, efficiency — накопительно)
```

### Поток Repository → Service → ViewModel → View

```
View (ProductionView)
  → ViewModel (useProductionViewModel)  — состояние формы, live-план, валидация
    → Service (WarehouseService.completeCalculation / rollbackTransaction,
               CalculationService.calculate)
      → Repository (Jumbo / JumboOperation / CuttingSession)
        → Storage (KeyValueStore)
```

ViewModel никогда не обращается к хранилищу напрямую — только через сервисы и
репозитории.

### Архитектурные решения

- **Repository-only мутации.** Все изменения проходят через репозитории;
  производственная логика — в `WarehouseService.completeCalculation`, ViewModel
  не пишет в хранилище напрямую.
- **Инкрементальные накопители.** Показатели обновляются как дельты к полям
  записи Джамба; полные пересчёты истории исключены (O(1) на операцию).
- **Разделение потоков.** Свободный калькулятор и производственный расчёт
  используют один и тот же `CalculationService`, но разные ViewModel/экраны
  (SRP): математика едина, производственная обвязка изолирована.
- **`CuttingSession` — единая сущность истории производства**, объединяющая
  заказ, Джамб, рулоны, операции и (в будущем) брак.
- **Кнопка «Добавить брак»** добавлена только как интерфейс (без логики) —
  фундамент для Этапа 4.

---

## Этап 2 — Модуль «Склад сырья (Джамбы)»

> Платформа не изменилась: это то же веб-приложение (React + TypeScript + Vite).
> «SwiftData» из задания реализован через слой хранения Этапа 1 — заменяемый
> `KeyValueStore` + репозитории. Модели остаются чистыми сериализуемыми
> структурами (`@Model`-эквивалент), связи выражены через идентификаторы
> (`materialId`, `jumboId`). Алгоритм расчёта нарезки **не менялся**.

### Главное

- Реализован полноценный модуль учёта сырья: справочник материалов, база
  Джамбов, журнал операций, архив, поиск, фильтрация, сортировка и цветовая
  индикация статусов.
- Каждый экран получил собственный ViewModel (MVVM). Бизнес-логика — в сервисах
  и ViewModel, не во View.
- Dashboard подключён к реальным данным: количество Джамбов и разбивка по
  статусам (На складе / В работе / Подлежит списанию / Архив).

### Новые модели

- `Material` (переработана): `code` ровно 8 символов и уникален, `manufacturer`,
  `thicknessMicron`, `standardWidthMm`, `description`, `status`.
- `Jumbo` (переработана): накопительные поля `usedLength`, `usefulArea`,
  `wasteArea`, `scrapArea`, `efficiency` хранятся **в записи**, плюс `comment`,
  `materialId` (связь), даты и статус.
- `JumboOperation` (переработана): типы Приход / Начало использования /
  Изменение / Корректировка / Архивирование (+ зарезервированы Расчёт / Брак /
  Списание); поля дата-время, тип, комментарий, оператор, опциональные дельты.
- `ArchivedJumbo` (новая): полный снимок Джамба + статистика + история операций.
- `MaterialStatus` (новый enum): Активен / Неактивен.

### Новые экраны

- `MaterialsView` — справочник материалов (поиск, фильтр по статусу, сортировка).
- `MaterialEditorView` — создание/редактирование/удаление материала с валидацией
  и проверкой уникальности кода.
- `WarehouseView` (переработан) — список Джамбов: поиск, фильтры со счётчиками,
  сортировка, цветовая индикация по статусу.
- `ReceiptView` — «Поступление сырья»: партия из нескольких Джамбов с единой
  датой (изменяемой один раз).
- `JumboDetailView` — карточка Джамба: полная информация, накопительные
  показатели, управление и Timeline (журнал операций).
- `ArchiveView` — раздел «Архив» (пустой, архитектура готова).

### Новые ViewModel

`useMaterialsViewModel`, `useMaterialEditorViewModel`, `useWarehouseViewModel`
(переработан), `useReceiptViewModel`, `useJumboDetailViewModel`,
`useArchiveViewModel`, `useDashboardViewModel` (переработан — счётчики статусов).

### Структура хранения (SwiftData-эквивалент)

Репозитории поверх `KeyValueStore` (ключи в `storage/StorageKeys.ts`):

| Сущность | Репозиторий | Ключ |
| --- | --- | --- |
| `Material` | `MaterialRepository` (+`findByCode`) | `materials` |
| `Jumbo` | `JumboRepository` | `jumbos` |
| `JumboOperation` | `JumboOperationRepository` (+`forJumbo`) | `jumboOperations` |
| `ArchivedJumbo` | `ArchivedJumboRepository` | `archivedJumbos` |
| `AppSettings` | `SettingsRepository` | `settings` |

`WarehouseService` инкапсулирует запись операций и поддержание накопительных
полей; собран в DI-контейнере (`core/di/container.ts`).

### Диаграмма связей

```
Material 1 ──< Jumbo 1 ──< JumboOperation
                 │
                 └── (архивирование) ──> ArchivedJumbo
                                          ├── snapshot: Jumbo
                                          ├── operations: JumboOperation[]
                                          └── statistics: ArchivedJumboStatistics
```

Связи по идентификаторам: `Jumbo.materialId → Material.id`,
`JumboOperation.jumboId → Jumbo.id`, `ArchivedJumbo.id = Jumbo.id`.

### Архитектурные решения

- **Накопительное хранение показателей.** `usedLength / usefulArea / wasteArea /
  scrapArea / efficiency` хранятся в записи Джамба и на этом этапе
  инициализируются нулём при приходе. История не пересчитывается при открытии
  экрана — это обеспечивает O(1) чтение склада и готовит инкрементальные
  обновления следующих этапов. Дельты по операциям хранятся в `JumboOperation`.
- **Автоматический журнал.** Любая запись (приход, начало использования,
  изменение, корректировка) создаёт `JumboOperation` через `WarehouseService`,
  а не вручную во View.
- **Единый слой хранения.** Новые сущности используют тот же `KeyValueStore`,
  поэтому переход на серверную БД/SwiftData затрагивает только реализацию стора.
- **Производительность.** Поиск/фильтр/сортировка выполняются в памяти над уже
  загруженными записями; количество запросов к хранилищу минимально
  (`Promise.all` при загрузке экрана), тяжёлых вычислений во View нет.
- **Единый UI.** Новые списки и фильтры вынесены в переиспользуемые
  `ListRow` и `SegmentedControl`; статусы — через общий `StatusBadge`.

---

## Этап 1 — Рефакторинг архитектуры и полное обновление интерфейса

> Примечание о платформе. Репозиторий `Kalkuliator-nariezchika-iOS` — это
> веб-приложение (React + TypeScript + Vite, PWA для установки на iOS), а не
> нативный Swift/Xcode-проект. Нативного iOS-кода в репозитории нет. По
> согласованию с заказчиком цели этапа (архитектура, единый UI, модели склада /
> аналитики / отчётов, экраны-заглушки, настройки) реализованы на существующем
> веб-стеке. Понятия iOS отображены на веб-эквиваленты: MVVM → ViewModel-хуки,
> `NavigationStack`/`TabView` → `wouter` + постоянный `TabBar`, `AppStorage` →
> репозиторий настроек поверх `localStorage`, слой хранения спроектирован как
> заменяемый (переход на серверное/IndexedDB-хранилище не затронет вышестоящие
> слои).

### Главное

- **Алгоритм расчёта не изменён.** Файл движка перенесён без единой правки
  (`lib/calculator_logic.ts` → `core/calculator/calculatorLogic.ts`, diff:
  0 добавлений / 0 удалений). Все результаты идентичны прежним.
- Приложение полностью пересобрано по слоистой архитектуре (см. ниже).
- Интерфейс приведён к единому современному стилю: карточки, радиусы, отступы,
  кнопки, Toolbar, Navigation, TabBar, Alert, единые контролы.
- Добавлены Dashboard, TabBar на 6 разделов и экраны-заглушки с единым
  оформлением и пояснением «Раздел будет реализован на следующем этапе».
- Поддержаны Light/Dark Mode (единый `ThemeManager`), Dynamic Type
  (относительные единицы), iPad (адаптивная ширина и сетки).

### Added — новые возможности

- **Dashboard** с карточкой «Последний расчёт» и сеткой быстрых переходов:
  Быстрый расчёт, История, Склад (заглушка), Отчёты (заглушка), Архив
  (заглушка), Настройки.
- **TabBar / навигация** через `NavigationStack`-эквивалент: вкладки Обзор,
  Расчёт, История, Склад, Отчёты, Настройки.
- **История расчётов** — сохранение результата в хранилище, поиск, удаление,
  очистка (через Alert).
- **Экран настроек** на базе слоя хранения: Email, Название предприятия,
  Оператор, Автоматическая отправка, Тёмная тема, Версия приложения.
- **Переиспользуемые компоненты**: `PrimaryButton`, `SecondaryButton`,
  `CardView`, `SectionHeader`, `InfoRow`, `StatusBadge`, `MetricCard`,
  `LoadingView`, `EmptyState`, `SearchBar` (+ `TabBar`, `ScreenScaffold`).
- **ThemeManager** и единый набор токенов (цвета, шрифты, отступы, радиусы,
  иконки, анимации) — без «магических» значений в экранах.

### Changed — изменения

- `App.tsx` переписан: провайдеры + таблица маршрутов + постоянный `TabBar`.
- `main.tsx` — убран force-unwrap (`!`) при получении корневого элемента.
- `vite.config.ts` — разбиение крупных вендоров на отдельные чанки
  (сборка без предупреждений о размере бандла).

### Removed — удалено

- `client/src/pages/roll-cutting-calculator.tsx` — единый экран разбит на
  `CalculatorView` + `useCalculatorViewModel` + `CuttingScheme` (логика и UI
  сохранены).

---

## Новая архитектура

Слои (каталоги в `client/src/`):

| Группа | Назначение |
| --- | --- |
| `app/` | Точка входа, провайдеры, конфигурация навигации |
| `core/` | Тема (`ThemeManager`, токены), DI-контейнер, движок расчёта |
| `models/` | Доменные модели (данные, сериализуемые, с `id`) |
| `analytics/` | Модели KPI для будущей аналитики |
| `services/` | `CalculationService`, `ReportService`, `EmailService` |
| `repositories/` | Протокол репозитория и реализации (не зависят от UI) |
| `storage/` | Заменяемый слой хранения (`KeyValueStore` + `localStorage`) |
| `viewmodels/` | По одному ViewModel на каждый экран (MVVM) |
| `views/` | Экраны (только из переиспользуемых компонентов) |
| `components/` | Библиотека UI-компонентов |
| `resources/` | Строки, иконки, метаданные приложения |
| `extensions/` | Форматтеры чисел и дат |
| `utilities/` | Общие утилиты (генерация `id`) |
| `reports/` | Зарезервировано под генерацию отчётов следующего этапа |

Принципы: SOLID, DRY, KISS, композиция вместо наследования, Dependency
Injection (единый composition root в `core/di/container.ts`), протокол-
ориентированный дизайн (`Repository`, `*Service`), `async/await` в сервисах и
репозиториях. Бизнес-логики внутри View нет — каждый экран работает только со
своим ViewModel.

### Новые файлы (основное)

```
app/navigation.ts, app/providers/AppProviders.tsx
core/theme/theme.ts, core/theme/ThemeManager.tsx
core/di/container.ts, core/di/AppServices.tsx
core/calculator/calculatorLogic.ts            (перенос, без изменений)
models/{Material,Jumbo,CuttingOrder,CuttingRoll,Waste,JumboOperation,
        Settings,Report,JumboStatus,index}.ts
analytics/{statistics,index}.ts
services/{CalculationService,ReportService,EmailService,index}.ts
repositories/{Repository,CuttingOrderRepository,JumboRepository,
              SettingsRepository,index}.ts
storage/{KeyValueStore,LocalStorageStore,StorageKeys}.ts
viewmodels/{useCalculatorViewModel,useDashboardViewModel,useHistoryViewModel,
            useWarehouseViewModel,useReportsViewModel,useSettingsViewModel,
            calculatorSchema,index}.ts
views/{DashboardView,CalculatorView,HistoryView,WarehouseView,ReportsView,
       SettingsView,index}.tsx, views/calculator/CuttingScheme.tsx
components/{PrimaryButton,SecondaryButton,CardView,SectionHeader,InfoRow,
            StatusBadge,MetricCard,LoadingView,EmptyState,SearchBar,TabBar,
            ScreenScaffold,index}.tsx
resources/{strings,icons,appInfo}.ts
extensions/{number,date}.ts, utilities/id.ts
```

### Изменённые файлы

```
client/src/App.tsx
client/src/main.tsx
vite.config.ts
client/src/lib/calculator_logic.ts → client/src/core/calculator/calculatorLogic.ts (rename)
```

---

## Подготовка к следующим этапам

- **Склад Джамбов.** Модель `Jumbo` хранит поля учёта и аналитики: номер
  складского учёта, код материала, ширина, начальная намотка, текущий остаток,
  общий использованный метраж, полезная площадь, накопленный брак, накопленные
  технологические остатки, коэффициент использования, даты поступления / начала
  / окончания использования, статус.
- **Инкрементальный учёт.** Накопительные значения хранятся прямо в записи
  Джамба, а модель `JumboOperation` фиксирует дельты каждой операции. Это
  заложено так, чтобы после каждой операции остаток и показатели обновлялись
  инкрементально, а не пересчитывались по всей истории.
- **Статусы.** `JumboStatus` (На складе / В работе / Подлежит списанию / Архив)
  с цветовой схемой (обычный / жёлтый / красный / серый) через `StatusBadge`.
- **Аналитика (KPI).** Подготовлены модели `MaterialStatistics`,
  `MachineStatistics`, `OperatorStatistics`, `WasteStatistics`,
  `ProductionStatistics` (структура без расчётов).
- **Отчёты.** `ReportService` — интерфейс + запись запроса без генерации PDF.
- **Email.** `EmailService` — API определён, реализация появится позже.
- **Хранение.** `Repository`-протокол и заменяемый `KeyValueStore` позволяют
  перейти на другое хранилище (сервер / IndexedDB / SwiftData-эквивалент) без
  изменений в ViewModel и View.
