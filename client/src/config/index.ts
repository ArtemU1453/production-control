/**
 * config — centralised application configuration: environment, feature flags and
 * app metadata. Import from `@/config` so configuration comes from one place.
 */
export { AppEnvironment, appEnvironment, isProduction, isDevelopment } from "./AppEnvironment";
export { featureFlags, type FeatureFlag, type FeatureFlagSet } from "./FeatureFlags";
export { appConfig, type AppConfig } from "./AppConfig";
