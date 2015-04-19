import url from 'url';
import mimelib from 'mimelib';
import email from '../../../../models/email';

if (typeof DENYSOFT === 'undefined') {
  var DENYSOFT = 903;
}
if (typeof OK === 'undefined') {
  var OK = 906;
}
if (typeof DENY === 'undefined') {
  var DENY = 902;
}

function promisify(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  })
}

function unwrap(arr, index = 0) {
  if (!Array.isArray(arr)) {
    return null;
  }
  return arr[index];
}

function splitReferences(refs) {
  refs = unwrap(refs) || '';
  return refs.split(/\s+/);
}

export let hook_data = (next, connection) => {
  connection.transaction.parse_body = true;
  next();
};

export let hook_queue = (next, connection) => {
  let { mail_from, notes, rcpt_to, header: { headers_decoded: headers }, body } = connection.transaction;
  // 
  let proto = {
    received: new Date(),
    sent: new Date(unwrap(headers.date)),
    from: unwrap(headers.sender) || unwrap(headers.from),
    replyTo: unwrap(headers['reply-to']),
    references: splitReferences(headers.references),
    messageId: unwrap(headers['message-id']),
    subject: unwrap(headers.subject),
    recipients: []
  };
  connection.loginfo('missive:', proto);
  let missive = email.new(proto);
  missive.headers = headers;

  let recipients = unwrap(headers.to).split(/\s*,\s*/);
  for (let recipient of recipients) {
    let lessThanIndex = recipient.lastIndexOf('<');
    let name = '';
    if (lessThanIndex >= 0) {
      name = recipient.substring(0, lessThanIndex);
    }
    let email = recipient.substring(name.length).replace(/^[<\s]+/, '').replace(/([>\s]+$)/, '');
    if (name.length === 0) {
      name = email;
    } else {
      name = name.trim().replace(/^[\s"]+/, '').replace(/[\s"]+$/, '');
    }

    let recipient = {
      email: email,
      name: name
    };
    if (notes[email.toLowerCase()] && notes[email.toLowerCase()].id) {
      recipient.status = 'received';
      recipient.id = notes[email.toLowerCase()].id;
    }
    missive.recipients.push(recipient);
  }
  connection.loginfo('recipients:', missive.recipients);

  if (body.children.length === 0 && body.is_html) {
    missive.html = body.body_text_encoded;
  } else if(body.children.length === 0) {
    missive.text = body.body_text_encoded;
  } else {
    for (let child of body.children) {
      let format = '';
      let translation = s => s;
      if (child.ct.indexOf('text/html') === 0) {
        format = 'html';
      }
      if (child.ct.indexOf('text/plain') === 0) {
        format = 'text';
      }
      if (child.header && child.header.headers_decoded) {
        let transferEncoding = unwrap(child.header.headers_decoded['content-transfer-encoding']);
        if (transferEncoding === 'quoted-printable') {
          translation = s => mimelib.decodeQuotedPrintable(s);
        }
      }
      missive[format] = translation(child.body_text_encoded);
    }
  }

  let nexted = false;
  let accountSet = new Set();
  let accountArray = [];
  for (let key of Object.keys(notes)) {
    if (typeof notes[key].db === 'string') {
      accountSet.add(notes[key].db);
    }
  }
  accountSet.forEach(v => accountArray.push(v));
  Promise.all(accountArray)
    .then(accountdbs => {
      if (accountdbs.length === 0) {
        nexted = true;
        return next(DENY, `5.7.1 Unable to relay for ${rcpt_to}`);
      }
      try {
        let promises = [];
        connection.loginfo('Saving missive to:\n\t', accountdbs.join('\n\t'));
        for (let accountdb of accountdbs) {
          promises.push(promisify(missive.to(accountdb), 'save'));
        }
        return Promise.all(promises)
      } catch (e) {
        connection.logcrit('ERROR: ERROR: ', e);
        nexted = true;
        return next(DENYSOFT, 'Requested action aborted: local error in processing');
      }
    })
    .then(() => { if (!nexted) next(OK); })
    .catch(e => {
      connection.logemerg('Something went wrong with the account view.', accountErr);
      return next(DENYSOFT, 'Requested action aborted: local error in processing');
    });
};
