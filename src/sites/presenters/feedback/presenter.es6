let presenter = {
  item(ac) {
    ac.render({
      data: {
        thanks: ac.query.hasOwnProperty('thanks')
      },
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  post(ac) {
    ac.redirect('/chapter/feedback?thanks');
  }
};

export default presenter;
