# Supabase 配置指南

## 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并登录
2. 点击 "New Project"
3. 填写项目名称：`workflowguard`
4. 设置数据库密码（妥善保存）
5. 选择区域：建议选最近的，如 `ap-southeast-1`（新加坡）
6. 点击 "Create new project"（约等待 2 分钟）

## 2. 获取环境变量

项目创建后，进入项目 Settings → API，复制以下值：

| 变量名 | 说明 | 位置 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名密钥（客户端用） | Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务角色密钥（服务端用） | Settings → API → service_role |

更新到 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## 3. 配置 Auth 认证

### 3.1 开启 Email 认证
1. 进入 Authentication → Providers
2. 确保 "Email" 已启用
3. 可选：配置 SMTP 以发送自定义邮件（推荐 Resend）

### 3.2 开启 GitHub OAuth
1. Authentication → Providers → GitHub
2. 在 GitHub 创建 OAuth App：
   - 访问 GitHub Settings → Developer Settings → OAuth Apps
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `https://[YOUR_PROJECT].supabase.co/auth/v1/callback`
3. 填写 Client ID 和 Client Secret
4. 复制到 `.env.local`：
   ```env
   AUTH_GITHUB_ID="your-github-client-id"
   AUTH_GITHUB_SECRET="your-github-client-secret"
   ```

## 4. 执行数据库迁移

### 方法 A：SQL 编辑器（推荐首次）
1. 进入 Supabase Dashboard → SQL Editor
2. 创建新查询
3. 复制 `src/prisma/migration.sql` 的全部内容
4. 点击 "Run" 执行

### 方法 B：迁移文件
如果后续需要持续管理 Schema，可配置 Supabase CLI：

```bash
# 安装 Supabase CLI
npm install -g supabase

# 初始化
supabase init

# 链接项目
supabase link --project-ref YOUR_PROJECT_REF

# 将 migration.sql 转为迁移文件
supabase db diff --use-migra -f initial_schema

# 应用迁移
supabase db push
```

## 5. 验证设置

执行以下 SQL 检查表是否创建成功：

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

预期结果：
```
profiles
workflows
tasks
audit_logs
```

## 6. 种子数据（可选）

如果需要测试数据，运行 `docs/seed.sql`：

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="exec">
<｜｜DSML｜｜parameter name="command" string="true">psql $SUPABASE_DATABASE_URL -f docs/seed.sql