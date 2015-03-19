let presenter = {
  get(ac) {
    let data = {
      name: ac.settings.name,
      member: ac.member
    };
    let presenters = {};
    ac.render({ data: data, presenters: presenters });
  }
};

export default presenter;
