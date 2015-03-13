let presenter = {
  get(ac) {
    ac.data = { message: 'hello, curtis' };
    ac.addStylesheet('area.css');
    return ac;
  }
};

export default presenter;
export var __useDefault = true; // Stupid hack for system.js
