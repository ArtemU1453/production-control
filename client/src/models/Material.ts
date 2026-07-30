import { MaterialStatus } from "./MaterialStatus";

/**
 * A raw-material grade in the reference book.
 *
 * Domain models in this layer are plain, serializable records: JSON-encodable,
 * carrying a stable `id`, with no behaviour and no UI dependencies. In native
 * terms this maps to a SwiftData `@Model`; here it is persisted through the
 * repository layer over the swappable key-value store.
 */
export interface Material {
  id: string;
  /** Код материала — exactly 8 characters, unique across the reference book. */
  code: string;
  /** Название — display name. */
  name: string;
  /** Производитель — manufacturer. */
  manufacturer: string;
  /** Толщина, мкм — thickness in microns. */
  thicknessMicron: number;
  /** Стандартная ширина, мм — standard web width. */
  standardWidthMm: number;
  /** Описание — free-form description. */
  description: string;
  /** Дата создания (ISO-8601). */
  createdAt: string;
  status: MaterialStatus;
}

/** Required length of a material code. */
export const MATERIAL_CODE_LENGTH = 8;
