# 图书借阅系统（后台）

图书后台管理功能的最小实现：图书列表分页、按名称模糊查询、查看详情、新增、修改、删除。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 后端 | Node.js + Express，分 DAO / Service / 路由三层 |
| 前端 | 静态 HTML + jQuery，由 Express 静态托管，同源调用 `/api` |
| 数据库 | MySQL 8.0 |
| 测试 | Jest + Supertest，GitHub Actions 回归 |

## 目录结构

```
server/         后端
  sql/          建表与测试数据脚本
  src/config/   数据库连接池
  src/dao/      数据访问
  src/services/ 业务逻辑
  src/routes/   HTTP 路由
  test/         接口回归测试
web/            前端页面与脚本
.github/        CI 工作流
```

## 本地运行

```bash
mysql -u root < server/sql/schema.sql   # 建库建表并导入测试数据
cp .env.example .env                    # 按本机数据库账号改配置
npm install
npm start                               # http://127.0.0.1:3000
```

## 说明

按考卷要求不实现登录，入库人固定为 `admin`。
