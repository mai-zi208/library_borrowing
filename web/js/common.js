// 前端公共工具集：地址栏状态读写、日期格式、HTML 转义、接口调用
(function (global) {  // 返回 无，副作用为在 window 上挂载 App 命名空间

  // 读取地址栏单个参数
  // 参数 name：参数名，如 keyword、id、page
  function query(name) {  // 返回 参数值字符串，未出现时为空串
    return new URLSearchParams(global.location.search).get(name) || '';
  }

  // 把对象拼成地址栏查询串，空值一律省略
  // 参数 params：键值对集合
  function buildQuery(params) {  // 返回 形如 "?keyword=x&page=2" 的串，无有效参数时返回空串
    const usp = new URLSearchParams();
    Object.entries(params).forEach(function (entry) {
      const key = entry[0];
      const value = entry[1];
      if (value !== '' && value !== null && value !== undefined) usp.set(key, value);
    });
    const text = usp.toString();
    return text ? '?' + text : '';
  }

  // 把后端返回的日期时间裁成考卷要求的"年-月-日"
  // 参数 value：形如 2014-03-12 10:05:00 的字符串，后端已按 dateStrings 关闭时区换算
  function formatDate(value) {  // 返回 YYYY-MM-DD，空值返回空串
    return value ? String(value).slice(0, 10) : '';
  }

  // 转义 HTML 特殊字符，防止书名或作者里的尖括号被当成标签解析
  // 参数 value：待写入 DOM 的原始文本
  function escapeHtml(value) {  // 返回 可安全拼接的文本
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 取今天的日期，用于新增页入库时间的默认值
  function today() {  // 返回 本地时区的 YYYY-MM-DD
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  // 调用后端接口
  // 参数 method：HTTP 方法大写串，如 GET、POST、PUT、DELETE
  // 参数 path：接口路径，同源无需拼域名
  // 参数 body：请求体对象，GET 与 DELETE 传 undefined
  async function api(method, path, body) {  // 返回 解析后的 JSON；HTTP 层失败时抛出异常
    const res = await global.fetch(path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  global.App = {
    query: query,
    buildQuery: buildQuery,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    today: today,
    api: api,
  };
})(window);
