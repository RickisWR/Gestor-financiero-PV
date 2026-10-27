import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign } from 'hono/jwt'
import { PDFDocument, StandardFonts } from 'pdf-lib'

// Definición de variables de entorno (Cloudflare Bindings)
type Bindings = {
  DB: any // Conexión a la base de datos D1
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ===================================================================
// == MIDDLEWARES GLOBALES
// ===================================================================
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/', (c) => c.text('API Gestor Financiero Puente Viejo - En línea'))

// ===================================================================
// == MÓDULO 1: AUTENTICACIÓN
// ===================================================================
app.post('/api/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) return c.json({ error: 'Faltan credenciales' }, 400)

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM usuarios WHERE username = ?'
    ).bind(username).all()

    const user = results[0]

    if (!user || user.password !== password) {
      return c.json({ error: 'Usuario o contraseña incorrectos' }, 401)
    }

    const secret = c.env.JWT_SECRET || 'secreto-super-seguro-puente-viejo-2026'

    const payload = {
      id: user.id,
      username: user.username,
      rol: user.rol,
      jefe_id: user.jefe_id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
    }

    const token = await sign(payload, secret)

    return c.json({
      token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
        jefe_id: user.jefe_id
      }
    })
  } catch (error) {
    return c.json({ error: 'Error interno del servidor en login' }, 500)
  }
})

// ===================================================================
// == MÓDULO 2: USUARIOS
// ===================================================================
app.get('/api/usuarios', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, nombre, username, rol, jefe_id FROM usuarios').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Error al obtener usuarios' }, 500)
  }
})

app.post('/api/usuarios', async (c) => {
  try {
    const { nombre, username, password, rol, jefe_id } = await c.req.json()
    await c.env.DB.prepare(
      'INSERT INTO usuarios (nombre, username, password, rol, jefe_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(nombre, username, password, rol, jefe_id || null).run()
    return c.json({ mensaje: 'Usuario creado exitosamente' }, 201)
  } catch (error) {
    return c.json({ error: 'Error al crear usuario' }, 500)
  }
})

app.put('/api/usuarios/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { nombre, username, rol, jefe_id, password } = await c.req.json()

    if (password) {
      await c.env.DB.prepare('UPDATE usuarios SET nombre = ?, username = ?, rol = ?, jefe_id = ?, password = ? WHERE id = ?')
        .bind(nombre, username, rol, jefe_id || null, password, id).run()
    } else {
      await c.env.DB.prepare('UPDATE usuarios SET nombre = ?, username = ?, rol = ?, jefe_id = ? WHERE id = ?')
        .bind(nombre, username, rol, jefe_id || null, id).run()
    }
    return c.json({ mensaje: 'Usuario actualizado correctamente' })
  } catch (error) {
    return c.json({ error: 'Error al actualizar el usuario' }, 500)
  }
})

app.delete('/api/usuarios/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id).run()
    return c.json({ mensaje: 'Usuario eliminado correctamente' })
  } catch (error) {
    return c.json({ error: 'Error al eliminar el usuario' }, 500)
  }
})

// ===================================================================
// == MÓDULO 3: CUENTAS POR PAGAR
// ===================================================================
app.get('/api/cuentas', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM cuentas ORDER BY id DESC').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Error al obtener las cuentas' }, 500)
  }
})

app.post('/api/cuentas', async (c) => {
  try {
    const { proveedor, fecha_credito, fecha_limite, monto_total, monto_abonado, estado } = await c.req.json()
    await c.env.DB.prepare(
      'INSERT INTO cuentas (proveedor, fecha_credito, fecha_limite, monto_total, monto_abonado, estado) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(proveedor, fecha_credito, fecha_limite || null, monto_total, monto_abonado || 0, estado || 'Pendiente').run()
    return c.json({ mensaje: 'Cuenta registrada exitosamente' }, 201)
  } catch (error) {
    return c.json({ error: 'Error al registrar la cuenta' }, 500)
  }
})

app.put('/api/cuentas/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { proveedor, fecha_credito, fecha_limite, monto_total, monto_abonado, estado } = await c.req.json()
    await c.env.DB.prepare(
      'UPDATE cuentas SET proveedor = ?, fecha_credito = ?, fecha_limite = ?, monto_total = ?, monto_abonado = ?, estado = ? WHERE id = ?'
    ).bind(proveedor, fecha_credito, fecha_limite || null, monto_total, monto_abonado, estado, id).run()
    return c.json({ mensaje: 'Cuenta actualizada' })
  } catch (error) {
    return c.json({ error: 'Error al actualizar la cuenta' }, 500)
  }
})

app.delete('/api/cuentas/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM cuentas WHERE id = ?').bind(id).run()
    return c.json({ mensaje: 'Cuenta eliminada' })
  } catch (error) {
    return c.json({ error: 'Error al eliminar la cuenta' }, 500)
  }
})

// ===================================================================
// == MÓDULO 4: MOVIMIENTOS
// ===================================================================
app.get('/api/movimientos', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM movimientos ORDER BY id DESC').all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Error al obtener los movimientos' }, 500)
  }
})

