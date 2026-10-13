// 图书接口回归测试，直接对 Express 应用发请求，验证考卷要求的各项行为
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

// 测试夹具：12 条图书，跨 3 页，入库时间互不相同以便验证排序
const FIXTURE_BOOKS = [
  { code: 'BK000001', name: '第一本书', type: 8, author: '作者甲', press: '甲出版社', pub: '2014-01-01', borrowed: 0, created: '2014-01-01 08:00:00' },
  { code: 'BK000002', name: '第二本书', type: 1, author: '作者乙', press: '乙出版社', pub: '2014-02-02', borrowed: 1, created: '2014-02-02 08:00:00' },
  { code: 'BK000003', name: '第三本书', type: 2, author: '作者丙', press: '丙出版社', pub: '2014-03-03', borrowed: 0, created: '2014-03-03 08:00:00' },
  { code: 'BK000004', name: '天龙八部', type: 1, author: '金庸', press: '中原出版社', pub: '2014-04-04', borrowed: 0, created: '2014-04-04 08:00:00' },
  { code: 'BK000005', name: '天龙八部（新修版）', type: 1, author: '金庸', press: '作家出版社', pub: '2014-05-05', borrowed: 0, created: '2014-05-05 08:00:00' },
  { code: 'BK000006', name: '第六本书', type: 3, author: '作者丁', press: '丁出版社', pub: '2014-06-06', borrowed: 1, created: '2014-06-06 08:00:00' },
  { code: 'BK000007', name: '第七本书', type: 4, author: '作者戊', press: '戊出版社', pub: '2014-07-07', borrowed: 0, created: '2014-07-07 08:00:00' },
  { code: 'BK000008', name: '第八本书', type: 5, author: '作者己', press: '己出版社', pub: '2014-08-08', borrowed: 0, created: '2014-08-08 08:00:00' },
  { code: 'BK000009', name: '第九本书', type: 6, author: '作者庚', press: '庚出版社', pub: '2014-09-09', borrowed: 1, created: '2014-09-09 08:00:00' },
  { code: 'BK000010', name: '第十本书', type: 7, author: '作者辛', press: '辛出版社', pub: '2014-10-10', borrowed: 0, created: '2014-10-10 08:00:00' },
  { code: 'BK000011', name: '第十一本书', type: 8, author: '作者壬', press: '壬出版社', pub: '2014-11-11', borrowed: 0, created: '2014-11-11 08:00:00' },
  // 出版日期与入库日期故意不同，用于验证修改时不会把出版日期冲成入库日期
  { code: 'BK000012', name: '第十二本书', type: 1, author: '作者癸', press: '癸出版社', pub: '2001-05-06', borrowed: 0, created: '2014-12-12 08:00:00' },
];

// 测试结束后写回的种子数据，与 server/sql/schema.sql 保持一致
const SEED_BOOKS = [
  ['BK000023', '企业应用架构模式', 8, '（英）Martin Fowler', '机械工业出版社', '2014-07-03', 0, '2014-07-03 09:15:00'],
  ['BK000024', '精通Hibernate', 8, '刘洋', '电子工业出版社', '2014-05-03', 1, '2014-05-03 14:20:00'],
  ['BK000025', '天龙八部', 1, '金庸', '中原出版社', '2014-03-12', 0, '2014-03-12 10:05:00'],
  ['BK000026', '寻找家园', 4, '高尔泰', '北京十月文艺出版社', '2014-03-01', 0, '2014-03-01 16:40:00'],
  ['BK000027', '小猫莫格成长系列', 5, '（英）朱迪斯·克尔', '接力出版社', '2014-01-01', 1, '2014-01-01 08:30:00'],
];

