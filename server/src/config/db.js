// 数据库连接池，全应用共用一个池，避免每次请求新建连接
const mysql = require('mysql2/promise');

const pool = mysql.createPool({  // 返回 共享连接池，进程退出前需调用 end() 释放
  host: process.env.DB_HOST || '127.0.0.1',  // 数据库主机，CI 容器环境下由环境变量注入
  port: Number(process.env.DB_PORT) || 3306,  // 数据库端口，环境变量取到的是字符串需转数
  user: process.env.DB_USER || 'root',  // 数据库账号
  password: process.env.DB_PASSWORD || '',  // 数据库口令，本地开发允许为空
  database: process.env.DB_NAME || 'library_borrowing',  // 业务库名
  waitForConnections: true,
  connectionLimit: 10,  // 池内最大连接数，后台管理系统的并发量足够
  // 让 DATE/DATETIME 直接返回字符串，绕开 JS Date 按本地时区二次换算导致的日期偏移
  dateStrings: true,
});

module.exports = pool;