app.post('/api/movimientos', async (c) => {
  try {
    const { fecha, concepto, tipo, monto, metodo, clasificacion, sucursal, comentario, cuenta_id } = await c.req.json()
    await c.env.DB.prepare(
      'INSERT INTO movimientos (fecha, concepto, tipo, monto, metodo, clasificacion, sucursal, comentario, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(fecha, concepto, tipo, monto, metodo, clasificacion || null, sucursal || null, comentario || null, cuenta_id || null).run()
    return c.json({ mensaje: 'Movimiento registrado' }, 201)
  } catch (error) {
    return c.json({ error: 'Error al registrar el movimiento' }, 500)
  }
})

app.put('/api/movimientos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { fecha, concepto, tipo, monto, metodo, clasificacion, sucursal, comentario, cuenta_id } = await c.req.json()
    await c.env.DB.prepare(
      'UPDATE movimientos SET fecha = ?, concepto = ?, tipo = ?, monto = ?, metodo = ?, clasificacion = ?, sucursal = ?, comentario = ?, cuenta_id = ? WHERE id = ?'
    ).bind(fecha, concepto, tipo, monto, metodo, clasificacion || null, sucursal || null, comentario || null, cuenta_id || null, id).run()
    return c.json({ mensaje: 'Movimiento actualizado' })
  } catch (error) {
    return c.json({ error: 'Error al actualizar el movimiento' }, 500)
  }
})

app.delete('/api/movimientos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM movimientos WHERE id = ?').bind(id).run()
    return c.json({ mensaje: 'Movimiento eliminado' })
  } catch (error) {
    return c.json({ error: 'Error al eliminar el movimiento' }, 500)
  }
})

// ===================================================================
// == MÓDULO 5: EXPORTACIONES (EXCEL Y PDF)
// ===================================================================

// --- EXPORTAR EXCEL (Formato CSV) ---
app.get('/api/exportar/excel', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM movimientos ORDER BY fecha DESC').all()
    let csv = 'ID,Fecha,Concepto,Tipo,Monto,Metodo,Clasificacion\n'
    results.forEach((row: any) => {
      const conceptoLimpio = row.concepto ? row.concepto.replace(/"/g, '""') : ''
      csv += `${row.id},${row.fecha},"${conceptoLimpio}",${row.tipo},${row.monto},${row.metodo},${row.clasificacion || 'N/A'}\n`
    })
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Reporte_Flujo.csv"'
      }
    })
  } catch (error) {
    return c.json({ error: 'Error al generar Excel' }, 500)
  }
})

app.get('/api/exportar/cuentas/excel', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM cuentas ORDER BY fecha_credito DESC').all()
    let csv = 'ID,Proveedor,Fecha Credito,Fecha Limite,Monto Total,Monto Abonado,Estado\n'
    results.forEach((row: any) => {
      const provLimpio = row.proveedor ? row.proveedor.replace(/"/g, '""') : ''
      csv += `${row.id},"${provLimpio}",${row.fecha_credito},${row.fecha_limite || 'N/A'},${row.monto_total},${row.monto_abonado},${row.estado}\n`
    })
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Reporte_Cuentas.csv"'
      }
    })
  } catch (error) {
    return c.json({ error: 'Error al generar Excel de cuentas' }, 500)
  }
})

// --- EXPORTAR PDF (Usando pdf-lib) ---
app.get('/api/exportar/pdf', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM movimientos ORDER BY fecha DESC').all()

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([600, 800])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    page.drawText('Reporte de Flujo Financiero', { x: 50, y: 750, size: 18, font: fontBold })
    let y = 700
    page.drawText('Fecha          Concepto                     Monto        Tipo', { x: 50, y, size: 12, font: fontBold })
    y -= 25

    results.forEach((row: any) => {
      if (y < 50) {
        page = pdfDoc.addPage([600, 800])
        y = 750
      }
      const conceptoLimpio = row.concepto ? row.concepto.substring(0, 20) : ''
      const texto = `${row.fecha} | ${conceptoLimpio.padEnd(20, ' ')} | $${row.monto} | ${row.tipo}`
      page.drawText(texto, { x: 50, y, size: 10, font })
      y -= 20
    })

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Reporte_Flujo.pdf"'
      }
    })
  } catch (error) {
    return c.json({ error: 'Error al generar PDF' }, 500)
  }
})

app.get('/api/exportar/cuentas/pdf', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM cuentas ORDER BY fecha_credito DESC').all()

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([600, 800])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    page.drawText('Reporte de Cuentas por Pagar', { x: 50, y: 750, size: 18, font: fontBold })
    let y = 700
    page.drawText('Proveedor                    Monto Total    Abonado     Estado', { x: 50, y, size: 12, font: fontBold })
    y -= 25

    results.forEach((row: any) => {
      if (y < 50) {
        page = pdfDoc.addPage([600, 800])
        y = 750
      }
      const provLimpio = row.proveedor ? row.proveedor.substring(0, 22) : ''
      const texto = `${provLimpio.padEnd(22, ' ')} | $${row.monto_total} | $${row.monto_abonado} | ${row.estado}`
      page.drawText(texto, { x: 50, y, size: 10, font })
      y -= 20
    })

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Reporte_Cuentas.pdf"'
      }
    })
  } catch (error) {
    return c.json({ error: 'Error al generar PDF de cuentas' }, 500)
  }
})

export default app