// 清空图书表并写入指定夹具，让每条用例从已知状态开始
async function resetBooks(
  rows,  // 待写入的夹具数组，元素结构同 FIXTURE_BOOKS
) {  // 返回 无，副作用为重写 book_info 表
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE book_info');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  // 1、批量插入，比逐条 INSERT 少一轮往返
  if (rows.length) {
    await pool.query(
      `INSERT INTO book_info
         (bookCode, bookName, bookType, bookAuthor, publishPress, publishDate,
          borrowed, createdBy, creationTime)
       VALUES ${rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
      rows.flatMap((r) => [r.code, r.name, r.type, r.author, r.press, r.pub, r.borrowed, 'admin', r.created]));
  }
}

// 按图书编号取出整行，便于断言落库结果
async function fetchByCode(
  code,  // book_info.bookCode
) {  // 返回 命中的行，未命中时为 undefined
  const [rows] = await pool.query('SELECT * FROM book_info WHERE bookCode = ?', [code]);
  return rows[0];
}

// 构造一份合法的提交数据，便于各用例只覆盖自己关心的字段
function buildPayload(
  overrides,  // 需要覆盖的字段，缺省表示全部按合法值提交
) {  // 返回 可直接作为请求体的新对象
  return {
    bookCode: 'BK000100',
    bookName: '接口测试书',
    bookType: 1,
    bookAuthor: '测试作者',
    publishPress: '测试出版社',
    borrowed: 0,
    createdBy: 'admin',
    creationTime: '2026-10-13 10:00:00',
    ...overrides,
  };
}

beforeAll(async () => {
  await resetBooks(FIXTURE_BOOKS);
});

afterAll(async () => {
  // 1、恢复 schema.sql 的种子数据，让本地库停在文档描述的状态
  await resetBooks(SEED_BOOKS.map(([code, name, type, author, press, pub, borrowed, created]) => ({
    code, name, type, author, press, pub, borrowed, created,
  })));
  await pool.end();
});

// ==================== 列表查询 ====================

describe('GET /api/books', () => {
  test('默认返回第一页五条，按入库时间降序', async () => {
    const res = await request(app).get('/api/books');

    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(12);
    expect(res.body.data.pageSize).toBe(5);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.list).toHaveLength(5);
    expect(res.body.data.list.map((b) => b.bookCode))
      .toEqual(['BK000012', 'BK000011', 'BK000010', 'BK000009', 'BK000008']);
  });

  test('列表附带类型名称，供页面直接展示图书分类', async () => {
    const res = await request(app).get('/api/books');
    expect(res.body.data.list[0].typeName).toBe('小说');
  });

  test('末页只返回剩余条数', async () => {
    const res = await request(app).get('/api/books?page=3');
    expect(res.body.data.page).toBe(3);
    expect(res.body.data.list).toHaveLength(2);
  });

  test('页码超出范围时返回空列表但总数不变', async () => {
    const res = await request(app).get('/api/books?page=99');
    expect(res.body.data.list).toEqual([]);
    expect(res.body.data.total).toBe(12);
  });

  test('页码非法时回落为第一页', async () => {
    const res = await request(app).get('/api/books?page=abc');
    expect(res.body.data.page).toBe(1);
  });

  test('按名称模糊匹配，命中两条含相同前缀的记录', async () => {
    const res = await request(app).get('/api/books?keyword=天龙');
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.list.map((b) => b.bookCode)).toEqual(['BK000005', 'BK000004']);
  });

  test('关键词中的通配符被转义，不会匹配全部记录', async () => {
    const res = await request(app).get('/api/books?keyword=%25');
    expect(res.body.data.total).toBe(0);
  });

  test('关键词无命中时返回空列表', async () => {
    const res = await request(app).get('/api/books?keyword=不存在的书名');
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.list).toEqual([]);
  });
});

// ==================== 详情查询 ====================

describe('GET /api/books/:id', () => {
  test('返回完整字段', async () => {
    const row = await fetchByCode('BK000004');
    const res = await request(app).get(`/api/books/${row.bookId}`);

    expect(res.body.success).toBe(true);
    expect(res.body.data.bookName).toBe('天龙八部');
    expect(res.body.data.typeName).toBe('小说');
    expect(res.body.data.createdBy).toBe('admin');
  });

  test('记录不存在时返回 404', async () => {
    const res = await request(app).get('/api/books/999999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: '图书记录不存在' });
  });
});

// ==================== 类型下拉 ====================

describe('GET /api/book-types', () => {
  test('返回考卷要求的全部八种类型', async () => {
    const res = await request(app).get('/api/book-types');
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((t) => t.typeName))
      .toEqual(['小说', '文学', '传记', '艺术', '少儿', '经济', '管理', '科技']);
  });
});

// ==================== 新增 ====================

describe('POST /api/books', () => {
  test('新增成功并可回查，中文原样入库', async () => {
    const res = await request(app).post('/api/books').send(buildPayload({}));

    expect(res.body.success).toBe(true);
    const saved = await fetchByCode('BK000100');
    expect(saved.bookName).toBe('接口测试书');
    expect(saved.publishDate).toBe('2026-10-13');
    expect(saved.lastUpdatetime).toBeNull();
  });

  test.each([
    ['bookCode', '图书编号不能为空'],
    ['bookName', '图书名称不能为空'],
    ['bookType', '图书类型不能为空'],
    ['createdBy', '入库人不能为空'],
    ['creationTime', '入库时间不能为空'],
  ])('必填项 %s 缺失时返回新增失败', async (field, message) => {
    const res = await request(app).post('/api/books').send(buildPayload({ [field]: '' }));
    expect(res.body).toEqual({ success: false, message });
  });

  test('是否借阅为 0 属于合法值，不应被判成未填', async () => {
    const res = await request(app).post('/api/books').send(buildPayload({ bookCode: 'BK000101', borrowed: 0 }));
    expect(res.body.success).toBe(true);
  });

  test('图书类型不在类型表中时拒绝', async () => {
    const res = await request(app).post('/api/books').send(buildPayload({ bookType: 999 }));
    expect(res.body).toEqual({ success: false, message: '图书类型不合法' });
  });

  test('是否借阅只接受 0 与 1', async () => {
    const res = await request(app).post('/api/books').send(buildPayload({ bookCode: 'BK000102', borrowed: 5 }));
    expect(res.body).toEqual({ success: false, message: '是否借阅只能为 0 或 1' });
  });

  test('入库时间格式非法时拒绝', async () => {
    const res = await request(app).post('/api/books').send(buildPayload({ bookCode: 'BK000103', creationTime: '13/10/2026' }));
    expect(res.body).toEqual({ success: false, message: '入库时间格式不正确' });
  });
});

// ==================== 修改 ====================

describe('PUT /api/books/:id', () => {
  test('可改字段生效，入库人与入库时间保持不变', async () => {
    const row = await fetchByCode('BK000012');
    const res = await request(app)
      .put(`/api/books/${row.bookId}`)
      .send(buildPayload({ bookCode: 'BK000012', bookName: '改过名的书', bookType: 2, borrowed: 1, createdBy: 'hacker', creationTime: '1999-01-01 00:00:00' }));

    expect(res.body.success).toBe(true);
    const saved = await fetchByCode('BK000012');
    expect(saved.bookName).toBe('改过名的书');
    expect(saved.borrowed).toBe(1);
    expect(saved.createdBy).toBe('admin');
    expect(String(saved.creationTime)).toBe('2014-12-12 08:00:00');
    expect(saved.lastUpdatetime).not.toBeNull();
  });

  test('请求未携带出版日期时沿用原值', async () => {
    const row = await fetchByCode('BK000007');
    const payload = buildPayload({ bookCode: 'BK000007', bookName: '第七本书改' });
    delete payload.publishDate;

    const res = await request(app).put(`/api/books/${row.bookId}`).send(payload);
    expect(res.body.success).toBe(true);
    expect((await fetchByCode('BK000007')).publishDate).toBe('2014-07-07');
  });

  test('记录不存在时返回失败', async () => {
    const res = await request(app)
      .put('/api/books/999999')
      .send(buildPayload({}));
    expect(res.body).toEqual({ success: false, message: '图书记录不存在' });
  });
});

// ==================== 删除 ====================

describe('DELETE /api/books/:id', () => {
  test('删除成功且列表中查不到', async () => {
    const row = await fetchByCode('BK000001');
    const res = await request(app).delete(`/api/books/${row.bookId}`);

    expect(res.body).toEqual({ success: true, message: '删除成功' });
    expect(await fetchByCode('BK000001')).toBeUndefined();
  });

  test('删除不存在的记录时返回失败', async () => {
    const res = await request(app).delete('/api/books/999999');
    expect(res.body).toEqual({ success: false, message: '图书记录不存在' });
  });
});
