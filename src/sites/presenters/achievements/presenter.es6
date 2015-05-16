import member from '../../../models/member';

let months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

let presenter = {
  list(ac) {
    member.from(ac.chapterdb).onlyWithAchievements((e, entities) => {
      if (e) {
        return ac.error(e);
      }
      ac.render({
        data: {
          members: entities,
          months: months,
          actions: {
            'Create': '/chapter/achievements/create'
          },
          title: 'Member achievements'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  create(ac) {
    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }
      ac.render({
        data: {
          members: entities,
          months: months,
          title: 'Create a new achievement'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  post(ac) {
    member.from(ac.chapterdb).get(ac.body.memberId, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      if (!entity.achievements) {
        entity.achievements = [];
      }

      entity.achievements.unshift(ac.body.achievement);

      entity.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }

        ac.redirect('/chapter/achievements');
      });
    });
  }
};

export default presenter;
