import member from '../../../models/member';

let presenter = {
  mileage(ac) {
    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }

      let entries = [];
      for (let entity of entities) {
        if (entity.mileage === undefined) {
          entity.mileage = [];
        }
        for (let mileage of entity.mileage) {
          entries.push({
            year: mileage[0],
            month: mileage[1],
            miles: mileage[2],
            who: entity
          });
        }
      }

      entries.sort((a, b) => {
        if (a.year < b.year) {
          return 1;
        }
        if (a.year > b.year) {
          return -1;
        }
        if (a.month < b.month) {
          return 1;
        }
        if (a.month > b.month) {
          return -1;
        }
        if (a.miles < b.miles) {
          return 1;
        }
        if (a.miles > b.miles) {
          return -1;
        }
        return 0;
      });

      ac.render({
        data: {
          entries: entries,
          title: "Mileage for the chapter"
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    })
  }
};

export default presenter;
