// ── Parameters ────────────────────────────────────────────────────────────────

@description('Name for the Static Web App resource.')
param name string

@description('Azure region.')
param location string

@description('Pricing tier.')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

@description('Entra ID Application (client) ID.')
param entraClientId string

@description('Entra ID client secret.')
@secure()
param entraClientSecret string

@description('Entra ID Directory (tenant) ID. Referenced in staticwebapp.config.json openIdIssuer.')
param entraTenantId string

@description('Sanity API token for server-side write operations.')
@secure()
param sanityToken string

@description('Sanity project ID.')
param sanityProjectId string

@description('Sanity dataset name.')
param sanityDataset string

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

resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AZURE_CLIENT_ID: entraClientId
    AZURE_CLIENT_SECRET: entraClientSecret
    AZURE_TENANT_ID: entraTenantId
    SANITY_TOKEN: sanityToken
    SANITY_PROJECT_ID: sanityProjectId
    SANITY_DATASET: sanityDataset
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Default HTTPS hostname of the app.')
output url string = 'https://${staticWebApp.properties.defaultHostname}'

@description('Resource name.')
output name string = staticWebApp.name

@description('Resource ID.')
output id string = staticWebApp.id
