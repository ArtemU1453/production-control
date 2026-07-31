# 14. Design System и библиотека UI-компонентов

## Design System (`client/src/designsystem/`)

Единый каталог дизайн-токенов уровня Apple. Экраны и компоненты обращаются к
токенам, а не к «магическим» значениям или прямым системным цветам. Токены
подкреплены CSS-переменными (`index.css`), поэтому автоматически адаптируются к
Light/Dark и уважают Reduce Motion / Dynamic Type.

| Модуль | Назначение |
| --- | --- |
| `AppTheme` | агрегат всех токенов — единая точка входа |
| `AppColors` | семантические цвета + статусная палитра Apple + цвета статусов Джамба |
| `AppTypography` | текстовые стили Apple (Large Title…Caption) на `rem` (Dynamic Type) |
| `AppSpacing` | 8-point сетка (px + Tailwind-классы) |
| `AppRadius` | радиусы по ролям (control/button/card/pill) |
| `AppShadow` | уровни elevation |
| `AppAnimation` | пресеты движения `fast/normal/slow/spring` + entrance/press |
| `AppIcons` | семантический набор иконок |
| `AppMetrics` | метрики компонентов (hit-area 44, кольца, полосы, бары) |
| `AppButtonStyle`/`AppCardStyle`/`AppInputStyle`/`AppProgressStyle`/`AppBadgeStyle` | стиль-дескрипторы |
| `AppCharts` | палитра и размеры графиков |
| `AppMaterials` | стеклянные/материальные поверхности |
| `haptics` | семантическая тактильная отдача (`success/warning/impact/selection`) |

**Тактильная отдача** (`haptics`) — best-effort поверх `navigator.vibrate`,
подавляется при отсутствии API и при `prefers-reduced-motion`. Подключена
центрально к слою тостов (успех/ошибка) и к `ConfirmationDialog`, поэтому
значимые действия дают отклик на всех экранах без правок ViewModel.

## Библиотека UI-компонентов (`client/src/components/`)

Презентационные, переиспользуемые компоненты, построенные на токенах Design
System (Card-First). Каждый документирован (назначение/применение/ограничения/
зависимости) в исходном файле.

- **Кнопки:** `PrimaryButton`, `SecondaryButton`, `DangerButton`, `GhostButton`,
  `FloatingButton`.
- **Карточки:** `CardView`/`SectionCard`, `KpiCard`, `StatisticCard`, `MetricCard`,
  `JumboCard` (вертикальная статус-полоса 🟢🔵🟡🔴⚫), `OrderCard`, `MachineCard`,
  `ArchiveCard`, `ReportCard`, `WarningCard`, `PressableCard`.
- **Индикаторы:** `ProgressBar`, `RingProgress`, `MiniChart`, `LoadingSkeleton`,
  `StatusBadge`.
- **Списки/контейнеры:** `AnimatedList` (плавные вставка/удаление/сортировка),
  `ListRow`, `ScreenScaffold`, `SectionHeader`, `InfoRow`, `EmptyState`.
- **Поиск/фильтры:** `SearchBar`, `FilterChip`, `SegmentedControl`.
- **Диалоги/навигация:** `BottomSheet`, `ConfirmationDialog`, `TabBar`.

Компоненты композируют примитивы `components/ui/*` (shadcn) и токены Design
System, без дублирования. Анимации используют только пресеты
`AppAnimation.transition`.

## Статус миграции

Design System и библиотека компонентов **созданы и заморожены как контракт**;
перевод существующих экранов на них выполняется отдельными этапами (Card-First
миграция по экрану). До миграции библиотека — готовый, оттестированный на сборке
набор, не потребляемый экранами напрямую (это не мёртвый код, а плановый слой).
