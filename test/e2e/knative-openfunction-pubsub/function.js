async function writeKnativePubsub(ctx, data) {
  console.log('✅ Function should receive request: %o', data);
  await ctx.send(data);
  ctx.res.send(data);
}

module.exports = {
  writeKnativePubsub,
};