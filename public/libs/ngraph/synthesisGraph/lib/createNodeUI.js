module.exports = function (node) {
  var anode = new AnimatedNode(node.id);
  return anode;
}

var colorLookup = [0x00FFFF, 0xFF5552];
var staticColor = 0xFF5552;
var width = 20

function AnimatedNode(label) {
  this.label = label;
  this.text = new PIXI.Text(label, {font: "10px Arial", align: "right"});

  this.color = staticColor; 
  this.frame = Math.random();
  this.width = width;
  this.v = 1 - Math.random() * 0.01;
}

AnimatedNode.prototype.renderFrame = function(frame) {
  if (this.frame < 0.6) {
    this.frame = 1;
    this.color = staticColor; 
    this.width = width;
    this.v = 0.99999 - Math.random() * 0.01;
  }

  this.frame *= this.v;
  frame.addChild(this.text);
}

