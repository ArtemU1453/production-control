import { AppColors } from "./AppColors";
import { AppTypography } from "./AppTypography";
import { AppSpacing } from "./AppSpacing";
import { AppRadius } from "./AppRadius";
import { AppShadow } from "./AppShadow";
import { AppAnimation } from "./AppAnimation";
import { AppIcons } from "./AppIcons";
import { AppMetrics } from "./AppMetrics";
import { AppButtonStyle } from "./AppButtonStyle";
import { AppCardStyle } from "./AppCardStyle";
import { AppInputStyle } from "./AppInputStyle";
import { AppProgressStyle } from "./AppProgressStyle";
import { AppBadgeStyle } from "./AppBadgeStyle";
import { AppCharts } from "./AppCharts";
import { AppMaterials } from "./AppMaterials";

/**
 * AppTheme — the single aggregate entry point to the Design System. Every design
 * decision (colour, type, spacing, radius, shadow, motion, iconography, metrics
 * and component styles) is reachable from here, so feature code depends on one
 * catalog of tokens rather than scattered constants.
 *
 * Supports Light and Dark appearances automatically (tokens are backed by CSS
 * custom properties) and honours Reduce Motion / Dynamic Type via the tokens'
 * rem sizing and global MotionConfig.
 */
export const AppTheme = {
  colors: AppColors,
  typography: AppTypography,
  spacing: AppSpacing,
  radius: AppRadius,
  shadow: AppShadow,
  animation: AppAnimation,
  icons: AppIcons,
  metrics: AppMetrics,
  button: AppButtonStyle,
  card: AppCardStyle,
  input: AppInputStyle,
  progress: AppProgressStyle,
  badge: AppBadgeStyle,
  charts: AppCharts,
  materials: AppMaterials,
} as const;

export type AppThemeTokens = typeof AppTheme;
