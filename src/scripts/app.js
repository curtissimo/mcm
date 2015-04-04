let pd = Event.prototype.preventDefault;
Event.prototype.preventDefault = function () {
  if (pd) {
    pd.apply(this);
  } else {
    this.returnValue = false;
  }
};

if (typeof Element !== 'undefined' && Element.prototype.attachEvent && !Element.prototype.addEventListener) {
  Element.prototype.addEventListener = function (event, callback) {
    let self = this;
    this.attachEvent('on' + event, () => {
      callback.call(self, window.event);
    });
  };
}

if (document.querySelectorAll) {
  try {
    let dateInputs = document.querySelectorAll('input[type="date"]');
    for (let i = 0; i < dateInputs.length; i += 1) {
      let input = dateInputs[i];
      if (input.value !== input.getAttribute('value')) {
        input.value = input.getAttribute('data-value');
      }
    }
  } catch (e) { console.error(e); }
}

document
  .getElementById('main-menu')
  .addEventListener('click', e => {
    let target = e.target || e.srcElement;
    if (target.tagName !== 'A') {
      e.preventDefault();
    }
  });

document
  .getElementById('overlay')
  .addEventListener('click', e => {
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
    e.preventDefault();
    document
      .getElementById('main-menu')
      .className += ' is-shown';
    document
      .getElementById('overlay')
      .style.display = 'block';
  });

let showActionsButton = document.getElementById('main-toolbar-show-actions');
if (showActionsButton) {
  showActionsButton
    .addEventListener('click', e => {
      e.preventDefault();
      let actionMenu = document.getElementById('secondary-actions');
      if (actionMenu.className.indexOf('is-shown') > -1) {
        actionMenu.className = actionMenu.className.replace(/\s+is-shown/g, '');
      } else {
        actionMenu.className += ' is-shown';
      }
    });
}

document.body
  .addEventListener('click', e => {
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

let submitters = document.querySelectorAll('button[type="submit"]');
for (let i = 0; i < submitters.length; i += 1) {
  let submitter = submitters[i];
  submitter.addEventListener('click', e => {
    let target = e.target || e.srcElement;

    if (target.form) {
      var form = document.getElementById(target.form);
      if (form.querySelector(':invalid')) {
        return;
      }
    }

    setTimeout(function () {
      target.disabled = true;
    }, 10);
  });
}

function showComments() {
  document.getElementById('comment-form')
    .style.display = 'block';
  let content = document.getElementById('content');
  setTimeout(function () { content.focus(); }, 10);
  location.href += '#comment-form';
}

let schedule = document.getElementById('schedule');
let numberOfDays = document.getElementById('numberOfDays');
if (schedule) {
  schedule.addEventListener('change', () => {
    var groups = document.getElementsByClassName('when-specifier');
    for (let i = 0; i < groups.length; i += 1) {
      let group = groups[i];
      if ('occurs-' + schedule.value === group.id) {
        group.className += ' is-shown';
      } else {
        group.className = group.className.replace(/\s+is-shown/g, '');
      }
    }

    let days = [];
    if (schedule.value === 'once' && numberOfDays) {
      days = [ true ];
    } else if (schedule.value === 'range' && numberOfDays) {
      let number = numberOfDays.value - 0;
      for (let i = 0; i < number; i += 1) {
        days.push(true);
      }
    }
    if (numberOfDays) {
      ractive.set('days', days);
    }
  });
}

if (numberOfDays) {
  numberOfDays.addEventListener('change', () => {
    let days = [];
    let number = numberOfDays.value - 0;
    for (let i = 0; i < number; i += 1) {
      days.push(true);
    }
    ractive.set('days', days);
  });
}

let ractive = null;
if (document.getElementById('day-details')) {
  let data = {
    days: [ true ]
  };

  ractive = new Ractive({
    el: '#day-details',
    template: '#day-detail-template',
    data: data
  });
}

let photoChanger = document.getElementById('photo-changer');
if (photoChanger) {
  photoChanger.addEventListener('click', () => {
    photoChanger.style.display = 'none';
    let saver = document.createElement('A');
    saver.className = 'pure-button pure-button-primary';
    saver.innerHTML = 'Save new photo';
    saver.addEventListener('click', () => {
      document.getElementById('photo-changer-form').submit();
    });
    photoChanger.parentNode.appendChild(saver);
  });
}
