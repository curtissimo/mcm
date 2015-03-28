import fs from 'fs';
import document from '../../models/document';

let inProduction = process.env.NODE_ENV === 'production';
let dest = inProduction ? process.cwd() + '/files' : process.cwd() + '/build/files';

let presenter = {
  get(ac) {
    let canManage = ac.member && ac.member.permissions.canManagePublicDocuments;
    let data = {
      title: 'Public Documents',
      actions: {},
      canManage: canManage
    };
    if (data.canManage) {
      data.actions['Upload'] = '/chapter/public-documents/create-form';
      data.actions['Delete'] = '/chapter/public-documents/delete-form';
    }
    document.from(ac.chapterdb).publicOnly((e, documents) => {
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
      ac.file(n.path, n.fileName);
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManagePublicDocuments) {
      return ac.unauthorized();
    }
    ac.render({
      data: {
        title: 'Upload a Public Document',
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  delete(ac) {
    let id = ac.body.id;

    if (id === undefined) {
      return ac.redirect('/chapter/public-documents');
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
          ac.redirect('/chapter/public-documents');
        });
      });
    });
  },

  deleteForm(ac) {
    if (!ac.member.permissions.canManagePublicDocuments) {
      return ac.unauthorized();
    }
    document.from(ac.chapterdb).publicOnly((e, documents) => {
      if (e) {
        return ac.error(e);
      }
      ac.render({
        data: {
          documents: documents,
          title: 'Delete a Public Document'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter',
        view: 'delete-form'
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManagePublicDocuments) {
      return ac.unauthorized();
    }

    if (!Array.isArray(ac.files.file)) {
      ac.files.file = [ ac.files.file ];
    }

    let month = ac.body.month - 0;
    let description = ac.body.description;
    let year = ac.body.year - 0;
    let file = ac.files.file[0] || { path: '' };

    let newPath = dest + '/' + file.name;
    fs.rename(file.path, newPath, e => {
      let n = document.new({
        private: false,
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
          ac.redirect('/chapter/public-documents');
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
          title: 'Error Uploading Public Document',
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
  }
};

export default presenter;
