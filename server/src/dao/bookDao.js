// 图书数据访问层，只负责 book_info 表的 SQL 读写，不含业务判断
const pool = require('../config/db');

const PAGE_SIZE = 5;  // 每页条数，考卷固定要求 5 条

// 列表与详情共用的查询主体，左连接类型表以带出 typeName
const SELECT_WITH_TYPE = `
  SELECT b.bookId, b.bookCode, b.bookName, b.bookType, t.typeName,
         b.bookAuthor, b.publishPress, b.publishDate, b.borrowed,
         b.createdBy, b.creationTime, b.lastUpdatetime
    FROM book_info b
    LEFT JOIN book_type t ON t.id = b.bookType`;

// 转义 LIKE 通配符，防止用户输入的 % 或 _ 被当成任意匹配
function escapeLike(
  keyword,  // 用户原始输入，未转义
) {  // 返回 反斜杠转义后的关键词
  return keyword.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// 分页查询图书列表，按入库时间降序
async function findPage(
  keyword,  // 图书名称模糊词，空串或 null 表示查全部
  page,  // 页码，从 1 开始，调用方需保证已归一化
) {  // 返回 { total, page, pageSize, list }
  // 1、有关键词时才拼上 WHERE，参数化占位防注入
  const where = keyword ? 'WHERE b.bookName LIKE ?' : '';
  const filterArgs = keyword ? [`%${escapeLike(keyword)}%`] : [];

  // 2、先取满足条件的总条数，供前端算总页数与渲染分页条
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM book_info b ${where}`, filterArgs);
  const total = countRows[0].total;

  // 3、再取当前页数据；入库时间相同时用 bookId 兜底排序，保证翻页结果不重复不遗漏
  const [list] = await pool.query(
    `${SELECT_WITH_TYPE} ${where}
      ORDER BY b.creationTime DESC, b.bookId DESC
      LIMIT ? OFFSET ?`,
    [...filterArgs, PAGE_SIZE, (page - 1) * PAGE_SIZE]);

  return { total, page, pageSize: PAGE_SIZE, list };
}

// 按主键查询单本图书
async function findById(
  id,  // book_info.bookId
) {  // 返回 图书记录（含 typeName），未命中时为 null
  const [rows] = await pool.query(`${SELECT_WITH_TYPE} WHERE b.bookId = ?`, [id]);
  return rows[0] || null;
}

// 新增图书记录
async function insert(
  book,  // 已由业务层校验并补全默认值的字段集合，字段名与表列名一致
) {  // 返回 新记录的自增 bookId
  const [result] = await pool.query(
    `INSERT INTO book_info
       (bookCode, bookName, bookType, bookAuthor, publishPress, publishDate,
        borrowed, createdBy, creationTime, lastUpdatetime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [book.bookCode, book.bookName, book.bookType, book.bookAuthor,
      book.publishPress, book.publishDate, book.borrowed,
      book.createdBy, book.creationTime]);
  return result.insertId;
}

// 更新图书的可变字段
async function update(
  id,  // book_info.bookId
  book,  // 待更新字段集合；createdBy 与 creationTime 不出现在 SQL 中，从语句层面保证改不动
) {  // 返回 实际被修改的行数，0 表示记录不存在
  const [result] = await pool.query(
    `UPDATE book_info
        SET bookCode = ?, bookName = ?, bookType = ?, bookAuthor = ?,
            publishPress = ?, publishDate = ?, borrowed = ?,
            lastUpdatetime = NOW()
      WHERE bookId = ?`,
    [book.bookCode, book.bookName, book.bookType, book.bookAuthor,
      book.publishPress, book.publishDate, book.borrowed, id]);
  return result.affectedRows;
}

// 按主键删除图书记录
async function removeById(
  id,  // book_info.bookId
) {  // 返回 实际删除的行数，0 表示记录不存在
  const [result] = await pool.query('DELETE FROM book_info WHERE bookId = ?', [id]);
  return result.affectedRows;
}

module.exports = { PAGE_SIZE, findPage, findById, insert, update, removeById };
