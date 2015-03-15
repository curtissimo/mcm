let presenter = {
  get(ac) {
    let data = {
      title: 'Log in',
    };
    ac.addStylesheet('area');
    ac.render({ data: data, presenters: { menu: 'menu' } });
  },

  put(ac) {
    ac.redirect('/session');
  }
};

export default presenter;
export var __useDefault = true; // Stupid hack for system.js
