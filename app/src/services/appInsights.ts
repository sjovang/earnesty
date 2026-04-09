import { ApplicationInsights } from '@microsoft/applicationinsights-web'

let appInsights: ApplicationInsights | null = null

const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING as string | undefined

export function loadAppInsights(): void {
  if (!connectionString) return

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
    },
  })
  appInsights.loadAppInsights()
  appInsights.trackPageView()
}

export function trackException(error: Error, properties?: Record<string, string>): void {
  appInsights?.trackException({ exception: error, properties })
}

export function trackEvent(name: string, properties?: Record<string, string>): void {
  appInsights?.trackEvent({ name, properties })
}
