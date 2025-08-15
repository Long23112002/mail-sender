'use client'

import { useState } from 'react'
import apiClient from '../../lib/apiClient'
import { Upload, message, Spin, Alert, Tag, Tabs } from 'antd'
import { InboxOutlined, FileExcelOutlined, GoogleOutlined, UploadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import GoogleSheetsImporter from './GoogleSheetsImporter'

const { Dragger } = Upload

interface ExcelUploaderProps {
  onDataLoaded: (data: any[]) => void
}

export default function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileInfo, setFileInfo] = useState<any>(null)

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setFileName(file.name)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Chuyển đổi thành JSON với header từ dòng đầu tiên
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length === 0) {
        message.error('File Excel không có dữ liệu')
        return false
      }

      // Lấy tất cả dữ liệu bao gồm dòng đầu tiên (header)
      const allRows = jsonData as any[][]

      // Chuyển đổi thành object với key tương ứng
      const processedData = allRows.map(row => {
        const obj: any = {}
        
        // Map các cột theo thứ tự: xxx, yyy, mail, ttt, zzz, www, uuu, vvv, rrr
        const variableNames = ['xxx', 'yyy', 'mail', 'ttt', 'zzz', 'www', 'uuu', 'vvv', 'rrr']
        
        variableNames.forEach((varName, index) => {
          obj[varName] = row[index] || ''
        })
        
        return obj
      }).filter(row => row.xxx || row.yyy || row.mail) // Lấy tất cả dòng có dữ liệu

      setFileInfo({
        name: file.name,
        size: file.size,
        totalRows: jsonData.length,
        validRows: processedData.length,
        headers: jsonData[0] || [],
      })

      onDataLoaded(processedData)
      message.success(`Đã tải thành công ${processedData.length} dòng dữ liệu`)
      
      return false // Ngăn upload tự động
    } catch (error) {
      console.error('Lỗi đọc file Excel:', error)
      message.error('Có lỗi xảy ra khi đọc file Excel')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: handleFileUpload,
    showUploadList: false,
    disabled: isLoading,
  }

  return (
    <div className="space-y-4">
      <Tabs
        defaultActiveKey="file"
        size="small"
        items={[
          {
            key: 'file',
            label: (
              <span className="inline-flex items-center gap-2">
                <UploadOutlined />
                <span>Upload File</span>
              </span>
            ),
            children: (
              <Dragger {...uploadProps} className="border-2 border-dashed border-gray-300 hover:border-blue-400">
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center">
                      <Spin size="large" />
                      <p className="mt-4 text-blue-600 font-medium">Đang xử lý file...</p>
                    </div>
                  ) : (
                    <>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined className="text-4xl text-blue-500" />
                      </p>
                      <p className="ant-upload-text text-lg font-medium">
                        Click hoặc kéo file Excel vào đây
                      </p>
                      <p className="ant-upload-hint text-gray-500">
                        Hỗ trợ file .xlsx và .xls
                      </p>
                    </>
                  )}
                </div>
              </Dragger>
            ),
          },
          {
            key: 'google-sheets',
            label: (
              <span className="inline-flex items-center gap-2">
                <GoogleOutlined />
                <span>Google Sheets</span>
              </span>
            ),
            children: (
              <div className="py-4">
                <GoogleSheetsImporter onDataLoaded={onDataLoaded} />
              </div>
            ),
          },
        ]}
      />

      {fileInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileExcelOutlined className="text-green-600 text-lg" />
            <span className="font-medium text-green-800">{fileInfo.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* <Tag color="blue">Tổng: {fileInfo.totalRows} dòng</Tag> */}
            <Tag color="green">Hợp lệ: {fileInfo.validRows} dòng</Tag>
            <Tag color="orange">Size: {(fileInfo.size / 1024).toFixed(1)} KB</Tag>
          </div>
        </div>
      )}

      <Alert
        message="Hướng dẫn file Excel"
        description={
          <div>
            <p className="mb-2 text-xs sm:text-sm"><strong>Cấu trúc cột cần có:</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">xxx</code> Cột 1 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">yyy</code> Cột 2 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">mail</code>Cột 3 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">ttt</code> Cột 4 excel </div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">zzz</code> Cột 5 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">www</code> Cột 6 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">uuu</code> Cột 7 excel</div>
              <div>• <code className="bg-gray-100 px-1 rounded text-xs">vvv</code> Cột 8 excel</div>
            </div>
          </div>
        }
        type="info"
        showIcon
        className="text-xs sm:text-sm"
      />
    </div>
  )
}
