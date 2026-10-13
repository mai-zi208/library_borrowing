// 修改页脚本：回填原记录，提交可改字段
(function ($) {  // 返回 无，副作用为渲染表单并提交

  const id = App.query('id');

  // 返回列表页时要复原的来源状态
  const backQuery = { keyword: App.query('keyword'), page: App.query('page') };

  // 填充可改字段
  // 参数 b：后端返回的图书记录
  function fill(b) {  // 返回 无，副作用为写入表单
    $('#bookCode').val(b.bookCode);
    $('#bookName').val(b.bookName);
    $('#bookAuthor').val(b.bookAuthor);
    $('#publishPress').val(b.publishPress);
    $('#borrowed').val(String(b.borrowed));

    // 入库人与入库时间在页面上只读，后端同样不接受这两个字段被改写
    $('#createdBy').val(b.createdBy);
    $('#creationTime').val(App.formatDate(b.creationTime));
  }

  // 加载原记录，类型下拉需在拿到 bookType 之后再回填选中项
  async function load() {  // 返回 无，副作用为渲染表单或提示失败
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
      await Form.loadTypes(res.data.bookType);
    } catch (err) {
      alert('无法连接服务器，请确认后台已启动');
    }
  }

  // 字段重新有输入时立即撤掉标红
  $('#bookForm').on('input change', 'input, select', function () {
    $(this).closest('.field').removeClass('has-error');
  });

  $('#backBtn').on('click', function () {  // 返回：回到进入前的列表状态
    location.href = 'index.html' + App.buildQuery(backQuery);
  });

  $('#bookForm').on('submit', async function (e) {  // 提交：校验后调用修改接口
    e.preventDefault();
    if (!Form.validate()) return;

    try {
      const res = await App.api('PUT', '/api/books/' + id, Form.collect());
      if (!res.success) {
        alert('修改失败！\n' + (res.message || ''));
        return;
      }
      alert('修改成功！');
      location.href = 'index.html' + App.buildQuery(backQuery);
    } catch (err) {
      alert('修改失败！无法连接服务器');
    }
  });

  load();
})(jQuery);
