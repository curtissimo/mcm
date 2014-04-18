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

this["leslie"]["lib/dashboard/views/get"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); partials = this.merge(partials, Handlebars.partials); data = data || {};
  var buffer = "", stack1, self=this;


  stack1 = self.invokePartial(partials.top, 'top', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n<div>Hello, Curtis</div>\n";
  stack1 = self.invokePartial(partials.bottom, 'bottom', depth0, helpers, partials, data);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });

if (typeof exports === 'object' && exports) {module.exports = this["leslie"];}