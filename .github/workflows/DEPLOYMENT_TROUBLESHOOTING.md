# Troubleshooting Azure Deployment en GitHub Actions

## Error: "No subscriptions found"

Este error ocurre cuando el service principal configurado en Azure no tiene acceso a la suscripción especificada.

### Solución 1: Verificar permisos del Service Principal

1. Ve a **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Busca la aplicación con el `client-id` de tus secrets
3. Ve a **API permissions** y verifica que tenga los permisos necesarios
4. Ve a **Azure Portal** → **Subscriptions** → Selecciona tu suscripción → **Access control (IAM)**
5. Busca el service principal y verifica que tenga el rol **Contributor** o **Owner**

### Solución 2: Verificar los Secrets en GitHub

1. Ve a tu repositorio en GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Verifica que estos secrets existan y tengan los valores correctos:
   - `AZUREAPPSERVICE_CLIENTID_DEE2BB94555948AF96416F399BF30A58`
   - `AZUREAPPSERVICE_TENANTID_E6B3FC3D345E4FFF94FCDF44BF56BE1C`
   - `AZUREAPPSERVICE_SUBSCRIPTIONID_879FF65BEF44468BB74DE488EF418291`

### Solución 3: Reconfigurar la conexión de Azure a GitHub

1. Ve a **Azure Portal** → Tu App Service → **Deployment Center**
2. Selecciona **GitHub** como fuente
3. Autentica y selecciona el repositorio
4. Azure generará automáticamente los secrets necesarios en GitHub

### Solución 4: Usar Service Principal con Secret (Alternativa)

Si OIDC no funciona, puedes usar autenticación con service principal y secret:

```yaml
- name: Login to Azure
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

Donde `AZURE_CREDENTIALS` es un JSON con:
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
```

### Verificar la configuración actual

Para verificar qué suscripciones tiene acceso el service principal, puedes ejecutar:

```bash
az login --service-principal \
  -u <client-id> \
  -p <client-secret> \
  --tenant <tenant-id>

az account list --output table
```

