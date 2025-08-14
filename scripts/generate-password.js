const bcrypt = require('bcryptjs');

// Tạo hash password
async function generatePassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
}

// Sử dụng
generatePassword('password'); // password mặc định
generatePassword('admin123'); // password khác
