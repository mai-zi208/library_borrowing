// 应用入口，装配中间件、静态资源与接口路由
const path = require('path');
const express = require('express');
const booksRouter = require('./routes/books');
const bookTypesRouter = require('./routes/bookTypes');

const app = express();  // 返回 已挂载全部路由的 Express 应用实例，供启动与测试共用
const PORT = Number(process.env.PORT) || 3000;  // 监听端口，未配置时用 3000

// 1、解析 JSON 请求体
app.use(express.json());

// 2、前端页面由同进程静态托管，页面直接同源调用 /api，省掉跨域配置
app.use(express.static(path.join(__dirname, '..', '..', 'web')));

// 3、挂载接口路由
app.use('/api/books', booksRouter);
app.use('/api/book-types', bookTypesRouter);

// 4、兜底错误处理，保证任何未捕获异常都返回结构化响应而非挂起连接
app.use((err, req, res, next) => {  // 返回 无，副作用为写出 500 响应
  console.error('未处理异常', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 仅在直接运行时监听端口，被 require 时（如测试）不占用端口
if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`图书借阅系统后台已启动：http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
