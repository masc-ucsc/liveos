
module.exports.createGraph = function () {
  var createGraph = require('ngraph.graph');
  graph = createGraph();
  return graph;
}

module.exports.createPixiGraphics = function(graph, settings, callbackclick) {

  var self = this;
  var merge = require('./lib/custom_merge');

  //default settings:
  settings = merge(settings, {
    container: document.body,
    background: 0x000000,
    physics: { springLength: 30, springCoeff: 0.0000, dragCoeff: 0.01, gravity: -1, theta: 1 }
  });

  /*
  if (!settings.layout) {
    //FIXME: write a custom layouter
    //FIXME: remove physics?
    var createLayout = require('ngraph.forcelayout'),
        physics = require('ngraph.physics.simulator');

    settings.layout = createLayout(graph, physics(settings.physics));
  }*/

  //some default parameters
  this.edgeWidth = 7;
  this.nodeWidth = 20;

  var createPixiGraph = require('ngraph.pixi');
  var pixiGraphics = createPixiGraph(graph, settings, callbackclick);

  // setup our custom looking nodes and links:
  pixiGraphics.createNodeUI(require('./lib/createNodeUI'))
    .renderNode(require('./lib/renderNode'))
    .createLinkUI(function(link) { return { width: self.edgeWidth }; }) 
    .renderLink(require('./lib/renderLink'));

  // just make sure first node does not move:
  var layout = pixiGraphics.layout;
  //layout.pinNode(graph.getNode(1), true);

  // begin animation loop:
  pixiGraphics.run();

  return pixiGraphics;
}

