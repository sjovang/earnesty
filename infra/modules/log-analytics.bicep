// ── Parameters ────────────────────────────────────────────────────────────────

@description('Name for the Log Analytics workspace resource.')
param name string

@description('Azure region.')
param location string

@description('Number of days to retain data.')
param retentionInDays int = 30

// ── Resource ──────────────────────────────────────────────────────────────────

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: name
  location: location
  properties: {
    retentionInDays: retentionInDays
    sku: {
      name: 'PerGB2018'
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Resource ID of the Log Analytics workspace.')
output id string = workspace.id

@description('Customer ID (workspace ID) of the Log Analytics workspace.')
output workspaceId string = workspace.properties.customerId
