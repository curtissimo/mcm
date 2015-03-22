import fs from 'fs';
import newsletter from '../../models/newsletter';

let inProduction = process.env.NODE_ENV === 'production';
let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
let dest = inProduction ? process.cwd() + '/files' : process.cwd() + '/build/files';

let presenter = {
  get(ac) {
    let data = {
      months: months,
      actions: {
        'Upload': '/chapter/newsletters/create-form'
      }
    };
    newsletter.from(ac.chapterdb).all((e, newsletters) => {
      if (e) {
        return ac.error(e);
      }
      newsletters.reverse();
      data.newsletters = newsletters;
      ac.render({
        data: data,
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  item(ac) {
    let id = ac.params.id;

    newsletter.from(ac.chapterdb).get(id, (e, n) => {
      if (e) {
        return ac.error(e);
      }
      ac.file(n.path, n.fileName);
    });
  },

  create(ac) {
    ac.render({
      data: {
        year: new Date().getFullYear(),
        months: months,
        month: (new Date().getMonth() + 1) % 12
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  post(ac) {
    if (!Array.isArray(ac.files.file)) {
      ac.files.file = [ ac.files.file ];
    }

    let month = ac.body.month - 0;
    let year = ac.body.year - 0;
    let file = ac.files.file[0];

    let n = newsletter.new({
      month: month,
      year: year,
      path: file.path,
      fileName: file.originalname,
      authorId: ac.member._id
    });

    let validation = n.validate();

    if (validation.valid) {
      n.to(ac.chapterdb).save((e, savedNewsletter) => {
        if (e) {
          return ac.error(e);
        }
        let newPath = dest + '/' + file.name;
        fs.rename(file.path, newPath, e => {
          n.path = newPath;
          n.to(ac.chapterdb).save(err => {
            if (err) {
              return ac.error(err);
            }
            ac.redirect('/chapter/newsletters');
          });
        });
      });
    } else {
      let errors = {};
      for (let error of validation.errors) {
        errors[error.property] = error.message;

        if (error.property === 'month') {
          errors['month'] = 'cannot be left blank';
        }
      }
      ac.render({
        data: {
          year: year,
          month: month,
          months: months,
          errors: errors
        },
        view: 'create',
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    }
  }
};

export default presenter;
