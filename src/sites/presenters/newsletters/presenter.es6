import fs from 'fs';
import newsletter from '../../../models/newsletter';

let inProduction = process.env.NODE_ENV === 'production';
let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
let dest = inProduction ? process.cwd() + '/../../files' : process.cwd() + '/build/sites/files';

let presenter = {
  get(ac) {
    let data = {
      title: 'Chapter Newsletters',
      months: months,
      actions: {},
      canManageNewsletters: ac.member.permissions.canManageNewsletters
    };
    if (data.canManageNewsletters) {
      data.actions['Upload'] = '/chapter/newsletters/create-form';
      data.actions['Delete'] = '/chapter/newsletters/delete-form';
    }
    newsletter.from(ac.chapterdb).all((e, newsletters) => {
      if (e) {
        return ac.error(e);
      }
      newsletters.reverse();
      data.newsletters = newsletters;
      if (newsletters.length === 0) {
        delete data.actions['Delete'];
      }
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
      if (e && e.status_code === 404) {
        return ac.notFound();
      } else if (e) {
        return ac.error(e);
      }
      ac.file(n.path, n.fileName, ac.account.subdomain);
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManageNewsletters) {
      return ac.unauthorized();
    }
    ac.render({
      data: {
        title: 'Upload a Newsletter',
        year: new Date().getFullYear(),
        months: months,
        month: (new Date().getMonth() + 1) % 12
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  delete(ac) {
    let id = ac.body.id;

    if (id === undefined) {
      return ac.redirect('/chapter/newsletters');
    }

    newsletter.from(ac.chapterdb).get(id, (e, n) => {
      if (e) {
        return ac.error(e);
      }
      n.to(ac.chapterdb).destroy(err => {
        if (err) {
          return ac.error(e);
        }
        fs.unlink(n.path, error => {
          ac.redirect('/chapter/newsletters');
        });
      });
    });
  },

  deleteForm(ac) {
    if (!ac.member.permissions.canManageNewsletters) {
      return ac.unauthorized();
    }
    newsletter.from(ac.chapterdb).all((e, newsletters) => {
      if (e) {
        return ac.error(e);
      }
      newsletters.reverse();
      ac.render({
        data: {
          newsletters: newsletters,
          months: months,
          title: 'Delete a Newsletter'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter',
        view: 'delete-form'
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageNewsletters) {
      return ac.unauthorized();
    }

    if (!Array.isArray(ac.files.file)) {
      ac.files.file = [ ac.files.file ];
    }

    let month = ac.body.month - 0;
    let description = ac.body.description;
    let year = ac.body.year - 0;
    let file = ac.files.file[0];

    let newDir = dest + '/' + ac.account.subdomain;
    let newPath = dest + '/' + ac.account.subdomain + '/' + file.name;
    fs.mkdir(newDir, () => {
      fs.rename(file.path, newPath, () => {
        let n = newsletter.new({
          month: month,
          year: year,
          path: newPath,
          description: description,
          fileName: file.originalname,
          authorId: ac.member._id
        });
        let validation = n.validate();
        
        if (validation.valid) {
          n.to(ac.chapterdb).save((e, savedNewsletter) => {
            if (e) {
              return ac.error(e);
            }
            ac.redirect('/chapter/newsletters');
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
              title: 'Error Uploading Newsletter',
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
      });
    });
  }
};

export default presenter;
