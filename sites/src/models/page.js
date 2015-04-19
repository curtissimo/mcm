import stork from 'stork-odm';

let page = stork.deliver('page', function () {
  this.number('order');                           // order
  this.array('sections');                         // sections
  this.string('title');                           // title 
  this.bool('hidden');                            // hidden

  this.view('onlyPublicPages', function (page, emitKey) {
    if (!page.hidden) {
      emitKey([ page.order, page.title ]);
    }
  });
});

export default page;
