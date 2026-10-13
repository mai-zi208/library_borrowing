// 新增页与修改页共用的表单能力：类型下拉加载、必填校验、取值
window.Form = (function ($) {  // 返回 表单工具对象

  // 必填字段清单，与考卷新增页上标星号的一一对应
  const REQUIRED = ['bookCode', 'bookName', 'bookType', 'borrowed', 'createdBy', 'creationTime'];

  // 从接口拉取图书类型填充下拉框
  // 参数 selected：需要预选中的类型 id，新增页传空串
  async function loadTypes(selected) {  // 返回 无，副作用为重建下拉选项
    try {
      const res = await App.api('GET', '/api/book-types');
      if (!res.success) {
        alert(res.message || '图书类型加载失败');
        return;
      }
      const options = res.data.map(function (t) {
        return '<option value="' + t.id + '">' + App.escapeHtml(t.typeName) + '</option>';
      }).join('');
      $('#bookType').html('<option value="">——请选择——</option>' + options);
      if (selected) $('#bookType').val(String(selected));
    } catch (err) {
      alert('无法连接服务器，请确认后台已启动');
    }
  }

  // 逐项校验必填字段，未填的字段下方标红提示
  function validate() {  // 返回 布尔值，true 表示必填项全部已填
    let passed = true;
    REQUIRED.forEach(function (name) {
      const $field = $('.field[data-field="' + name + '"]');
      const value = String($('#' + name).val() || '').trim();
      const missing = value === '';
      $field.toggleClass('has-error', missing);
      if (missing) passed = false;
    });
    return passed;
  }

  // 从表单收集请求体，字段名与后端约定保持一致
  function collect() {  // 返回 可直接提交的请求体对象
    return {
      bookCode: $('#bookCode').val().trim(),
      bookName: $('#bookName').val().trim(),
      bookType: $('#bookType').val(),
      bookAuthor: $('#bookAuthor').val().trim(),
      publishPress: $('#publishPress').val().trim(),
      borrowed: $('#borrowed').val(),
      createdBy: $('#createdBy').val().trim(),
      creationTime: $('#creationTime').val(),
    };
  }

  return { loadTypes: loadTypes, validate: validate, collect: collect };
})(jQuery);
