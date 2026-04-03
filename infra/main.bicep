targetScope = 'subscription'

// ── Parameters ────────────────────────────────────────────────────────────────

@description('Azure region for the resource group and all resources. Must be a region supported by Microsoft.Web/staticSites.')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia'])
param location string = 'westeurope'

@description('Base name used for resource naming across the stack.')
param appName string = 'earnesty'

@description('Name of the resource group to create.')
param resourceGroupName string = 'rg-${appName}'

@description('Pricing tier for the Azure Static Web App.')
@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Standard'

@description('Entra ID Application (client) ID.')
param entraClientId string

@description('Entra ID client secret.')
@secure()
param entraClientSecret string

@description('Entra ID Directory (tenant) ID.')
param entraTenantId string

@description('Sanity API token for server-side write operations.')
@secure()
param sanityToken string

@description('Sanity project ID.')
param sanityProjectId string

@description('Sanity dataset name.')
param sanityDataset string

// ── Resource group ────────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    application: appName
    managedBy: 'bicep'
  }
}

// ── Static Web App ────────────────────────────────────────────────────────────

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app'
  scope: rg
  params: {
    name: 'stapp-${appName}'
    location: location
    sku: staticWebAppSku
    entraClientId: entraClientId
    entraClientSecret: entraClientSecret
    entraTenantId: entraTenantId
    sanityToken: sanityToken
    sanityProjectId: sanityProjectId
    sanityDataset: sanityDataset
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Default hostname of the Static Web App.')
output staticWebAppUrl string = staticWebApp.outputs.url

@description('Name of the Static Web App resource.')
output staticWebAppName string = staticWebApp.outputs.name

@description('Resource ID of the Static Web App.')
output staticWebAppId string = staticWebApp.outputs.id
