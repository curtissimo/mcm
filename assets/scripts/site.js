/*global jQuery*/
(function ($) {
  'use strict';
  $(function () {
    $('a[data-method]').click(function (e) {
      var $this, form;
      $this = $(this);
      form = [
        '<form method="post" action="' + $this.attr('href') + '">',
        '  <input type="hidden" name="__method__" value="' + $this.data('method') + '">',
        '</form>'
      ].join('\n');

      e.stopPropagation();
      e.preventDefault();
      $(form)
        .appendTo('body')
        .submit();
    });

    $('[data-url]').click(function (e) {
      if (e.target.tagName.toLowerCase() === 'a') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      location.href = $(e.currentTarget).data('url');
    });
  });
}(jQuery));
