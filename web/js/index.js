// 列表页脚本：按地址栏状态拉取并渲染图书列表与分页条
(function ($) {  // 返回 无，副作用为渲染页面并绑定交互

  // 查询条件与页码只以地址栏为唯一来源，保证刷新、后退、返回后状态一致
  const state = {
    keyword: App.query('keyword'),
    page: Number(App.query('page')) || 1,
  };

  // 带查询条件与页码重新进入列表页
  // 参数 page：目标页码；参数 keyword：图书名称模糊词
  function gotoList(page, keyword) {  // 返回 无，副作用为整页跳转
    location.href = 'index.html' + App.buildQuery({ keyword: keyword, page: page });
  }

  // 渲染表格主体
  // 参数 list：后端返回的图书数组
  function renderTable(list) {  // 返回 无，副作用为写入表格并切换空列表提示
    const html = list.map(function (b) {
      const badge = Number(b.borrowed) === 1
        ? '<span class="badge badge-borrowed">已借阅</span>'
        : '<span class="badge badge-free">未借阅</span>';
      return '<tr>'
        + '<td>' + App.escapeHtml(b.bookCode) + '</td>'
        + '<td>' + App.escapeHtml(b.typeName) + '</td>'
        + '<td>' + App.escapeHtml(b.bookName) + '</td>'
        + '<td>' + App.escapeHtml(b.bookAuthor) + '</td>'
        + '<td>' + App.escapeHtml(b.publishPress) + '</td>'
        + '<td>' + App.formatDate(b.creationTime) + '</td>'
        + '<td>' + badge + '</td>'
        + '<td class="op">'
        + '<a href="#" data-act="view" data-id="' + b.bookId + '">查看</a>'
        + '<a href="#" data-act="edit" data-id="' + b.bookId + '">修改</a>'
        + '<a href="#" data-act="delete" data-id="' + b.bookId + '">删除</a>'
        + '</td></tr>';
    }).join('');

    $('#bookTable').html(html);
    $('#emptyTip').prop('hidden', list.length > 0);
  }

  // 渲染分页条：上一页、页码窗口、下一页、总页数与跳页输入
  // 参数 data：后端分页对象；参数 totalPages：总页数
  function renderPager(data, totalPages) {  // 返回 无，副作用为写入分页条
    // 1、页码最多显示 9 个，围绕当前页开窗，靠近两端时整体收拢
    const span = 9;
    let start = Math.max(1, data.page - 4);
    let end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);

    let nums = '';
    for (let i = start; i <= end; i += 1) {
      nums += '<button type="button" data-page="' + i + '"'
        + (i === data.page ? ' class="is-current"' : '') + '>' + i + '</button>';
    }

    // 2、拼出分页条，跳页输入框的边界由点击时按总页数校验
    $('#pager').html(
      '<button type="button" data-page="prev"' + (data.page <= 1 ? ' disabled' : '') + '>上一页</button>'
      + nums
      + '<button type="button" data-page="next"' + (data.page >= totalPages ? ' disabled' : '') + '>下一页</button>'
      + '<span class="total">共 ' + totalPages + ' 页</span>'
      + '<span>到第</span><input type="text" id="jumpInput" value="' + data.page + '">'
      + '<span>页</span><button type="button" id="jumpBtn">确定</button>');
  }

  // 请求列表数据
  async function fetchList() {  // 返回 分页数据对象；失败时返回 null 并已弹出提示
    try {
      const res = await App.api('GET', '/api/books'
        + App.buildQuery({ keyword: state.keyword, page: state.page }));
      if (!res.success) {
        alert(res.message || '查询图书列表失败');
        return null;
      }
      return res.data;
    } catch (err) {
      alert('无法连接服务器，请确认后台已启动');
      return null;
    }
  }

  // 拉取数据并刷新表格与分页条
  async function refresh() {  // 返回 无，副作用为渲染或跳转到有效页码
    const data = await fetchList();
    if (!data) return;

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
    renderTable(data.list);
    renderPager(data, totalPages);
  }

  // 1、把地址栏里的查询条件回填到输入框，考卷要求输入框能记住条件
  $('#keyword').val(state.keyword);

  // 2、点击查询按第一页重新进入列表，避免停留在越界页码上
  $('#searchBtn').on('click', function () {
    gotoList(1, $(this).closest('.search').find('input').val().trim());
  });

  // 3、输入框内回车等同于点查询
  $('#keyword').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      gotoList(1, $(this).val().trim());
    }
  });

  // 4、新增入口带上当前条件，新增页返回时能回到原状态
  $('#addBtn').on('click', function () {
    location.href = 'add.html' + App.buildQuery({ keyword: state.keyword, page: state.page });
  });

  // 5、操作列三个入口，删除需二次确认
  $('#bookTable').on('click', 'a[data-act]', function (e) {
    e.preventDefault();

    const act = $(this).data('act');
    const id = $(this).data('id');
    const back = { keyword: state.keyword, page: state.page };

    if (act === 'view') {
      location.href = 'detail.html' + App.buildQuery($.extend({ id: id }, back));
      return;
    }
    if (act === 'edit') {
      location.href = 'edit.html' + App.buildQuery($.extend({ id: id }, back));
      return;
    }

    removeBook(id);
  });

  // 删除指定图书
  // 参数 id：待删除记录的 bookId
  async function removeBook(id) {  // 返回 无，副作用为删除记录并刷新列表
    // 1、考卷要求删除前弹出确认框
    if (!confirm('确定删除该条图书信息？')) return;

    try {
      const res = await App.api('DELETE', '/api/books/' + id);
      if (!res.success) {
        alert('删除失败！\n' + (res.message || ''));
        return;
      }
      alert('删除成功！');
    } catch (err) {
      alert('删除失败！无法连接服务器');
      return;
    }

    // 2、删除后当前页可能已被删空，退回上一个有数据的页码
    const data = await fetchList();
    if (!data) return;
    if (!data.list.length && data.page > 1) {
      gotoList(data.page - 1, state.keyword);
      return;
    }
    renderTable(data.list);
    renderPager(data, Math.max(1, Math.ceil(data.total / data.pageSize)));
  }

  // 6、分页条上的页码与上下页统一走整页跳转，让地址栏始终反映当前状态
  $('#pager').on('click', 'button[data-page]', function () {
    const tag = $(this).data('page');
    const current = Number(App.query('page')) || 1;
    if (tag === 'prev') gotoList(current - 1, state.keyword);
    else if (tag === 'next') gotoList(current + 1, state.keyword);
    else gotoList(tag, state.keyword);
  });

  // 7、跳页输入需按总页数收拢，越界时取边界值
  $('#pager').on('click', '#jumpBtn', function () {
    const total = Number($('#pager .total').text().replace(/\D/g, '')) || 1;
    const wanted = Number($('#jumpInput').val());
    if (!Number.isFinite(wanted) || wanted < 1) {
      alert('请输入不小于 1 的页码');
      return;
    }
    gotoList(Math.min(wanted, total), state.keyword);
  });

  refresh();
})(jQuery);
