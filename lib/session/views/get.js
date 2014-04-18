var glob = ('undefined' === typeof window) ? global : window,

Handlebars = glob.Handlebars || require('handlebars');

this["leslie"] = this["leslie"] || {};

Handlebars.registerPartial("bottom", Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "    <script src=\"/scripts/jquery-min.js\"></script>\n    <script src=\"/scripts/site.js\"></script>\n  </body>\n</html>\n";
  }));

Handlebars.registerPartial("top", Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<!!DOCTYPE html>\n<html>\n  <head>\n    <title>";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</title>\n    <link rel=\"stylesheet\" href=\"/css/pure.css\">\n    <link rel=\"stylesheet\" href=\"/css/site.css\">\n    <link rel=\"stylesheet\" href=\"/themes/"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.chapter)),stack1 == null || stack1 === false ? stack1 : stack1.theme)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "/theme.css\">\n  </head>\n  <body>\n";
  return buffer;
  }));

this["leslie"]["lib/session/views/get"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, helper, options, self=this, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  stack1 = self.invokePartial(partials.top, 'top', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n<div class=\"public-page\">\n  <div class=\"header\">\n  ";
  if (helper = helpers.header) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.header); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n  <div class=\"menu\">\n  ";
  if (helper = helpers.menu) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.menu); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n  <div class=\"content\">\n    <form class=\"pure-form pure-form-stacked\" method=\"post\" action=\""
    + escapeExpression((helper = helpers.pathTo || (depth0 && depth0.pathTo),options={hash:{},data:data},helper ? helper.call(depth0, "login", options) : helperMissing.call(depth0, "pathTo", "login", options)))
    + "\">\n      <fieldset>\n        <legend>Sign into the member's-only area</legend>\n\n        <label for=\"email\">your email address</label>\n        <input type=\"email\" name=\"email\" id=\"email\" placeholder=\"you@example.com\">\n\n        <label for=\"password\">your password</label>\n        <input type=\"password\" name=\"password\" id=\"password\" placeholder=\"your password\">\n\n        <button type=\"submit\" class=\"pure-button pure-button-primary\">Sign in</button>\n      </fieldset>\n    </form>\n  </div>\n  <div class=\"footer\">\n  ";
  if (helper = helpers.footer) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.footer); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</div>\n";
  stack1 = self.invokePartial(partials.bottom, 'bottom', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });

if (typeof exports === 'object' && exports) {module.exports = this["leslie"];}