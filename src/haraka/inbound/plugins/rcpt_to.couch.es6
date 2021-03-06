import url from 'url';
import account from '../../../models/account';
import member from '../../../models/member';

if (typeof DENYSOFT === 'undefined') {
  var DENYSOFT = 903;
}
if (typeof OK === 'undefined') {
  var OK = 906;
}
if (typeof DENY === 'undefined') {
  var DENY = 902;
}

export let hook_rcpt = (next, connection, [{ original, user, host }]) => {
  let masterdb = url.resolve(process.env.MCM_DB, '/mcm-master');
  account.from(masterdb).byUrl(host, (accountErr, accounts) => {
    if (accountErr) {
      connection.logemerg('Something went wrong with the account view.', accountErr);
      return next(DENYSOFT, 'Requested action aborted: local error in processing');
    }
    if (accounts.length === 0) {
      connection.loginfo('Bad domain:', host);
      return next(DENY, `5.7.1 Unable to relay for ${original}`);
    }
    let accountdb = url.resolve(process.env.MCM_DB, accounts[0].subdomain);

    try {
      member.from(accountdb).onlyOfficers((e, officers) => {
        if (e) {
          connection.logemerg('Something went wrong with the officers view.', e);
          return next(DENYSOFT, 'Requested action aborted: local error in processing');
        }
        let target = original.toLowerCase().replace(/^</, '').replace(/>$/, '');
        for (let officer of officers) {
          if (!officer.officerInbox) {
            continue;
          }
          if (officer.officerInbox.toLowerCase() === user.toLowerCase()) {
            connection.loginfo(`Found recipient:
              ${officer.firstName} ${officer.lastName} <${officer.officerInbox}>
              Storing id and account keyed by ${target}`);
            connection.transaction.notes[target] = {
              id: officer._id,
              db: accountdb
            };
            return next(OK);
          }
        }
        connection.loginfo(`Did not find email: <${target}>`);
        next(DENY, 'Bad email address.');
      });
    } catch (e) {
      connection.logemerg('Something went wrong with couch on the member query.', e);
      return next(DENYSOFT, 'Requested action aborted: local error in processing');
    }
  })
};
