const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bn, address0x, random32bn } = require('./Helper.js');

describe('CryptoChemical', () => {
  let owner, manager, beneficiary, notOwner;

  let cryptoChemical;

  before('Deploy contracts', async () => {
    [owner, manager, beneficiary, notOwner] = await ethers.getSigners();

    const CryptoChemical = await ethers.getContractFactory('CryptoChemical');
    cryptoChemical = await CryptoChemical.deploy('');
    await cryptoChemical.deployed();

    await cryptoChemical.setManager(manager.address);
  });

  function getMsgHash (to, amount, expiry, salt) {
    return ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256', 'uint256'],
        [cryptoChemical.address, to, amount, expiry, salt],
      ),
    );
  }

  it('Function Constructor', async () => {
    const uri = 'test cryptoChemical';

    const CryptoChemical = await ethers.getContractFactory('CryptoChemical');
    const newCryptoChemical = await CryptoChemical.deploy(uri);
    await newCryptoChemical.deployed();

    expect(await newCryptoChemical.name()).to.eq('Crypto Chemical Energy');
    expect(await newCryptoChemical.symbol()).to.eq('CCE');

    expect(await newCryptoChemical.uri(random32bn())).to.eq(uri);

    expect(await newCryptoChemical.manager()).to.eq(address0x);
  });
  it('Function setURI', async () => {
    const uri = 'new uri';

    await cryptoChemical.setURI(uri);

    expect(await cryptoChemical.uri(random32bn())).to.eq(uri);
  });
  it('Function mintEnergy', async () => {
    const amount = random32bn();

    const prevBal = await cryptoChemical['balanceOf(address)'](beneficiary.address);

    await cryptoChemical.mintEnergy(beneficiary.address, amount);

    expect(await cryptoChemical['balanceOf(address)'](beneficiary.address)).to.eq(prevBal.add(amount));
  });
  it('Function cancelSignHash', async () => {
    const msgHash = await getMsgHash(beneficiary.address, random32bn(), random32bn(), random32bn());

    await expect(await cryptoChemical.cancelSignHash(msgHash))
      .to.emit(cryptoChemical, 'CancelHash');

    expect(await cryptoChemical.canceledMsgHashes(msgHash)).to.be.true;
  });
  describe('Function signMintEnergy', () => {
    it('Mint energy with signature', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      const prevBeneficiaryAmount = await cryptoChemical['balanceOf(address)'](beneficiary.address);

      await expect(await cryptoChemical.connect(beneficiary).signMintEnergy(
        beneficiary.address,
        mintAmount,
        expiry,
        salt,
        signature,
      )).to.emit(cryptoChemical, 'SignMintEnergy');

      expect(await cryptoChemical['balanceOf(address)'](beneficiary.address)).to.eq(prevBeneficiaryAmount.add(mintAmount));
      expect(await cryptoChemical.canceledMsgHashes(msgHash)).to.be.true;
    });
    it('Try mint energy with expired signature', async () => {
      await expect(
        cryptoChemical.connect(beneficiary).signMintEnergy(beneficiary.address, 1, 0, 1, []),
      ).to.be.revertedWith('signMintEnergy: The signature has expired');
    });
    it('Try mint energy with cancel hash', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await cryptoChemical.cancelSignHash(msgHash);

      await expect(
        cryptoChemical.connect(beneficiary).signMintEnergy(
          beneficiary.address,
          mintAmount,
          expiry,
          salt,
          signature,
        ),
      ).to.be.revertedWith('signMintEnergy: The signature was canceled');
    });
    it('Try mint energy with wrong signature', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await cryptoChemical.cancelSignHash(msgHash);

      await expect(
        cryptoChemical.connect(beneficiary).signMintEnergy(
          beneficiary.address,
          mintAmount.add(bn(9)),
          expiry,
          salt,
          signature,
        ),
      ).to.be.revertedWith('signMintEnergy: Invalid owner signature');

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash(beneficiary.address, mintAmount, expiry, saltUser);
      const signatureUser = await beneficiary.signMessage(msgHashUser);

      await expect(
        cryptoChemical.signMintEnergy(
          beneficiary.address,
          mintAmount,
          expiry,
          saltUser,
          signatureUser,
        ),
      ).to.be.revertedWith('signMintEnergy: Invalid owner signature');
    });
  });
  describe('OnlyOwner functions', () => {
    it('setURI', async () => {
      await expect(cryptoChemical.connect(notOwner).setURI(''))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('setManager', async () => {
      await expect(cryptoChemical.connect(notOwner).setManager(address0x))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('mintEnergy', async () => {
      await expect(cryptoChemical.connect(notOwner).mintEnergy(notOwner.address, 1))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('cancelSignHash', async () => {
      const msgHash = await getMsgHash(beneficiary.address, random32bn(), random32bn(), random32bn());

      await expect(cryptoChemical.connect(notOwner).cancelSignHash(msgHash))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
  describe('Function setManager', () => {
    it('Set a new manager', async () => {
      await expect(await cryptoChemical.setManager(owner.address))
        .to.emit(cryptoChemical, 'SetManager')
        .withArgs(owner.address);

      expect(await cryptoChemical.manager()).to.eq(owner.address);

      await cryptoChemical.setManager(manager.address);
    });
    it('Try set a address(0) as manager', async () => {
      await expect(cryptoChemical.setManager(address0x))
        .to.be.revertedWith('setManager: Manager 0x0 is not valid');
    });
  });
  describe('Function mint', () => {
    it('Mint random tokens', async () => {
      const id = random32bn();
      const amount = random32bn();

      const prevBal = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, id);

      await cryptoChemical.connect(manager).mint(beneficiary.address, id, amount, []);

      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, id),
      ).to.eq(prevBal.add(amount));
    });
    it('Try mint without being the manager', async () => {
      await expect(cryptoChemical.connect(owner).mint(owner.address, 0, 1, []))
        .to.be.revertedWith('mint: Only the manage');
    });
  });
  describe('Function mintBatch', () => {
    it('Mint a batch of 3 random tokens', async () => {
      const ids = [random32bn(), random32bn(), random32bn()];
      const amounts = [random32bn(), random32bn(), random32bn()];

      const beneficiaryArray = [beneficiary.address, beneficiary.address, beneficiary.address];
      const prevBal = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);

      await cryptoChemical.connect(manager).mintBatch(
        beneficiary.address,
        ids,
        amounts,
        [],
      );

      const postAmounts = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);
      expect(postAmounts[0]).to.eq(prevBal[0].add(amounts[0]));
      expect(postAmounts[1]).to.eq(prevBal[1].add(amounts[1]));
      expect(postAmounts[2]).to.eq(prevBal[2].add(amounts[2]));
    });
    it('Try mintBatch without being the manager', async () => {
      await expect(cryptoChemical.connect(owner).mintBatch(owner.address, [0], [1], []))
        .to.be.revertedWith('mintBatch: Only the manager');
    });
  });
  describe('Function burn', () => {
    it('Function burn', async () => {
      const id = random32bn();
      const amount = random32bn();

      await cryptoChemical.connect(manager).mint(beneficiary.address, id, amount, []);

      const prevBal = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, id);

      await cryptoChemical.connect(manager).burn(beneficiary.address, id, amount);

      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, id),
      ).to.eq(prevBal.sub(amount));
    });
    it('Try burn without being the manager', async () => {
      const id = random32bn();
      const amount = random32bn();

      await cryptoChemical.connect(manager).mint(beneficiary.address, id, amount, []);

      await expect(cryptoChemical.connect(owner).burn(beneficiary.address, id, amount))
        .to.be.revertedWith('burn: Only the manager');
    });
  });
  describe('Function burnBatch', () => {
    it('Function burnBatch', async () => {
      const ids = [random32bn(), random32bn(), random32bn()];
      const amounts = [random32bn(), random32bn(), random32bn()];

      await cryptoChemical.connect(manager).mintBatch(beneficiary.address, ids, amounts, []);

      const beneficiaryArray = [beneficiary.address, beneficiary.address, beneficiary.address];
      const prevBal = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);

      await cryptoChemical.connect(manager).burnBatch(beneficiary.address, ids, amounts);

      const postAmounts = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);
      expect(postAmounts[0]).to.eq(prevBal[0].sub(amounts[0]));
      expect(postAmounts[1]).to.eq(prevBal[1].sub(amounts[1]));
      expect(postAmounts[2]).to.eq(prevBal[2].sub(amounts[2]));
    });
    it('Try burn a batch without being the manager', async () => {
      const ids = [random32bn(), random32bn(), random32bn()];
      const amounts = [random32bn(), random32bn(), random32bn()];

      await cryptoChemical.connect(manager).mintBatch(beneficiary.address, ids, amounts, []);

      await expect(cryptoChemical.connect(owner).burnBatch(beneficiary.address, ids, amounts))
        .to.be.revertedWith('burnBatch: Only the manager');
    });
  });
});
