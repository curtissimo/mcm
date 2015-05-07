let presenter = {
  mileage(ac) {
    ac.render({
      data: {
        title: "Mileage for the chapter"
      },
      presenters: { menu: 'menu' }
    })
  }
};

export default presenter;
