// 图书业务层，负责必填校验、默认值补全，并在数据访问层之上组织业务
const bookDao = require('../dao/bookDao');
const bookTypeDao = require('../dao/bookTypeDao');

// 必填字段的中文名，既作为校验清单，也用于拼出可直接展示的提示语
// 作者与出版社在考卷新增页上没有星号，故不列入必填
const REQUIRED_LABELS = {
  bookCode: '图书编号',
  bookName: '图书名称',
  bookType: '图书类型',
  borrowed: '是否借阅',
  createdBy: '入库人',
  creationTime: '入库时间',
};

// 把日期或日期时间输入统一成 MySQL 的 DATETIME 字面量
function toDateTime(
  value,  // 前端提交的 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss，兼容 ISO 的 T 分隔
) {  // 返回 规范化后的字符串，无法解析时为 null
  const text = String(value).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return `${text}:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) return text;
  return null;
}

// ==================== 公开方法 ====================

// 分页查询图书列表
async function listBooks(
  keyword,  // 图书名称模糊词，缺省查全部
  page,  // 页码，从 1 开始，非法值回落为 1
) {  // 返回 { total, page, pageSize, list }
  // 1、页码归一化，非正整数一律当第一页
  const requested = Number(page);
  const normalizedPage = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  // 2、关键词去空白，空串按"不过滤"处理
  const trimmed = typeof keyword === 'string' ? keyword.trim() : '';
  return bookDao.findPage(trimmed, normalizedPage);
}

// 查询单本图书详情
async function getBook(
  id,  // 路径参数带来的 bookId，可能是字符串
) {  // 返回 { ok, data } 或 { ok: false, message }
  const book = await bookDao.findById(Number(id));
  return book ? { ok: true, data: book } : { ok: false, message: '图书记录不存在' };
}

// 新增图书
async function createBook(
  payload,  // 请求体，字段名与 book_info 列名一致
) {  // 返回 { ok, data: { bookId } } 或 { ok: false, message }
  const checked = await normalize(payload, null);
  if (!checked.ok) return checked;

  // 1、校验通过后一次性落库，失败由路由层统一兜底为"新增失败"
  const bookId = await bookDao.insert(checked.value);
  return { ok: true, data: { bookId } };
}

// 修改图书
async function updateBook(
  id,  // 待修改记录的 bookId
  payload,  // 请求体；其中 createdBy 与 creationTime 会被数据访问层丢弃
) {  // 返回 { ok } 或 { ok: false, message }
  // 1、先确认记录存在，避免把"改不到"误报成"修改成功"
  const exists = await bookDao.findById(Number(id));
  if (!exists) return { ok: false, message: '图书记录不存在' };

  // 2、复用新增的校验规则，并传入原记录以保留修改页上没有的字段
  const checked = await normalize(payload, exists);
  if (!checked.ok) return checked;

  await bookDao.update(Number(id), checked.value);
  return { ok: true };
}

// 删除图书
async function deleteBook(
  id,  // 待删除记录的 bookId
) {  // 返回 { ok } 或 { ok: false, message }
  const affected = await bookDao.removeById(Number(id));
  return affected > 0 ? { ok: true } : { ok: false, message: '图书记录不存在' };
}

// 查询图书类型下拉数据
async function listBookTypes() {  // 返回 类型数组，元素形如 { id, typeName }
  return bookTypeDao.listAll();
}

// ==================== 私有方法 ====================

// 校验提交数据的必填项与取值，并补全页面上没有的字段
async function normalize(
  payload,  // 请求体原始对象，可能缺字段
  existing,  // 更新时传入待修改的原记录，用于保留页面上没有的字段；新增时传 null
) {  // 返回 { ok, value } 或 { ok: false, message }
  const body = payload || {};

  // 1、逐项检查必填字段；borrowed 为 0 时仍是合法值，故只能与空串和空值比较
  for (const [field, label] of Object.entries(REQUIRED_LABELS)) {
    const raw = body[field];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return { ok: false, message: `${label}不能为空` };
    }
  }

  // 2、图书类型必须能在 book_type 表中找到，落实考卷"类型数据必须来源于类型表"
  const bookType = Number(body.bookType);
  if (!Number.isInteger(bookType) || !(await bookTypeDao.findById(bookType))) {
    return { ok: false, message: '图书类型不合法' };
  }

  // 3、是否借阅只接受 0 与 1 两个枚举值
  const borrowed = Number(body.borrowed);
  if (borrowed !== 0 && borrowed !== 1) {
    return { ok: false, message: '是否借阅只能为 0 或 1' };
  }

  // 4、入库时间必须能解析成 DATETIME
  const creationTime = toDateTime(body.creationTime);
  if (!creationTime) return { ok: false, message: '入库时间格式不正确' };

  // 5、作者与出版社在页面上非必填：新增时按提交值入库，更新时未携带则沿用原记录
  //    出版日期修改页上没有输入项，未携带或传空都视为不改动，仅新增时才退化为入库当天
  const textOrKeep = (field, fallback) => {  // --- 取文本提交值，未携带时沿用原记录
    const raw = body[field];
    if (raw === undefined || raw === null) return existing ? existing[field] : fallback;
    return String(raw).trim();
  };

  const dateOrKeep = (field, fallback) => {  // --- 取日期提交值，空值与无法解析都视为不改动
    const parsed = toDateTime(body[field] ?? '');
    if (parsed) return parsed;
    return existing ? existing[field] : fallback;
  };

  return {
    ok: true,
    value: {
      bookCode: String(body.bookCode).trim(),
      bookName: String(body.bookName).trim(),
      bookType,
      borrowed,
      createdBy: String(body.createdBy).trim(),
      creationTime,
      bookAuthor: textOrKeep('bookAuthor', ''),
      publishPress: textOrKeep('publishPress', ''),
      publishDate: dateOrKeep('publishDate', creationTime.slice(0, 10)),
    },
  };
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook, listBookTypes };
