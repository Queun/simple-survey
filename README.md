# 学校匿名评教系统

## 本地启动

在项目根目录使用 Node.js 24。首次启动时复制配置，用 `openssl rand -hex 32` 生成随机值并填入 `.env` 的 `JWT_SECRET`。默认数据库为 `prisma/dev.db`。第二版从空库开始，请先另行归档已有的旧库。

```sh
cp .env.example .env
# 填好 JWT_SECRET 后，在全新工作目录执行
npm ci
npx prisma generate
touch prisma/dev.db
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

打开 <http://localhost:3000>。演示账号、密码和学生问卷链接由种子脚本打印。种子脚本只初始化空库。学生问卷目前维护中。

## 检查

```sh
npm run lint
npm test
npm run build
```

测试自动创建和清理独立的临时 SQLite 库。
