// 查看页脚本：按地址栏 id 拉取详情并以只读方式展示
(function ($) {  // 返回 无，副作用为渲染页面

  // 返回列表页时要复原的来源状态
  const backQuery = { keyword: App.query('keyword'), page: App.query('page') };

  // 回到列表页
  function goBack() {  // 返回 无，副作用为整页跳转
    location.href = 'index.html' + App.buildQuery(backQuery);
  }

  // 填充只读字段
  // 参数 b：后端返回的图书记录
  function fill(b) {  // 返回 无，副作用为写入各字段
    $('#bookCode').val(b.bookCode);
    $('#bookName').val(b.bookName);
    $('#bookType').val(b.typeName);
    $('#bookAuthor').val(b.bookAuthor);
    $('#publishPress').val(b.publishPress);
    $('#borrowed').val(Number(b.borrowed) === 1 ? '已借阅' : '未借阅');
    $('#createdBy').val(b.createdBy);
    $('#creationTime').val(App.formatDate(b.creationTime));
  }

  // 加载详情
  async function load() {  // 返回 无，副作用为渲染或提示失败
    const id = App.query('id');
    if (!id) {
      alert('缺少图书记录标识');
      return;
    }

    try {
      const res = await App.api('GET', '/api/books/' + id);
      if (!res.success) {
        alert(res.message || '查询图书详情失败');
        return;
      }
      fill(res.data);
    } catch (err) {
      alert('无法连接服务器，请确认后台已启动');
    }
  }

  $('#backBtn').on('click', goBack);

  load();
})(jQuery);
