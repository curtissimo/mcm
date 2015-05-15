function misp(ac) {
  return p => {
    if (ac.path.startsWith(`/chapter/${p}`)) {
      return 'pure-menu-selected';
    }
    return '';
  };
}

let presenter = {
  get(ac) {
    if (ac.member) {
      ac.member.permissions.hasOfficerPermissions = function () {
        return this.canManagePolls
            || ac.member.officerInbox
            || this.canManagePublicDocuments
            || this.canManagePolls
            || this.canManageLoh
            || this.canManageEvents
            || this.canManageMembers
            || this.canManageRoadCaptains;
      };
      ac.member.permissions.hasAdminPermissions = function () {
        return this.canManagePermissions
            || this.canManageSettings
            || this.canManageOfficers
            || this.canManageEmails;
      };
    }
    let p = misp(ac);
    let is = {
      myPage: p('dashboard'),
      events: p('events'),
      members: p('members'),
      newsletters: p('newsletters'),
      discussions: p('discussions'),
      privateDocs: p('private-documents'),
      inbox: p('emails'),
      mileage: p('reports/mileage'),
      publicDocs: p('public-documents'),
      roadCaptains: p('road-captains'),
      polls: p('polls'),
      loh: p('loh'),
      security: p('security'),
      settings: p('settings'),
      officers: p('officers'),
      emailMgmt: p('email-management'),
      membership: p('reports/membership')
    }
    let data = {
      name: ac.settings.name,
      member: ac.member,
      is: is
    };
    let presenters = {};
    ac.render({ data: data, presenters: presenters });
  }
};

export default presenter;
