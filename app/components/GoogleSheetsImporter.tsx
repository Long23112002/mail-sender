'use client'

import { useState } from 'react'
import { Input, Button, Alert, message, Space } from 'antd'
import { GoogleOutlined, LinkOutlined, DownloadOutlined } from '@ant-design/icons'

interface GoogleSheetsImporterProps {
  onDataLoaded: (data: any[]) => void
}

export default function GoogleSheetsImporter({ onDataLoaded }: GoogleSheetsImporterProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const extractSheetId = (url: string): string | null => {
    // Extract sheet ID from various Google Sheets URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
      /key=([a-zA-Z0-9-_]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  const convertToCSVUrl = (sheetId: string, gid: string = '0'): string => {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  }

  const extractGid = (url: string): string => {
    const gidMatch = url.match(/gid=([0-9]+)/)
    return gidMatch ? gidMatch[1] : '0'
  }

  const parseCSVData = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    const data: any[] = []

    // Không bỏ qua dòng đầu: xử lý từ i = 0
    for (let i = 0; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.some(v => v)) { // Bỏ qua dòng hoàn toàn rỗng
        const row = {
          xxx: values[0] || '',
          yyy: values[1] || '',
          mail: values[2] || '',
          ttt: values[3] || '',
          zzz: values[4] || '',
          www: values[5] || '',
          uuu: values[6] || '',
          vvv: values[7] || '',
          rrr: values[8] || ''
        }
        data.push(row)
      }
    }

    return data
  }

  const handleImport = async () => {
    if (!url.trim()) {
      message.error('Vui lòng nhập URL Google Sheets')
      return
    }

    setLoading(true)
    
    try {
      const sheetId = extractSheetId(url)
      if (!sheetId) {
        message.error('URL không hợp lệ. Vui lòng kiểm tra lại URL Google Sheets')
        return
      }

      const gid = extractGid(url)
      const csvUrl = convertToCSVUrl(sheetId, gid)

      // Call API endpoint to fetch data (avoiding CORS)
      const response = await fetch('/api/google-sheets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ csvUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Không thể tải dữ liệu từ Google Sheets')
      }

      const result = await response.json()
      const data = parseCSVData(result.csvData)

      if (data.length === 0) {
        message.warning('Không có dữ liệu hợp lệ trong Google Sheets')
        return
      }

      onDataLoaded(data)
      message.success(`Đã import thành công ${data.length} dòng dữ liệu từ Google Sheets`)
      setUrl('')
      
    } catch (error) {
      console.error('Google Sheets import error:', error)
      message.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi import từ Google Sheets')
    } finally {
      setLoading(false)
    }
  }

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.includes('docs.google.com/spreadsheets')) {
        setUrl(text)
        message.success('Đã paste URL từ clipboard')
      } else {
        message.warning('Clipboard không chứa URL Google Sheets hợp lệ')
      }
    } catch (error) {
      message.error('Không thể đọc clipboard. Vui lòng paste thủ công')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <GoogleOutlined className="text-lg text-green-600" />
        <span className="font-medium text-sm sm:text-base">Import từ Google Sheets</span>
      </div>
      
      <div className="space-y-3">
        <Input
          placeholder="Nhập URL Google Sheets (ví dụ: https://docs.google.com/spreadsheets/d/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          prefix={<LinkOutlined className="text-gray-400" />}
          className="w-full"
          size="middle"
          suffix={
            <Button 
              type="text" 
              size="small" 
              onClick={handlePasteUrl}
              className="text-xs"
            >
              Paste
            </Button>
          }
        />
        
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleImport}
          disabled={!url.trim()}
          className="w-full sm:w-auto"
          size="middle"
        >
          {loading ? 'Đang tải...' : 'Import dữ liệu'}
        </Button>
      </div>

      <Alert
        message="Hướng dẫn sử dụng"
        description={
          <div className="text-xs space-y-1">
            <div><strong>Bước 1:</strong> Mở Google Sheets của bạn</div>
            <div><strong>Bước 2:</strong> Nhấn "Chia sẻ" và đặt quyền "Bất kỳ ai có liên kết đều có thể xem"</div>
            <div><strong>Bước 3:</strong> Copy URL và paste vào ô trên</div>
            <div><strong>Lưu ý:</strong> Dữ liệu cần theo thứ tự cột: xxx, yyy, mail, ttt, zzz, www, uuu, vvv, rrr</div>
          </div>
        }
        type="info"
        showIcon
        className="text-xs"
      />
    </div>
  )
}
