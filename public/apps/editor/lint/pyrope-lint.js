// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Depends on jsonlint.js from https://github.com/zaach/jsonlint

// declare global: jsonlint

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../libs/codemirror/lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../libs/codemirror/codelib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("lint", "pyrope", function(text) {
  var found = [];
  /*var found = new Array();
  var illegal = 'potato';
  var text2 = text;
  var dropped = 0;
  while(text2.length > 0) {
    var t = text2.indexOf(illegal);
    if(t != -1) {
      var pos = get_cmpos(text, dropped + t);
      found.push({from: CodeMirror.Pos(pos.ln, pos.ch), to: CodeMirror.Pos(pos.ln, pos.ch + illegal.length), message: 'Oops!'});
      text2 = text2.substr(t + illegal.length);
      dropped += t + illegal.length;
    } else {
      text2 = '';
    }
  } */

  try {
    pyrope_parser.parse(text);
  } catch (err) {
    if (err instanceof pyrope_parser.SyntaxError) {
      //console.log('-'.dup(err.column) + '^');
      console.log(err.line + ' :: ' + err.column);
      found.push({from: CodeMirror.Pos(err.line - 1, err.column - 1), to: CodeMirror.Pos(err.line - 1, err.column), message: err.message});
    } else {
      console.log(err);
    }
  }

  return found;
});

});

function get_cmpos (text, index) {
  console.log(index + ' : ' + text.charAt(index));
  var ln = 0;
  while(text.length > 0) {
    var t = text.indexOf('\n');
    if(index < t || t == -1) {
      return {ln: ln, ch: index};
    } else {
      ln ++;
      index -= t + 1;
      console.log(t);
      text = text.substr(t + 1);
    }
  }
  return null;
}