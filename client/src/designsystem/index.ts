/**
 * DesignSystem — the single catalog of design tokens and component-style tokens
 * for the app. Feature code imports from here (`@/designsystem`) so every size,
 * colour, radius, shadow, motion and style comes from one place with no magic
 * numbers. Backed by the CSS custom properties, it adapts to Light/Dark and
 * respects Reduce Motion and Dynamic Type.
 */
export { AppColors, hsl, type AppStatusColor, type JumboStatusColorToken } from "./AppColors";
export { AppTypography, type AppTextStyle } from "./AppTypography";
export { AppSpacing, type AppSpacingStep } from "./AppSpacing";
export { AppRadius, type AppRadiusRole } from "./AppRadius";
export { AppShadow, type AppElevation } from "./AppShadow";
export { AppAnimation, type AppDuration, type AppTransition } from "./AppAnimation";
export { haptics, type HapticKind } from "./haptics";
export { AppIcons, type IconName, type LucideIcon } from "./AppIcons";
export { AppMetrics } from "./AppMetrics";
export { AppButtonStyle, type AppButtonVariant } from "./AppButtonStyle";
export { AppCardStyle } from "./AppCardStyle";
export { AppInputStyle } from "./AppInputStyle";
export { AppProgressStyle } from "./AppProgressStyle";
export { AppBadgeStyle } from "./AppBadgeStyle";
export { AppCharts } from "./AppCharts";
export { AppMaterials } from "./AppMaterials";
export { AppTheme, type AppThemeTokens } from "./AppTheme";
