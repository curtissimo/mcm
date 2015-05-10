import stork from 'stork-odm';

let blog = stork.deliver('blog', function () {
  this.string('title');
  this.string('content');
  this.timestamps();

  this.view('byAuthorAndDate', (blog, emitKey) => {
    emitKey([ blog['$member_blogs_id'], blog.createdOn ]);
  });
});

export default blog;
