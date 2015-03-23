let presenter = {
  list(ac) {
    let data = { actions: {} };
    if (ac.member.permissions.canManageMembers) {
      data.actions['Add a new member'] = '/chapter/members/create-form';
    }
    ac.render({
      data: data,
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  item(ac) {
    ac.render({
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  create(ac) {
    ac.render({
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  }
};

export default presenter;
