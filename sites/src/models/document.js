import stork from 'stork-odm';

let document = stork.deliver('document', function () {
  this.string('fileName', { required: true });
  this.string('title', { required: true });
  this.string('path', { required: true });
  this.bool('private', { required: true });
  this.string('authorId', { required: true });
  this.string('description');
  this.timestamps();

  this.sort('title');

  this.view('privateOnly', function (doc, emitKey) {
    if (doc.private) {
      emitKey(doc.title);
    }
  });

  this.view('publicOnly', function (doc, emitKey) {
    if (!doc.private) {
      emitKey(doc.title);
    }
  });
});

export default document;
