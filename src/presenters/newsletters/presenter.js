let presenter = {
  get(ac) {
    let data = {
      actions: {
        'Upload': '/chapter/newsletters/create-form'
      }
    };
    ac.render({
      data: data,
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  create(ac) {
    ac.render({
      data: {
        year: new Date().getFullYear(),
        months: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
        month: (new Date().getMonth() + 1) % 12
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  }
};

export default presenter;
