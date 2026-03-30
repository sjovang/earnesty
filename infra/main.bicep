targetScope = 'subscription'

// ── Parameters ────────────────────────────────────────────────────────────────

@description('Azure region for the resource group and all resources.')
param location string = 'swedencentral'

@description('Base name used for resource naming across the stack.')
param appName string = 'earnesty'

@description('Name of the resource group to create.')
param resourceGroupName string = 'rg-${appName}'

@description('Pricing tier for the Azure Static Web App.')
@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

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
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Default hostname of the Static Web App.')
output staticWebAppUrl string = staticWebApp.outputs.url

@description('Name of the Static Web App resource.')
output staticWebAppName string = staticWebApp.outputs.name

@description('Resource ID of the Static Web App.')
output staticWebAppId string = staticWebApp.outputs.id
