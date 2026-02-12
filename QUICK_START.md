# Quick Start Guide

## ✅ Zoom API 凭证已配置

您的 Zoom API 凭证已成功配置到 `.env.local` 文件中：

- ✅ Account ID: `t1dxNk_bQV2TfdbzRa2PZw`
- ✅ API Key (Client ID): `zlARGmc6QzyxAHNDIW8IgA`
- ✅ API Secret: `DRVbf4KqNNfbeoh3Rn7uNhrw6a9p95Pf`
- ✅ Zoom API 已启用 (`VITE_USE_ZOOM_API=true`)

## 🚀 启动应用

1. **重启开发服务器**（如果正在运行）：
   ```bash
   # 停止当前服务器 (Ctrl+C)
   # 然后重新启动
   npm run dev
   ```

   ⚠️ **重要**: 修改 `.env.local` 后必须重启开发服务器才能生效！

2. **访问应用**:
   打开浏览器访问 `http://localhost:3000`

## 🧪 测试 Zoom API 集成

1. **创建新会议**:
   - 点击 "Book Meeting" 或 "Book Now"
   - 填写会议信息（标题、日期、时间等）
   - 点击 "Create Zoom Meeting"
   - 系统会自动调用 Zoom API 创建真实会议

2. **验证会议创建**:
   - 检查浏览器控制台是否有错误
   - 登录您的 Zoom 账户，查看是否创建了新会议
   - 会议卡片应显示真实的 Zoom 链接

3. **测试编辑功能**:
   - 点击会议卡片上的编辑按钮
   - 修改会议信息
   - 保存后，Zoom 会议也会被更新

4. **测试删除功能**:
   - 删除一个会议
   - Zoom 账户中的对应会议也会被删除

## 🔍 故障排除

### 如果会议创建失败：

1. **检查控制台错误**:
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签页的错误信息

2. **常见问题**:

   **"Zoom API credentials are missing"**
   - 确保 `.env.local` 文件存在且包含所有必需的变量
   - 确保变量名以 `VITE_` 开头
   - 重启开发服务器

   **"Zoom API Error: Invalid access token"**
   - 检查 API Key 和 Secret 是否正确
   - 确认 Zoom App 已在 Marketplace 中激活
   - 确认已添加必要的权限（scopes）

   **"Failed to create Zoom meeting"**
   - 检查会议开始时间是否在未来
   - 确认您的 Zoom 账户有创建会议的权限
   - 查看浏览器控制台的详细错误信息

3. **回退到 Mock 模式**:
   如果遇到问题，可以临时禁用 Zoom API：
   ```env
   VITE_USE_ZOOM_API=false
   ```
   然后重启服务器，系统会使用模拟链接。

## 📝 下一步

- ✅ Zoom API 集成已配置完成
- 📖 查看 `ZOOM_API_SETUP.md` 了解详细设置和安全注意事项
- 🔒 生产环境部署前，请阅读安全最佳实践

## 🔐 安全提醒

⚠️ **重要**: `.env.local` 文件包含敏感信息，已自动添加到 `.gitignore`，不会被提交到 Git。

**请勿**：
- ❌ 将 `.env.local` 提交到版本控制
- ❌ 在公开场合分享这些凭证
- ❌ 在生产环境的前端代码中暴露这些凭证

**生产环境建议**：
- ✅ 创建后端 API 代理
- ✅ 在后端存储 Zoom 凭证
- ✅ 实现用户认证和授权
