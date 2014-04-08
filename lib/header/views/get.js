var glob = ('undefined' === typeof window) ? global : window,

Handlebars = glob.Handlebars || require('handlebars');

this["leslie"] = this["leslie"] || {};

Handlebars.registerPartial("bottom", Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "  </body>\n</html>\n";
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

this["leslie"]["lib/header/views/get"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div>";
  if (helper = helpers.content) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.content); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</div>";
  return buffer;
  });

if (typeof exports === 'object' && exports) {module.exports = this["leslie"];}