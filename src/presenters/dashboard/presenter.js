let presenter = {
  get(ac) {
    ac.render({
      data: {
        member: ac.member
      },
      presenters: {
        menu: 'menu'
      },
      layout: 'chapter'
    });
  }
};

export default presenter;
