interface TrackEvent {
  trackEvent(
    eventName: string,
    eventProperties?: Record<string, string | string[]>,
  ): Promise<unknown>;
}

interface TrackPageView {
  trackPageView(path: string): Promise<unknown>;
}

interface TrackError {
  trackError(error: Error): Promise<unknown>;
}

interface TrackUsage {
  trackUsage(usage: string): Promise<unknown>;
}

interface TrackPerformance {
  trackPerformance(performance: string): Promise<unknown>;
}

interface TrackFeatureUsage {
  trackFeatureUsage(feature: string): Promise<unknown>;
}

interface TrackAgent {
  trackAgent(agent: string): Promise<unknown>;
}

interface Identify {
  identify(userId: string, traits?: Record<string, string>): Promise<unknown>;
}

interface TelemetryProviderManager {
  addProvider(provider: string, config: object): Promise<unknown>;

  removeProvider(provider: string): void;
}

export interface TelemetryService
  extends
    TrackPageView,
    TrackEvent,
    TrackError,
    TrackUsage,
    TrackPerformance,
    TrackFeatureUsage,
    TrackAgent,
    Identify {
  initialize(): Promise<unknown>;
  ready(): Promise<unknown>;
}

export type TelemetryProviderFactory<Config extends object> = (
  config?: Config,
) => TelemetryService;

export interface CreateTelemetryManagerOptions<
  T extends string,
  Config extends object,
> {
  providers: Record<T, TelemetryProviderFactory<Config>>;
}

export interface TelemetryManager
  extends
    TrackPageView,
    TrackEvent,
    Identify,
    TrackError,
    TrackUsage,
    TrackPerformance,
    TrackFeatureUsage,
    TrackAgent,
    TelemetryProviderManager {}
