let presenter = {
  get(ac) {
    let data = { name: ac.settings.name };
    let presenters = {};
    ac.render({ data: data, presenters: presenters });
  }
};

export default presenter;
