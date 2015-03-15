let presenter = {
  get(ac) {
    let data = { content: 'MY NEW MENU JUST FOR YOU!' };
    let presenters = {};
    ac.render({ data: data, presenters: presenters });
  }
};

export default presenter;
export var __useDefault = true; // Stupid hack for system.js
