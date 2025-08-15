'use client'

import { useState, useEffect } from 'react'
import apiClient from '../../lib/apiClient'
import { 
  Select, 
  Space, 
  Tag, 
  Button, 
  Modal, 
  Typography,
  Divider,
  Empty,
  Spin
} from 'antd'
import { 
  FileTextOutlined, 
  EyeOutlined,
  GlobalOutlined,
  LockOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'

const { Text } = Typography

interface Template {
  _id: string
  name: string
  description: string
  subject: string
  content: string
  isPublic: boolean
  tags: string[]
  userId: {
    username: string
    fullName: string
  }
  createdAt: string
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template | null) => void
  sampleData?: any // Thêm prop để truyền dữ liệu thật từ Excel
}

export default function TemplateSelector({ onSelectTemplate, sampleData }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  // Function to replace variables for preview (only use real data if available)
  const replaceVariablesForPreview = (template: string) => {
    // Chỉ sử dụng dữ liệu thật nếu có, không có thì để placeholder
    if (!sampleData) {
      return template // Trả về template gốc với các placeholder
    }
    
    const dataToUse = sampleData

    let result = template
    
    // Hỗ trợ các format: xxx, XXX, [xxx], (xxx), {xxx}
    const patterns = [
      // Lowercase trong {}
      { pattern: /\{(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\}/g, getValue: (match: string) => dataToUse[match] || match },
      // Uppercase trong {}
      { pattern: /\{(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\}/g, getValue: (match: string) => dataToUse[match.toLowerCase()] || match },
      // Lowercase trong []
      { pattern: /\[(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\]/g, getValue: (match: string) => dataToUse[match] || match },
      // Uppercase trong []
      { pattern: /\[(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\]/g, getValue: (match: string) => dataToUse[match.toLowerCase()] || match },
      // Lowercase trong ()
      { pattern: /\((xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\)/g, getValue: (match: string) => dataToUse[match] || match },
      // Uppercase trong ()
      { pattern: /\((XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\)/g, getValue: (match: string) => dataToUse[match.toLowerCase()] || match },
      // Plain text với word boundary
      { pattern: /\b(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\b/g, getValue: (match: string) => dataToUse[match] || match },
      { pattern: /\b(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\b/g, getValue: (match: string) => dataToUse[match.toLowerCase()] || match },
    ]
    
    patterns.forEach(({ pattern, getValue }) => {
      result = result.replace(pattern, (fullMatch, captured) => {
        return getValue(captured)
      })
    })
    
    return result
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/templates')
      if (response.data) {
        setTemplates(response.data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null)
      onSelectTemplate(null)
      return
    }

    const template = templates.find(t => t._id === templateId)
    if (template) {
      setSelectedTemplate(template)
      onSelectTemplate(template)
    }
  }

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
    setPreviewModalOpen(true)
  }

  const getTemplateIcon = (template: Template) => {
    return template.isPublic ? (
      <GlobalOutlined className="text-green-500" />
    ) : (
      <LockOutlined className="text-orange-500" />
    )
  }

  return (
    <div>
      <Space direction="vertical" className="w-full" size="middle">
        <Select
          size="large"
          placeholder="Chọn template email có sẵn"
          className="w-full"
          loading={loading}
          allowClear
          value={selectedTemplate?._id}
          onChange={handleSelectTemplate}
          notFoundContent={
            loading ? <Spin size="small" /> : 
            templates.length === 0 ? (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có template nào"
              />
            ) : "Không tìm thấy"
          }
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider className="my-2" />
              <div className="px-3 pb-2">
                <Text type="secondary" className="text-xs">
                  💡 Tạo template mới trong tab "Templates"
                </Text>
              </div>
            </div>
          )}
        >
          <Select.Option value="none">
            <Space>
              <ThunderboltOutlined className="text-blue-500" />
              <span>Không sử dụng template</span>
            </Space>
          </Select.Option>
          
          {templates.map((template) => (
            <Select.Option key={template._id} value={template._id}>
              <div className="flex justify-between items-center w-full">
                <Space>
                  <FileTextOutlined className="text-blue-500" />
                  <span>{template.name}</span>
                  {getTemplateIcon(template)}
                  {template.tags.slice(0, 2).map(tag => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                </Space>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(template)
                  }}
                />
              </div>
            </Select.Option>
          ))}
        </Select>

        {selectedTemplate && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm animate-in fade-in duration-300">
            <Space direction="vertical" size="small" className="w-full">
              <div className="flex justify-between items-start">
                <Space>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileTextOutlined className="text-blue-600" />
                  </div>
                  <div>
                    <Text strong className="text-blue-800 text-base">
                      {selectedTemplate.name}
                    </Text>
                    <div className="flex items-center gap-1 mt-1">
                      {getTemplateIcon(selectedTemplate)}
                      <Text type="secondary" className="text-xs">
                        {selectedTemplate.isPublic ? 'Public template' : 'Private template'}
                      </Text>
                    </div>
                  </div>
                </Space>
                <Button
                  type="primary"
                  ghost
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(selectedTemplate)}
                  className="rounded-lg"
                >
                  Xem trước
                </Button>
              </div>
              
              {selectedTemplate.description && (
                <div className="bg-white bg-opacity-50 rounded-lg p-3 mt-2">
                  <Text type="secondary" className="text-sm italic">
                    "{selectedTemplate.description}"
                  </Text>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTemplate.tags.map(tag => (
                  <Tag key={tag} color="blue" className="rounded-full">{tag}</Tag>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                <Text type="secondary" className="text-xs">
                  👤 {selectedTemplate.userId.fullName}
                </Text>
                <Text type="secondary" className="text-xs">
                  📅 {new Date(selectedTemplate.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </div>
            </Space>
          </div>
        )}
      </Space>

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${previewTemplate?.name}`}
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={800}
        footer={[
          <Button 
            key="use" 
            type="primary"
            onClick={() => {
              if (previewTemplate) {
                handleSelectTemplate(previewTemplate._id)
                setPreviewModalOpen(false)
              }
            }}
          >
            Sử dụng template này
          </Button>,
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            Đóng
          </Button>
        ]}
      >
        {previewTemplate && (
          <div>
            <div className="mb-4">
              <Text strong>Tiêu đề: </Text>
              <Text>{replaceVariablesForPreview(previewTemplate.subject)}</Text>
            </div>
            <Divider />
            <div 
              dangerouslySetInnerHTML={{ __html: replaceVariablesForPreview(previewTemplate.content) }}
              style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px', 
                padding: '16px',
                backgroundColor: '#fafafa',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
