// 图书类型接口路由，为前端下拉框提供数据源
const express = require('express');
const bookService = require('../services/bookService');

const router = express.Router();  // 返回 已登记类型端点的子路由实例

// 查询全部图书类型
router.get('/', async (req, res) => {  // 返回 无，副作用为写出类型数组 JSON
  try {
    const list = await bookService.listBookTypes();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('查询图书类型失败', err);
    res.status(500).json({ success: false, message: '查询图书类型失败' });
  }
});

module.exports = router;
