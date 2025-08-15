"use client"

import { useState, useEffect } from "react"
import apiClient from "../../lib/apiClient"
import dynamic from "next/dynamic"
import { List, Button, Modal, Form, Input, Switch, Tag, Popconfirm, message, Typography, Divider } from "antd"
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LockOutlined,
} from "@ant-design/icons"

const { TextArea } = Input
const { Text } = Typography

// CKEditor chỉ render phía client
const CKEditor = dynamic(() => import("@ckeditor/ckeditor5-react").then(m => m.CKEditor), { ssr: false }) as any
// Load build only on client using require to avoid Next.js dynamic typing constraint
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ClassicEditor: any = typeof window !== 'undefined' ? require('@ckeditor/ckeditor5-build-classic') : null
const AnyCKEditor: any = CKEditor

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

interface TemplateManagerProps {
  onSelectTemplate: (template: Template) => void
  sampleData?: any // Thêm prop để truyền dữ liệu thật từ Excel
  onTemplatesChanged?: () => void
}

export default function TemplateManager({ onSelectTemplate, sampleData, onTemplatesChanged }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [form] = Form.useForm()

  // Function to replace variables for preview (only use real data if available)
  const replaceVariablesForPreview = (template: string) => {
    // Chỉ sử dụng dữ liệu thật nếu có, không có thì để placeholder
    if (!sampleData) {
      return template // Trả về template gốc với các placeholder
    }

    // Debug data
    console.log("TemplateManager - sampleData:", sampleData)
    console.log("TemplateManager - template:", template)

    // Ensure sampleData is an object and has proper structure
    if (typeof sampleData !== "object" || Array.isArray(sampleData)) {
      console.warn("TemplateManager - sampleData is not a proper object:", typeof sampleData)
      return template
    }

    const dataToUse = sampleData
    let result = template

    // Hỗ trợ các format: xxx, XXX, [xxx], (xxx), {xxx}
    const patterns = [
      // Lowercase trong {}
      {
        pattern: /\{(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\}/g,
        getValue: (match: string) => String(dataToUse[match] || match),
      },
      // Uppercase trong {}
      {
        pattern: /\{(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\}/g,
        getValue: (match: string) => String(dataToUse[match.toLowerCase()] || match),
      },
      // Lowercase trong []
      {
        pattern: /\[(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\]/g,
        getValue: (match: string) => String(dataToUse[match] || match),
      },
      // Uppercase trong []
      {
        pattern: /\[(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\]/g,
        getValue: (match: string) => String(dataToUse[match.toLowerCase()] || match),
      },
      // Lowercase trong ()
      {
        pattern: /$$(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)$$/g,
        getValue: (match: string) => String(dataToUse[match] || match),
      },
      // Uppercase trong ()
      {
        pattern: /$$(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)$$/g,
        getValue: (match: string) => String(dataToUse[match.toLowerCase()] || match),
      },
      // Plain text với word boundary
      {
        pattern: /\b(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\b/g,
        getValue: (match: string) => String(dataToUse[match] || match),
      },
      {
        pattern: /\b(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\b/g,
        getValue: (match: string) => String(dataToUse[match.toLowerCase()] || match),
      },
    ]

    patterns.forEach(({ pattern, getValue }) => {
      result = result.replace(pattern, (fullMatch, captured) => {
        const value = getValue(captured)
        console.log(`TemplateManager - Replacing ${fullMatch} with ${value}`)
        return value
      })
    })

    console.log("TemplateManager - Final result:", result)
    return result
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get("/api/templates")
      if (response.data) {
        setTemplates(response.data.templates)
      } else {
        message.error("Không thể tải danh sách template")
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải template")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (values: any) => {
    try {
      const response = await (editingTemplate 
        ? apiClient.put(`/api/templates/${editingTemplate._id}`, {
            ...values,
            tags: values.tags ? values.tags.split(",").map((tag: string) => tag.trim()) : [],
          })
        : apiClient.post("/api/templates", {
            ...values,
            tags: values.tags ? values.tags.split(",").map((tag: string) => tag.trim()) : [],
          })
      )

      if (response.data) {
        message.success(editingTemplate ? "Cập nhật template thành công" : "Tạo template thành công")
        setModalOpen(false)
        setEditingTemplate(null)
        form.resetFields()
        fetchTemplates()
        onTemplatesChanged?.()
      } else {
        message.error(response.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi lưu template")
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await apiClient.delete(`/api/templates/${templateId}`)

      if (response.data) {
        message.success("Xóa template thành công")
        fetchTemplates()
        onTemplatesChanged?.()
      } else {
        message.error(response.error || "Có lỗi xảy ra")
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi xóa template")
    }
  }

  const openEditModal = (template?: Template) => {
    setEditingTemplate(template || null)
    if (template) {
      form.setFieldsValue({
        ...template,
        tags: template.tags.join(", "),
      })
    } else {
      form.resetFields()
    }
    setModalOpen(true)
  }

  const openPreviewModal = (template: Template) => {
    setPreviewTemplate(template)
    setPreviewModalOpen(true)
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
        <Text strong className="text-base sm:text-lg whitespace-nowrap">
          Template Library
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openEditModal()}
          size="middle"
          className="w-full sm:w-auto flex-shrink-0"
        >
          Tạo Template
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={templates}
        size="small"
        className="w-full"
        renderItem={(template) => (
          <List.Item
            className="!flex-col !items-start w-full p-3 sm:p-4"
            actions={[
              <div key="actions" className="flex flex-wrap gap-1 sm:gap-2 justify-end w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => openPreviewModal(template)}
                  size="small"
                  className="flex-shrink-0"
                />
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onSelectTemplate(template)}
                  className="flex-shrink-0 min-w-[60px]"
                >
                  Chọn
                </Button>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(template)}
                  size="small"
                  className="flex-shrink-0"
                />
                <Popconfirm
                  title="Bạn có chắc muốn xóa template này?"
                  onConfirm={() => handleDeleteTemplate(template._id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" className="flex-shrink-0" />
                </Popconfirm>
              </div>,
            ]}
          >
            <div className="w-full flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-shrink-0">
                <FileTextOutlined className="text-2xl text-blue-500" />
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span
                      className="font-medium text-sm sm:text-base break-words hyphens-auto"
                      style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                    >
                      {template.name}
                    </span>
                    {template.isPublic ? (
                      <Tag color="green" icon={<GlobalOutlined />} className="flex-shrink-0">
                        Public
                      </Tag>
                    ) : (
                      <Tag color="orange" icon={<LockOutlined />} className="flex-shrink-0">
                        Private
                      </Tag>
                    )}
                  </div>
                </div>

                <div className="w-full">
                  <div
                    className="text-gray-600 text-xs sm:text-sm mb-2 break-words hyphens-auto"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {template.description}
                  </div>

                  <Text
                    type="secondary"
                    className="text-xs block mb-2 break-words"
                    style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                  >
                    Bởi: {template.userId.fullName} • {new Date(template.createdAt).toLocaleDateString("vi-VN")}
                  </Text>

                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Tag
                          key={tag}
                          className="text-xs break-words"
                          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingTemplate ? "Chỉnh sửa Template" : "Tạo Template Mới"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingTemplate(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
        centered
        style={{ maxWidth: "95%" }}
        className="mobile-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveTemplate}>
          <Form.Item
            name="name"
            label="Tên Template"
            rules={[{ required: true, message: "Vui lòng nhập tên template!" }]}
          >
            <Input placeholder="Nhập tên template" className="w-full" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input placeholder="Mô tả ngắn về template" className="w-full" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Tiêu đề Email"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề email!" }]}
          >
            <Input placeholder="Tiêu đề email (có thể dùng biến)" className="w-full" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung Template"
            rules={[{ required: true, message: "Vui lòng nhập nội dung template!" }]}
          >
            <div className="bg-white rounded border">
              <AnyCKEditor
                key={modalOpen ? 'editor-open' : 'editor-closed'}
                editor={ClassicEditor}
                data={form.getFieldValue('content') || ''}
                disableWatchdog={true}
                config={{
                  toolbar: {
                    items: [
                      'heading', '|', 'bold', 'italic', 'underline', 'link', '|', 'bulletedList', 'numberedList', '|', 'undo', 'redo', '|', 'blockQuote', 'code', 'insertTable'
                    ],
                  },
                  placeholder: 'Nội dung HTML template (dùng {xxx}, {yyy}, {mail}, ...)'
                }}
                onReady={() => {}}
                onChange={(event: any, editor: any) => {
                  const data = editor.getData()
                  form.setFieldsValue({ content: data })
                }}
              />
            </div>
          </Form.Item>

          <Form.Item name="tags" label="Tags (phân cách bằng dấu phẩy)">
            <Input placeholder="vd: business, notification, welcome" className="w-full" />
          </Form.Item>

          <Form.Item name="isPublic" label="Công khai" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button type="primary" htmlType="submit" className="w-full sm:w-auto">
                {editingTemplate ? "Cập nhật" : "Tạo"}
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false)
                  setEditingTemplate(null)
                  form.resetFields()
                }}
                className="w-full sm:w-auto"
              >
                Hủy
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${previewTemplate?.name}`}
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={800}
        centered
        style={{ maxWidth: "95%" }}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)} className="w-full sm:w-auto">
            Đóng
          </Button>,
        ]}
      >
        {previewTemplate && (
          <div className="w-full">
            <div className="mb-4 break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
              <Text strong>Tiêu đề: </Text>
              <Text className="break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                {replaceVariablesForPreview(previewTemplate.subject)}
              </Text>
            </div>
            <Divider />

            {/* Debug info */}
            {/* <div
              className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs break-words"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              <strong>Debug:</strong>
              <div>Template content type: {typeof previewTemplate.content}</div>
              <div>Template content length: {previewTemplate.content?.length || 0}</div>
              <div>Sample data: {JSON.stringify(sampleData)}</div>
              <div className="break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                First 100 chars: {previewTemplate.content?.substring(0, 100)}...
              </div>
            </div> */}

            <div
              className="w-full break-words"
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                padding: "16px",
                backgroundColor: "#fafafa",
                maxHeight: "400px",
                overflow: "auto",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: replaceVariablesForPreview(previewTemplate.content) }}
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
