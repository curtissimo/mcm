let presenter = {
  get(ac) {
    ac.render({ presenters: { menu: 'menu' }, layout: 'chapter' });
  }
};

export default presenter;
