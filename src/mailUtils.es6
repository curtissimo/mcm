import rabbit from 'rabbit.js';
import crypto from 'crypto';

export function html2text(html) {
  return html.replace(/\n/g, ' ')
    .replace(/<br><\/h[1-6]>/g, '\n\n')
    .replace(/<\/h[1-6]>/g, '\n\n')
    .replace(/<br><\/[^>]+>/g, '</p>')
    .replace(/<br>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<\/div>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function text2html(html) {
  return html.replace(/\r\n/g, '<br>')
    .replace(/[\r\n]/g, '<br>')
    .trim();
}

export function randomValueHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
}

export function getDomain(account) {
  if (account.domain) {
    return account.domain;
  }
  return `${account.subdomain}.ismymc.com`;
}

export function postMailDirective(topic, directive) {
  return new Promise((good, bad) => {
    try {
      let context = rabbit.createContext(process.env.MCM_RABBIT_URL);
      context.on('error', e => {
        bad(e);
      });
      context.on('ready', () => {
        try {
          let socket = context.socket('PUSH', { persistent: true });
          socket.on('close', () => {
            context.close();
          });
          socket.connect(topic, () => {
            try {
              socket.end(JSON.stringify(directive));
              good();
            } catch(e) {
              bad(e);
            }
          });
        } catch(e) {
          bad(e);
        }
      });
    } catch(e) {
      bad(e);
    }
  });
}
