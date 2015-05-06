function nullLen(s) {
  if (s) {
    return s.trim().length;
  }
  return 0;
}

let presenter = {
  get(ac) {
    if (ac.member.address) {
      let len = nullLen(ac.member.address.street1)
              + nullLen(ac.member.address.street2)
              + nullLen(ac.member.address.city)
              + nullLen(ac.member.address.state)
              + nullLen(ac.member.address.zip);
      if (len === 0) {
        ac.member.address = null;
      }
    }
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
