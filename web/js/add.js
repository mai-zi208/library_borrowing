// 新增页脚本：填默认值，前端校验通过后提交
(function ($) {  // 返回 无，副作用为渲染表单并提交

  // 取消新增时要复原的来源状态
  const backQuery = { keyword: App.query('keyword'), page: App.query('page') };

  // 1、考卷不实现登录，入库人固定为 admin；入库时间默认当天
  $('#createdBy').val('admin');
  $('#creationTime').val(App.today());

  // 2、图书类型必须来自类型表，下拉数据由接口提供
  Form.loadTypes('');

  // 3、字段重新有输入时立即撤掉标红
  $('#bookForm').on('input change', 'input, select', function () {
    $(this).closest('.field').removeClass('has-error');
  });

  $('#backBtn').on('click', function () {  // 返回：回到进入前的列表状态
    location.href = 'index.html' + App.buildQuery(backQuery);
  });

  $('#bookForm').on('submit', async function (e) {  // 提交：校验后调用新增接口
    e.preventDefault();
    if (!Form.validate()) return;

    try {
      const res = await App.api('POST', '/api/books', Form.collect());
      if (!res.success) {
        alert('新增失败！\n' + (res.message || ''));
        return;
      }
      alert('新增成功！');

      // 新增成功后回到无条件列表，否则新入库的书会被上次的筛选条件挡在视野外
      location.href = 'index.html';
    } catch (err) {
      alert('新增失败！无法连接服务器');
    }
  });
})(jQuery);
