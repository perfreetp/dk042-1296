function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const BOM = '\uFEFF'
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  const csv = BOM + headerLine + '\n' + dataLines.join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export function downloadHTML(htmlContent: string, filename: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>充电站复盘报告</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:40px 24px;color:#262626;line-height:1.8}
h1{text-align:center;font-size:22px;margin-bottom:8px}
h2{font-size:18px;color:#1677ff;border-bottom:2px solid #1677ff;padding-bottom:6px;margin-top:32px}
.meta{text-align:right;color:#8c8c8c;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #e8e8e8;padding:8px 12px;text-align:left;font-size:14px}
th{background:#fafafa;font-weight:600}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;margin:0 4px}
.tag-danger{background:#fff1f0;color:#ff4d4f;border:1px solid #ffa39e}
.tag-warning{background:#fffbe6;color:#faad14;border:1px solid #ffe58f}
.tag-success{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}
.tag-blue{background:#e6f7ff;color:#1677ff;border:1px solid #91caff}
.center{text-align:center}
footer{margin-top:48px;text-align:right;color:#8c8c8c;font-size:13px;border-top:1px solid #e8e8e8;padding-top:16px}
</style>
</head>
<body>
${htmlContent}
</body>
</html>`
  downloadBlob(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }), filename)
}

export function downloadExcelXML(headers: string[], rows: (string | number)[][], filename: string) {
  const BOM = '\uFEFF'
  let xml = BOM + '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<?mso-application progid="Excel.Sheet"?>\n'
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n'
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n'
  xml += '<Worksheet ss:Name="Sheet1"><Table>\n'
  xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>\n'
  rows.forEach(row => {
    xml += '<Row>' + row.map(cell => {
      const val = String(cell ?? '')
      const type = typeof cell === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`
    }).join('') + '</Row>\n'
  })
  xml += '</Table></Worksheet></Workbook>'
  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename)
}
