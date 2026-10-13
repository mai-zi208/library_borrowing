// 图书类型数据访问层，只负责 book_type 表的 SQL 读写，不含业务判断
const pool = require('../config/db');

// 查询全部图书类型，供新增页与修改页的下拉框取数
async function listAll() {  // 返回 类型数组，元素形如 { id, typeName }，按 id 升序
  const [rows] = await pool.query('SELECT id, typeName FROM book_type ORDER BY id');
  return rows;
}

// 按主键查询单个图书类型，用于校验提交的类型是否存在
async function findById(
  id,  // 图书类型主键，对应 book_info.bookType
) {  // 返回 命中的类型记录，未命中时为 null
  const [rows] = await pool.query('SELECT id, typeName FROM book_type WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = { listAll, findById };
