# Simple Survey 工作约定
面向中小学的匿名评教系统：学生给本班各科任课教师打分，校长看本校看板。先读 [STATUS](docs/STATUS.md) 和 [需求基线](docs/requirements.md)。

## 原则
1. 最简完整：只做已确认的需求，不建平台、不预留扩展。
2. 阶段：第二版开发中，只在本地运行，部署环境未定。
3. 业务取舍才问用户，已授权的直接做。

## 边界
- 学生答卷匿名：任何接口和页面都不返回单份答卷，也不记录能识别学生的信息。
- 教师看不到任何评价结果；校长只能看本校；平台管理员看不到单个教师的得分。
- 不提交 `.env`、数据库文件和 Prisma 生成代码；密钥只从环境变量读。

## 开工与收工
- 开工：读 STATUS、`git log -10`、对应事项的任务文件（`.codex/handoffs/S<编号>-*/task.md`）；先确认 `npm test` 和 `npm run build` 能跑。
- 收工：更新任务文件的进度、发现、决定；提交尾行写 `Refs:` / `Agent:` / `Verified:`。STATUS 和需求基线只由 Claude 改。

## 完成标准
- `npm run lint`、`npm test`、`npm run build` 通过；UI 改动要在浏览器里实际看过，没看就标“未验收”。
