// 图书接口路由，负责解析 HTTP 参数、调用业务层，并把结果写成 JSON
const express = require('express');
const bookService = require('../services/bookService');

const router = express.Router();  // 返回 已登记图书端点的子路由实例

// 分页查询图书列表
router.get('/', async (req, res) => {  // 返回 无，副作用为写出列表 JSON
  // 1、查询失败只影响本接口，异常就地兜底，不让进程崩溃
  try {
    const data = await bookService.listBooks(req.query.keyword, req.query.page);
    res.json({ success: true, data });
  } catch (err) {
    console.error('查询图书列表失败', err);
    res.status(500).json({ success: false, message: '查询图书列表失败' });
  }
});

// 查询单本图书详情
router.get('/:id', async (req, res) => {  // 返回 无，副作用为写出详情 JSON
  try {
    const result = await bookService.getBook(req.params.id);
    if (!result.ok) return res.status(404).json({ success: false, message: result.message });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('查询图书详情失败', err);
    res.status(500).json({ success: false, message: '查询图书详情失败' });
  }
});

// 新增图书
router.post('/', async (req, res) => {  // 返回 无，副作用为写出新增结果 JSON
  try {
    // 1、校验不通过也返回 200，前端据 success 字段决定弹"新增成功"还是"新增失败"
    const result = await bookService.createBook(req.body);
    if (!result.ok) return res.json({ success: false, message: result.message });
    res.json({ success: true, message: '新增成功', data: result.data });
  } catch (err) {
    console.error('新增图书失败', err);
    res.json({ success: false, message: '新增失败' });
  }
});

// 修改图书
router.put('/:id', async (req, res) => {  // 返回 无，副作用为写出修改结果 JSON
  try {
    const result = await bookService.updateBook(req.params.id, req.body);
    if (!result.ok) return res.json({ success: false, message: result.message });
    res.json({ success: true, message: '修改成功' });
  } catch (err) {
    console.error('修改图书失败', err);
    res.json({ success: false, message: '修改失败' });
  }
});

// 删除图书
router.delete('/:id', async (req, res) => {  // 返回 无，副作用为写出删除结果 JSON
  try {
    const result = await bookService.deleteBook(req.params.id);
    if (!result.ok) return res.json({ success: false, message: result.message });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除图书失败', err);
    res.json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
