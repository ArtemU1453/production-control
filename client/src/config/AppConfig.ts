import { appInfo } from "@/resources/appInfo";
import { appEnvironment, isDevelopment, isProduction, AppEnvironment } from "./AppEnvironment";
import { featureFlags, type FeatureFlagSet } from "./FeatureFlags";

/**
 * AppConfig — the single application configuration object.
 *
 * Purpose: one typed place for environment, feature flags and app metadata, so
 * no module hardcodes build assumptions or scatters "magic" configuration.
 * Usage: `appConfig.isProduction`, `appConfig.flags.cloudSync`,
 * `appConfig.app.version`. Limits: read-only, resolved at build time. Depends
 * on: AppEnvironment, FeatureFlags, appInfo.
 */
export interface AppConfig {
  environment: AppEnvironment;
  isProduction: boolean;
  isDevelopment: boolean;
  flags: Readonly<FeatureFlagSet>;
  app: typeof appInfo;
}

export const appConfig: AppConfig = {
  environment: appEnvironment,
  isProduction,
  isDevelopment,
  flags: featureFlags,
  app: appInfo,
};
