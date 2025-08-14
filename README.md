# Email Sender Application

Ứng dụng Next.js để gửi email hàng loạt với template và biến động từ file Excel.

## Tính năng

- 🔐 Đăng nhập bảo mật
- 📧 Gửi email qua Gmail và Outlook
- 📊 Upload và đọc dữ liệu từ file Excel
- 🎨 Template email với biến động
- 📋 Danh sách kết quả gửi email
- 🎯 Giao diện đẹp và thân thiện

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cấu hình biến môi trường trong file `.env.local`:

```env
# Cấu hình Gmail
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Cấu hình Outlook  
OUTLOOK_USER=your-outlook@outlook.com
OUTLOOK_PASSWORD=your-password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
```

## Hướng dẫn cấu hình Email

### Gmail
1. Bật xác thực 2 bước cho tài khoản Gmail
2. Tạo App Password:
   - Vào Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Tạo password cho app và sử dụng password này trong `GMAIL_APP_PASSWORD`

### Outlook
1. Sử dụng email và password Outlook thông thường
2. Đảm bảo tài khoản không bật xác thực 2 bước hoặc sử dụng app password

## Định dạng file Excel

File Excel cần có các cột theo thứ tự:
- **Cột 1**: xxx (Tên/ID)
- **Cột 2**: yyy (Email - bắt buộc)
- **Cột 3**: zzz (Mã/Code)
- **Cột 4**: www (Địa chỉ)
- **Cột 5**: uuu (Số điện thoại)
- **Cột 6**: vvv (Công ty)
- **Cột 7**: rrr (Ghi chú)

## Template Email

Sử dụng các biến sau trong template:
- `{xxx}` - Thay thế bằng giá trị cột 1
- `{yyy}` - Thay thế bằng email (cột 2)
- `{zzz}` - Thay thế bằng giá trị cột 3
- `{www}` - Thay thế bằng giá trị cột 4
- `{uuu}` - Thay thế bằng giá trị cột 5
- `{vvv}` - Thay thế bằng giá trị cột 6
- `{rrr}` - Thay thế bằng giá trị cột 7

### Ví dụ template:
```html
<html>
<body>
  <h2>Xin chào {xxx}!</h2>
  <p>Email của bạn: {yyy}</p>
  <p>Mã khách hàng: {zzz}</p>
  <p>Địa chỉ: {www}</p>
  <p>Số điện thoại: {uuu}</p>
  <p>Công ty: {vvv}</p>
  <p>Ghi chú: {rrr}</p>
</body>
</html>
```

## Khởi tạo dữ liệu

Tạo user admin mặc định:
```bash
node scripts/create-admin.js
```

## Đăng nhập

Mặc định:
- **Username**: admin
- **Password**: password

Hoặc đăng ký tài khoản mới tại `/register`

## Chạy ứng dụng

```bash
npm run dev
```

Truy cập: http://localhost:3000

## Cấu trúc thư mục

```
DA/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   └── email/send/route.ts
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── EmailSender.tsx
│   │   └── ExcelUploader.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── .env.local
```

## Lưu ý bảo mật

1. Thay đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên mạnh
2. Thay đổi username/password mặc định
3. Không commit file `.env.local` lên git
4. Sử dụng App Password cho Gmail thay vì password chính

## Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Cấu hình email trong `.env.local`
2. Định dạng file Excel
3. Kết nối internet
4. Console để xem lỗi chi tiết
