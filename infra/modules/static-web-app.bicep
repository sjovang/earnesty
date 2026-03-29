// ── Parameters ────────────────────────────────────────────────────────────────

@description('Name for the Static Web App resource.')
param name string

@description('Azure region.')
param location string

@description('Pricing tier.')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

// ── Resource ──────────────────────────────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Default HTTPS hostname of the app.')
output url string = 'https://${staticWebApp.properties.defaultHostname}'

@description('Resource name.')
output name string = staticWebApp.name

@description('Resource ID.')
output id string = staticWebApp.id
