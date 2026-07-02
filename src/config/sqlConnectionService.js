const express = require('express')
const cors = require('cors')
const sql = require('mssql/msnodesqlv8')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173'
  ]
}))

app.use(express.json())

const dbConfig = {
  connectionString:
    'Driver={ODBC Driver 17 for SQL Server};' +
    'Server=PADT109\\SQLEXPRESS;' +
    'Database=QL_KhoaHoc;' +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;'
}

app.get('/api/test-connect', async (req, res) => {
  let pool

  try {
    pool = await sql.connect(dbConfig)

    const result = await pool.request().query(`
      SELECT
        @@SERVERNAME AS ServerName,
        DB_NAME() AS DatabaseName,
        SYSTEM_USER AS LoginUser,
        GETDATE() AS ServerTime
    `)

    res.json({
      success: true,
      message: 'Kết nối SQL Server thành công',
      data: result.recordset[0]
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kết nối SQL Server thất bại',
      error: error.message
    })
  } finally {
    if (pool) {
      await pool.close()
    }
  }
})

app.listen(3000, () => {
  console.log('API đang chạy tại http://localhost:3000')
})