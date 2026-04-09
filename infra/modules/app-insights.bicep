// ── Parameters ────────────────────────────────────────────────────────────────

@description('Name for the Application Insights resource.')
param name string

@description('Azure region.')
param location string

@description('Resource ID of the Log Analytics workspace to link to.')
param logAnalyticsWorkspaceId string

// ── Resource ──────────────────────────────────────────────────────────────────

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    RetentionInDays: 30
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Application Insights connection string.')
output connectionString string = appInsights.properties.ConnectionString

@description('Application Insights instrumentation key.')
output instrumentationKey string = appInsights.properties.InstrumentationKey

@description('Resource ID.')
output id string = appInsights.id
