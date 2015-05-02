let presenter = {
  get(ac) {
    if (ac.member) {
      ac.member.permissions.hasOfficerPermissions = function () {
        return this.canManagePolls
            || ac.member.officerInbox
            || this.canManagePublicDocuments
            || this.canManageRoadCaptains;
      };
      ac.member.permissions.hasAdminPermissions = function () {
        return this.canManagePermissions
            || this.canManageSettings
            || this.canManageOfficers
            || this.canManageEmails;
      };
    }
    let data = {
      name: ac.settings.name,
      member: ac.member
    };
    let presenters = {};
    ac.render({ data: data, presenters: presenters });
  }
};

export default presenter;
