let controller = {
  get(ac) {
    ac.data = { message: 'hello, curtis' };
    ac.addStylesheet('area.css');
    return ac;
  }
};

export default controller;
export var __useDefault = true; // Stupid hack for system.js
