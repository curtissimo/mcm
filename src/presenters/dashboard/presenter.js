let presenter = {
  get(ac) {
    ac.render({
      data: {
        member: ac.member,
        title: 'My Page'
      },
      presenters: {
        menu: 'menu'
      },
      layout: 'chapter'
    });
  }
};

export default presenter;
