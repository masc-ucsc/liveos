module.exports = function (animatedNode, ctx) {
  animatedNode.renderFrame(ctx);
  ctx.lineStyle(0);
  ctx.beginFill(animatedNode.color,1);
  ctx.drawRect(animatedNode.pos.x, animatedNode.pos.y, animatedNode.width, animatedNode.width);

  animatedNode.text.position.x = animatedNode.pos.x;
  animatedNode.text.position.y = animatedNode.pos.y;
}
