let presenter = {
  get(ac) {
    let data = {
      actions: {
        'Upload': '/chapter/newsletter?X-HTTP-Method-Override=new_get',
        'Delete': '/chapter/newsletter?X-HTTP-Method-Override=delete_get'
      }
    };
    ac.render({
      data: data,
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  }
};

export default presenter;
