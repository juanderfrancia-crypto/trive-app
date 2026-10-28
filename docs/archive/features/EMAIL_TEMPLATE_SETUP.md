# 📧 Configuración del Correo de Verificación Personalizado

## Características del Nuevo Template

✅ **Branding de TRIVE**
- Logo y tagline en el header
- Colores verde (#22c55e) identidad corporativa
- Diseño profesional y moderno

✅ **Mejor Experiencia del Usuario**
- Mensaje de bienvenida personalizado
- Código con gran tamaño para fácil lectura
- Nota de seguridad para proteger al usuario
- Instrucciones claras en español

✅ **Responsive & Compatible**
- Funciona en todos los clientes de correo
- Optimizado para dispositivos móviles
- Colores y tipografía profesionales

---

## 🔧 Cómo Implementarlo en Supabase

### Paso 1: Acceder al Dashboard de Supabase
1. Abre [supabase.com](https://supabase.com) y accede a tu proyecto TRIVE
2. En el menú izquierdo, ve a **Authentication** (Autenticación)
3. Haz clic en **Email Templates** (Plantillas de Correo)

### Paso 2: Seleccionar la Plantilla de Verificación
- Busca y haz clic en **Confirm signup** (o "Confirmar registro")
- Esta es la plantilla que se envía cuando un usuario se registra

### Paso 3: Reemplazar el Contenido HTML
1. Copia todo el contenido del archivo `EMAIL_VERIFICATION_TEMPLATE.html`
2. En Supabase, en el editor de plantilla:
   - **Borra** todo el contenido actual
   - **Pega** el nuevo template HTML que copiaste
3. Haz clic en **Save** (Guardar)

### Paso 4: Probar la Plantilla
1. En tu aplicación TRIVE, realiza un nuevo registro con un correo de prueba
2. Revisa tu bandeja de entrada
3. Verifica que el correo llegue con el nuevo diseño

---

## 📋 Qué Verificar en el Correo

- ✅ Logo "TRIVE" con tagline
- ✅ Código de verificación en ese desplegado grande
- ✅ Tiempo de expiración (1 hora)
- ✅ Instrucciones claras en español
- ✅ Nota de seguridad
- ✅ Footer con información de TRIVE

---

## 🎨 Personalización Adicional

Si quieres hacer más cambios, puedes editar:

### Cambiar Colores
En el archivo HTML, busca `#22c55e` (verde TRIVE) y cámbialo:
```css
#22c55e → Tu color preferido en formato hexadecimal
```

### Cambiar Enlace
En el footer, busca `https://trive.app` y reemplázalo con tu URL:
```html
href="https://tudominio.com"
```

### Cambiar Mensaje
En la sección de contenido, reemplaza cualquier texto para adaptarlo más:
- "Bienvenido a TRIVE" 
- "Viajes compartidos, sin complicaciones"
- Mensajes de instrucción

### Agregar Logo
Si tienes un logo PNG/SVG, puedes reemplazar el texto "TRIVE" con:
```html
<img src="[URL_DEL_LOGO]" alt="TRIVE" style="height: 50px;">
```

---

## ⚠️ Notas Importantes

1. **Variables Dinámicas**: `{{ .Token }}` es reemplazado automáticamente por Supabase con el código real
2. **No modifiques** la variable `{{ .Token }}` 
3. **Prueba en diferentes clientes**: Gmail, Outlook, Apple Mail, etc.
4. **El correo ya está en español**, perfecto para tu audiencia

---

## 📱 Después de Actualizar

Una vez guardado en Supabase:
- Todos los nuevos registros recibirán el correo personalizado
- Los registros anteriores no se ven afectados
- El cambio es inmediato, sin reiniciar la app

---

## 🚀 Próximos Pasos Opcionales

Considera personalizar también estos correos en Supabase:
- **Recovery (Recuperar contraseña)**: Para usuarios que olviden su password
- **Invite**: Si tienes un sistema de invitaciones

¿Necesitas ayuda con alguno de estos?
