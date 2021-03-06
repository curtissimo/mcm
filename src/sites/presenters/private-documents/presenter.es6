import fs from 'fs';
import document from '../../../models/document';

let inProduction = process.env.NODE_ENV === 'production';
let dest = inProduction ? process.cwd() + '/../../files' : process.cwd() + '/build/sites/files';

let presenter = {
  get(ac) {
    let data = {
      title: 'Chapter Documents',
      actions: {},
      canManage: ac.member.permissions.canManagePrivateDocuments
    };
    if (data.canManage) {
      data.actions['Upload'] = '/chapter/private-documents/create-form';
      data.actions['Delete'] = '/chapter/private-documents/delete-form';
    }
    document.from(ac.chapterdb).privateOnly((e, documents) => {
      if (e) {
        return ac.error(e);
      }
      data.documents = documents;
      if (documents.length === 0) {
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

    document.from(ac.chapterdb).get(id, (e, n) => {
      if (e && e.status_code === 404) {
        return ac.notFound();
      } else if (e) {
        return ac.error(e);
      }
      ac.file(n.path, n.fileName, ac.account.subdomain);
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManagePrivateDocuments) {
      return ac.unauthorized();
    }
    ac.render({
      data: {
        title: 'Upload a Chapter Document',
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  delete(ac) {
    let id = ac.body.id;

    if (id === undefined) {
      return ac.redirect('/chapter/private-documents');
    }

    document.from(ac.chapterdb).get(id, (e, n) => {
      if (e) {
        return ac.error(e);
      }
      n.to(ac.chapterdb).destroy(err => {
        if (err) {
          return ac.error(e);
        }
        fs.unlink(n.path, error => {
          ac.redirect('/chapter/private-documents');
        });
      });
    });
  },

  deleteForm(ac) {
    if (!ac.member.permissions.canManagePrivateDocuments) {
      return ac.unauthorized();
    }
    document.from(ac.chapterdb).privateOnly((e, documents) => {
      if (e) {
        return ac.error(e);
      }
      ac.render({
        data: {
          documents: documents,
          title: 'Delete a Chapter Document'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter',
        view: 'delete-form'
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManagePrivateDocuments) {
      return ac.unauthorized();
    }

    if (!Array.isArray(ac.files.file)) {
      ac.files.file = [ ac.files.file ];
    }

    let month = ac.body.month - 0;
    let description = ac.body.description;
    let year = ac.body.year - 0;
    let file = ac.files.file[0] || { path: '' };

    let newDir = dest + '/' + ac.account.subdomain;
    let newPath = dest + '/' + ac.account.subdomain + '/' + file.name;
    fs.mkdir(newDir, () => {
      fs.rename(file.path, newPath, () => {
        let n = document.new({
          private: true,
          path: newPath,
          description: description,
          fileName: file.originalname,
          authorId: ac.member._id,
          title: ac.body.docTitle
        });
        let validation = n.validate();
        
        if (validation.valid) {
          n.to(ac.chapterdb).save((e, savedDocument) => {
            if (e) {
              return ac.error(e);
            }
            ac.redirect('/chapter/private-documents');
          });
        } else {
          let errors = {};
          for (let error of validation.errors) {
            errors[error.property] = error.message;
          }
          if (errors.title) {
            errors.docTitle = errors.title;
          }
          if (file.path.length === 0) {
            errors.file = true;
          }
          let data = {
            title: 'Error Uploading Private Document',
            errors: errors
          };
          Object.assign(data, ac.body);
          console.log('data:', data);
          ac.render({
            data: data,
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
