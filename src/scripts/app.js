let pd = Event.prototype.preventDefault;
Event.prototype.preventDefault = function () {
  if (pd) {
    pd.apply(this);
  } else {
    this.returnValue = false;
  }
};

if (typeof Element !== 'undefined' && Element.prototype.attachEvent) {
  Element.prototype.addEventListener = function (event, callback) {
    this.attachEvent('on' + event, callback);
  };
}

document
  .getElementById('main-menu')
  .addEventListener('click', e => {
    e = e || window.event;
    let target = e.target || e.srcElement;
    if (target.tagName !== 'A') {
      e.preventDefault();
    }
  });

document
  .getElementById('overlay')
  .addEventListener('click', e => {
    e = e || window.event;
    e.preventDefault();
    let mainMenu = document.getElementById('main-menu');
    mainMenu.className = mainMenu.className.replace(/is-shown/g, '');
    document
      .getElementById('overlay')
      .style.display = 'none';
  });

document
  .getElementById('main-toolbar-show-menu')
  .addEventListener('click', e => {
    e = e || window.event;
    e.preventDefault();
    document
      .getElementById('main-menu')
      .className += ' is-shown';
    document
      .getElementById('overlay')
      .style.display = 'block';
  });

document
  .addEventListener('click', e => {
    e = e || window.event;
    let target = e.target || e.srcElement;
    while (target && target.tagName !== 'A') {
      target = target.parentNode;
    }
    if (target && target.className.indexOf('delete-link') > -1) {
      e.preventDefault();
      let form = document.createElement('form');
      form.method = 'post';
      form.action = target.href;
      let input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'X-HTTP-Method-Override';
      input.value = 'delete';
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    }
  });