const address0x = ethers.constants.AddressZero;
const burnAddress = "0x000000000000000000000000000000000000dead";

function bn(x) {
  return ethers.BigNumber.from(x);
}

function random32() {
  return ethers.utils.randomBytes(32);
}

function random32bn() {
  return ethers.BigNumber.from(ethers.utils.randomBytes(32));
}

async function increaseTime(t) {
  await ethers.provider.send("evm_increaseTime", [t.toNumber()]);
  await ethers.provider.send("evm_mine", []);
}

module.exports = {
  address0x,
  burnAddress,
  bn,
  random32,
  random32bn,
  increaseTime,
};
