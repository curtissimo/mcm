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

/*!
 * Small Walker - v0.1.1 - 5/5/2011
 * http://benalman.com/
 * 
 * Copyright (c) 2011 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */

// Walk the DOM, depth-first (HTML order). Inside the callback, `this` is the
// element, and the only argument passed is the current depth. If the callback
// returns false, its children will be skipped.
// 
// Based on https://gist.github.com/240274

function walk(node, callback) {
  var skip, tmp;
  // This depth value will be incremented as the depth increases and
  // decremented as the depth decreases. The depth of the initial node is 0.
  var depth = 0;

  // Always start with the initial element.
  do {
    if ( !skip ) {
      // Call the passed callback in the context of node, passing in the
      // current depth as the only argument. If the callback returns false,
      // don't process any of the current node's children.
      skip = callback.call(node, depth) === false;
    }

    if ( !skip && (tmp = node.firstChild) ) {
      // If not skipping, get the first child. If there is a first child,
      // increment the depth since traversing downwards.
      depth++;
    } else if ( tmp = node.nextSibling ) {
      // If skipping or there is no first child, get the next sibling. If
      // there is a next sibling, reset the skip flag.
      skip = false;
    } else {
      // Skipped or no first child and no next sibling, so traverse upwards,
      tmp = node.parentNode;
      // and decrement the depth.
      depth--;
      // Enable skipping, so that in the next loop iteration, the children of
      // the now-current node (parent node) aren't processed again.
      skip = true;
    }

    // Instead of setting node explicitly in each conditional block, use the
    // tmp var and set it here.
    node = tmp;

  // Stop if depth comes back to 0 (or goes below zero, in conditions where
  // the passed node has neither children nore next siblings).
  } while ( depth > 0 );
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
      var form = target.form;
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

let emailForm = document.getElementById('email-form');
let emailEditor = document.getElementById('email-editor');
if (emailForm && emailEditor) {
  let editor = false;
  emailEditor.addEventListener('load', () => {
    editor = emailEditor.contentWindow.editor;

    editor.addEventListener('willPaste', e => {
      walk(e.fragment, function (depth) {
        if (this.style) {
          if (this.style.fontFamily) {
            this.style.fontFamily = '';
          }
        }
        if (this.className) {
          this.removeAttribute('class');
        }
        if (this.title) {
          this.removeAttribute('title');
        }
      });
    });

    editor.addEventListener('blur', e => {
      let html = editor.getHTML().replace(/<div><br><\/div>/, '').trim();
      let text = html.replace(/\n/g, ' ')
        .replace(/<br><\/h[1-6]>/g, '\n\n')
        .replace(/<\/h[1-6]>/g, '\n\n')
        .replace(/<br><\/[^>]+>/g, '</p>')
        .replace(/<br>/g, '\n')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim();

      if (text.length === 0) {
        return document.getElementById('email-text').innerHTML = '';
      }

      document.getElementById('email-html').innerHTML = html;
      document.getElementById('email-text').innerHTML = text;
    });
  });
  emailForm.addEventListener('submit', e => {
    if (!editor) {
      return e.preventDefault();
    }
  });
}
