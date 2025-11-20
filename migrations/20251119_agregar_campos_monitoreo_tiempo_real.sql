-- ============================================
-- Migración: Agregar campos para monitoreo en tiempo real
-- Base de datos: evconnect
-- Tabla: sesion_carga
-- Fecha: 2025-11-19
-- Motor: SQL Server
-- ============================================

-- Agregar nuevos campos a la tabla sesion_carga
ALTER TABLE sesion_carga 
ADD duracion_estimada_min INT NULL,
    tiempo_transcurrido_min DECIMAL(10,2) NULL DEFAULT 0,
    monto_por_minuto DECIMAL(10,2) NULL;

-- Agregar comentarios extendidos (SQL Server)
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Duración en minutos que el usuario solicitó inicialmente',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'sesion_carga',
    @level2type = N'COLUMN', @level2name = N'duracion_estimada_min';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Tiempo real transcurrido en minutos, actualizado cada minuto',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'sesion_carga',
    @level2type = N'COLUMN', @level2name = N'tiempo_transcurrido_min';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Tarifa por minuto aplicada en esta sesión (copia histórica de la tarifa)',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'sesion_carga',
    @level2type = N'COLUMN', @level2name = N'monto_por_minuto';

-- Verificar que las columnas se agregaron correctamente
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'sesion_carga'
  AND COLUMN_NAME IN ('duracion_estimada_min', 'tiempo_transcurrido_min', 'monto_por_minuto');

-- ============================================
-- Índices recomendados para mejorar rendimiento
-- ============================================

-- Índice para buscar sesiones activas rápidamente (usado por SessionMonitor)
CREATE NONCLUSTERED INDEX idx_sesion_estado_activo 
ON sesion_carga(estado)
WHERE estado = 'activa';

-- Índice compuesto para buscar sesiones de un usuario por estado
CREATE NONCLUSTERED INDEX idx_sesion_usuario_estado 
ON sesion_carga(id_usuario, estado);

-- Índice para buscar cargadores por estado
CREATE NONCLUSTERED INDEX idx_cargador_estado 
ON cargador(estado);

-- Índice para buscar tarifas vigentes por estación y tipo
CREATE NONCLUSTERED INDEX idx_tarifa_vigencia 
ON tarifa(id_estacion, tipo_carga, fecha_inicio_vigencia, fecha_fin_vigencia);

-- ============================================
-- Verificación de datos existentes
-- ============================================

-- Actualizar sesiones existentes con valores por defecto si es necesario
UPDATE sesion_carga 
SET tiempo_transcurrido_min = 0 
WHERE tiempo_transcurrido_min IS NULL;

-- Calcular duracion_estimada_min para sesiones existentes basándose en monto_estimado
-- (Esto es opcional, solo si hay sesiones sin finalizar)
UPDATE s
SET s.duracion_estimada_min = CEILING(s.monto_estimado / t.costo_tiempo_min),
    s.monto_por_minuto = t.costo_tiempo_min
FROM sesion_carga s
INNER JOIN tarifa t ON s.id_tarifa = t.id_tarifa
WHERE s.duracion_estimada_min IS NULL 
  AND s.estado IN ('activa', 'pendiente')
  AND t.costo_tiempo_min IS NOT NULL
  AND t.costo_tiempo_min > 0;

-- ============================================
-- Consultas de verificación
-- ============================================

-- Ver estructura actualizada de la tabla
SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'sesion_carga'
ORDER BY c.ORDINAL_POSITION;

-- Ver índices de la tabla
SELECT 
    i.name AS index_name,
    i.type_desc,
    i.is_unique,
    i.is_primary_key,
    COL_NAME(ic.object_id, ic.column_id) AS column_name
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('sesion_carga')
ORDER BY i.name, ic.key_ordinal;

-- Ver sesiones activas con los nuevos campos
SELECT 
    id_sesion,
    id_usuario,
    id_cargador,
    estado,
    duracion_estimada_min,
    tiempo_transcurrido_min,
    monto_por_minuto,
    monto_estimado,
    fecha_inicio
FROM sesion_carga
WHERE estado = 'activa';

-- ============================================
-- Rollback (en caso de ser necesario)
-- ============================================

-- ADVERTENCIA: Solo ejecutar si necesitas revertir los cambios
-- Descomentar las siguientes líneas si es necesario hacer rollback

/*
DROP INDEX idx_sesion_estado_activo ON sesion_carga;
DROP INDEX idx_sesion_usuario_estado ON sesion_carga;
DROP INDEX idx_cargador_estado ON cargador;
DROP INDEX idx_tarifa_vigencia ON tarifa;

ALTER TABLE sesion_carga 
DROP COLUMN duracion_estimada_min,
             tiempo_transcurrido_min,
             monto_por_minuto;
*/

-- ============================================
-- Fin de migración
-- ============================================
