# 🛠️ Comandos Útiles - EVConnect

## 📦 Gestión de Dependencias

```bash
# Instalar todas las dependencias
npm install

# Verificar dependencias desactualizadas
npm outdated

# Actualizar dependencias
npm update

# Auditar seguridad
npm audit

# Arreglar vulnerabilidades automáticamente
npm audit fix
```

## 🚀 Ejecución

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Modo producción
npm start

# Con variables de entorno específicas
NODE_ENV=production PORT=5000 npm start
```

## 🧪 Testing (preparado para implementar)

```bash
# Ejecutar tests (por implementar)
npm test

# Coverage (por implementar)
npm run test:coverage
```

## 🗃️ Base de Datos

```bash
# Verificar conexión a base de datos
node -e "require('./src/db/sequelize').testConnection()"

# Sincronizar modelos (cuidado en producción)
node -e "require('./src/db/sequelize').sequelize.sync({ alter: true })"

# Crear tablas (si no existen)
node -e "require('./src/db/sequelize').sequelize.sync()"
```

## 🔍 Debugging

```bash
# Con inspector de Node.js
node --inspect src/index.js

# Con inspector y breakpoint al inicio
node --inspect-brk src/index.js

# Ver logs detallados de Sequelize
NODE_ENV=development npm start
```

## 🔐 JWT y Seguridad

```bash
# Generar secret aleatorio para JWT
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Verificar hash de contraseña
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(console.log)"
```

## 📊 Información del Proyecto

```bash
# Ver versión de Node.js
node --version

# Ver información del proyecto
npm list --depth=0

# Ver tamaño de node_modules
du -sh node_modules/ # Linux/Mac
# o
Get-ChildItem node_modules -Recurse | Measure-Object -Property Length -Sum # PowerShell

# Listar scripts disponibles
npm run
```

## 🌐 WebSocket Testing

```bash
# Con wscat (instalar globalmente: npm i -g wscat)
wscat -c ws://localhost:4000/ws

# Enviar mensaje de prueba
# Después de conectar, escribe:
# {"type": "ping", "data": "test"}
```

## 🚢 Despliegue

```bash
# Construir para producción (no necesario, pero puedes optimizar)
# El proyecto ya usa JavaScript directo

# Iniciar en producción
NODE_ENV=production npm start

# Con PM2 (recomendado para producción)
npm install -g pm2
pm2 start src/index.js --name evconnect
pm2 logs evconnect
pm2 restart evconnect
pm2 stop evconnect
```

## 🧹 Limpieza

```bash
# Limpiar node_modules
rm -rf node_modules # Linux/Mac
Remove-Item -Recurse -Force node_modules # PowerShell

# Limpiar caché de npm
npm cache clean --force

# Reinstalar desde cero
rm -rf node_modules package-lock.json && npm install
```

## 📝 Git (recomendaciones)

```bash
# Ignorar cambios en .env
git update-index --assume-unchanged .env

# Volver a trackear .env
git update-index --no-assume-unchanged .env

# Ver archivos ignorados
git status --ignored
```

## 🔄 Migración desde TypeScript

Si necesitas revertir o comparar:

```bash
# Ver diferencias con rama anterior
git diff HEAD~1

# Ver archivos eliminados
git log --diff-filter=D --summary

# Restaurar archivo específico de commit anterior
git checkout HEAD~1 -- path/to/file
```

## 📈 Monitoreo y Performance

```bash
# Ver uso de memoria
node --trace-warnings src/index.js

# Profiling
node --prof src/index.js
# Después de ejecutar:
node --prof-process isolate-*-v8.log > processed.txt

# Heap snapshot (para memory leaks)
node --inspect src/index.js
# Luego usa Chrome DevTools
```

## 🐳 Docker (por implementar)

```dockerfile
# Dockerfile básico sugerido
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 4000
CMD ["npm", "start"]
```

```bash
# Construir imagen
docker build -t evconnect .

# Ejecutar contenedor
docker run -p 4000:4000 --env-file .env evconnect
```

## 🔧 Troubleshooting

```bash
# Si hay problemas con módulos nativos
npm rebuild

# Si hay conflictos de versiones
npm install --legacy-peer-deps

# Verificar que todos los imports funcionen
node -c src/index.js # Check syntax

# Ver variables de entorno cargadas
node -e "require('dotenv').config(); console.log(process.env)"
```

## 📚 Swagger API Docs

```bash
# Acceder a documentación interactiva
# Navega a: http://localhost:4000/api/docs

# Ver spec en JSON
curl http://localhost:4000/api/docs.json
```

---

**Tip**: Guarda estos comandos como scripts en `package.json` para acceso rápido.
