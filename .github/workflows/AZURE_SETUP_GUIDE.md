# Guía de Configuración de Azure para GitHub Actions

## Error: "No subscriptions found for ***"

Este error indica que el Service Principal configurado no tiene acceso a la suscripción de Azure.

## Solución Recomendada: Reconfigurar desde Azure Portal

La forma más fácil de resolver esto es reconfigurar la conexión directamente desde Azure Portal:

### Paso 1: Configurar Deployment Center en Azure

1. Ve a **Azure Portal** (https://portal.azure.com)
2. Busca tu App Service: **klinia-api**
3. En el menú izquierdo, ve a **Deployment Center**
4. En **Source**, selecciona **GitHub**
5. Haz clic en **Authorize** y autoriza a Azure a acceder a tu cuenta de GitHub
6. Selecciona:
   - **Organization**: Tu organización de GitHub
   - **Repository**: Tu repositorio (klinia-platform)
   - **Branch**: `main`
   - **Build Provider**: GitHub Actions
7. Haz clic en **Save**

Azure generará automáticamente:
- Los secrets necesarios en GitHub
- Un Service Principal con los permisos correctos
- La configuración de OIDC (OpenID Connect)

### Paso 2: Verificar los Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Verifica que existan estos secrets (Azure los crea automáticamente):
   - `AZUREAPPSERVICE_CLIENTID_...`
   - `AZUREAPPSERVICE_TENANTID_...`
   - `AZUREAPPSERVICE_SUBSCRIPTIONID_...`

### Paso 3: Verificar Permisos del Service Principal (si es necesario)

Si después de reconfigurar sigues teniendo problemas:

1. En Azure Portal, ve a **Azure Active Directory** → **App registrations**
2. Busca la aplicación con el `client-id` de tus secrets
3. Anota el **Object ID** de la aplicación

4. Ve a **Subscriptions** → Selecciona tu suscripción → **Access control (IAM)**
5. Haz clic en **Add** → **Add role assignment**
6. Selecciona el rol **Contributor** o **Website Contributor**
7. En **Assign access to**, selecciona **User, group, or service principal**
8. Busca por el Object ID que anotaste y selecciona la aplicación
9. Haz clic en **Save**

## Alternativa: Usar Service Principal con Secret

Si OIDC no funciona, puedes crear un Service Principal manualmente y usar un secret:

### Crear Service Principal

```bash
az login
az account set --subscription "TU-SUBSCRIPTION-ID"

az ad sp create-for-rbac --name "github-actions-klinia-api" \
  --role contributor \
  --scopes /subscriptions/TU-SUBSCRIPTION-ID/resourceGroups/TU-RESOURCE-GROUP \
  --sdk-auth
```

Esto generará un JSON con las credenciales. Guarda este JSON completo como un secret en GitHub llamado `AZURE_CREDENTIALS`.

Luego actualiza el workflow:

```yaml
- name: Login to Azure
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

## Verificar la Configuración

Para verificar que todo está correcto, puedes ejecutar este comando localmente:

```bash
az login --service-principal \
  -u <client-id-from-secrets> \
  -p <client-secret-if-using-secret-auth> \
  --tenant <tenant-id-from-secrets>

az account list --output table
```

Deberías ver tu suscripción listada.

