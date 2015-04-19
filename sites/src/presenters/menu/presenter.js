let presenter = {
  get(ac) {
    if (ac.member) {
      ac.member.permissions.hasPermission = function () {
        return this.canManagePermissions
            || this.canManageSettings
            || this.canManagePublicDocuments
            || this.canManageRoadCaptains;
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
