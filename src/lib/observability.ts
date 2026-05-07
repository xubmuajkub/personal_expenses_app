import * as Sentry from '@sentry/react-native';
import { env } from './env';

let initialized = false;

export function initObservability(): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableAutoPerformanceTracing: true,
    sendDefaultPii: false,
    integrations: [Sentry.reactNativeTracingIntegration()],
  });
  initialized = true;
}

export const observability = {
  capture: Sentry.captureException,
  setUser: Sentry.setUser,
};
