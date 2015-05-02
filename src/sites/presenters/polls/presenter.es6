let presenter = {
  list(ac) {
    ac.render({
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  create(ac) {
    ac.render({
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  edit(ac) {
    ac.render({
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  delete(ac) {
    ac.render({
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  put(ac) {
    ac.redirect('/chapter/polls');
  },

  post(ac) {
    ac.redirect('/chapter/polls');
  },

  destroy(ac) {
    ac.redirect('/chapter/polls');
  }
};

export default presenter;
