# CHANGELOG

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
