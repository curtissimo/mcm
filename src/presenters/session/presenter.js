let presenter = {
  get(ac) {
    let data = { message: 'hello, curtis', menu: '<pre>placeholder</pre>' };
    ac.addStylesheet('area');
    ac.render({ data: data, presenters: { menu: 'newsletters' } });
  }
};

export default presenter;
export var __useDefault = true; // Stupid hack for system.js
