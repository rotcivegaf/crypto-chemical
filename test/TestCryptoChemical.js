const CryptoChemical = artifacts.require('CryptoChemical');

const {
  expect,
  toEvents,
  tryCatchRevert,
  address0x,
  bn,
  random32bn,
} = require('./Helper.js');

contract('CryptoChemical', (accounts) => {
  const owner = accounts[1];
  const manager = accounts[2];
  const beneficiary = accounts[3];
  const notOwner = accounts[4];

  let cryptoChemical;

  before('Deploy contracts', async () => {
    cryptoChemical = await CryptoChemical.new('', { from: owner });
    await cryptoChemical.setManager(manager, { from: owner });
  });

  function getMsgHash (to, amount, expiry, salt) {
    return web3.utils.soliditySha3(
      { t: 'address', v: cryptoChemical.address },
      { t: 'address', v: to },
      { t: 'uint256', v: amount },
      { t: 'uint256', v: expiry },
      { t: 'uint256', v: salt },
    );
  }

  it('Function Constructor', async () => {
    const uri = 'test cryptoChemical';

    const newCryptoChemical = await CryptoChemical.new(uri, { from: owner });

    assert.equal(await newCryptoChemical.name(), 'Crypto Chemical Energy');
    assert.equal(await newCryptoChemical.symbol(), 'CCE');

    assert.equal(await newCryptoChemical.uri(random32bn()), uri);

    assert.equal(await newCryptoChemical.manager(), address0x);
  });
  it('Function setURI', async () => {
    const uri = 'new uri';

    await cryptoChemical.setURI(uri, { from: owner });

    assert.equal(await cryptoChemical.uri(random32bn()), uri);
  });
  it('Function mintEnergy', async () => {
    const amount = random32bn();

    const prevBal = await cryptoChemical.balanceOf(beneficiary);

    await cryptoChemical.mintEnergy(beneficiary, amount, { from: owner });

    expect(await cryptoChemical.balanceOf(beneficiary)).to.eq.BN(prevBal.add(amount));
  });
  it('Function burn', async () => {
    const id = random32bn();
    const amount = random32bn();

    await cryptoChemical.mint(beneficiary, id, amount, [], { from: manager });

    const prevBal = await cryptoChemical.balanceOf(beneficiary, id);

    await cryptoChemical.burn(
      beneficiary,
      id,
      amount,
      { from: manager },
    );

    expect(await cryptoChemical.balanceOf(beneficiary, id)).to.eq.BN(prevBal.sub(amount));
  });
  it('Function burnBatch', async () => {
    const ids = [random32bn(), random32bn(), random32bn()];
    const amounts = [random32bn(), random32bn(), random32bn()];

    await cryptoChemical.mintBatch(beneficiary, ids, amounts, [], { from: manager });

    const beneficiaryArray = [beneficiary, beneficiary, beneficiary];
    const prevBal = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);

    await cryptoChemical.burnBatch(
      beneficiary,
      ids,
      amounts,
      { from: manager },
    );

    const postAmounts = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);
    expect(postAmounts[0]).to.eq.BN(prevBal[0].sub(amounts[0]));
    expect(postAmounts[1]).to.eq.BN(prevBal[1].sub(amounts[1]));
    expect(postAmounts[2]).to.eq.BN(prevBal[2].sub(amounts[2]));
  });
  it('Function cancelSignHash', async () => {
    const msgHash = await getMsgHash(beneficiary, random32bn(), random32bn(), random32bn());

    await toEvents(
      cryptoChemical.cancelSignHash(
        msgHash,
        { from: owner },
      ),
      'CancelHash',
    );

    assert.isTrue(await cryptoChemical.canceledMsgHashes(msgHash));
  });
  describe('Function signMintEnergy', () => {
    it('Mint energy with signature', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      const prevBeneficiaryAmount = await cryptoChemical.balanceOf(beneficiary);

      await toEvents(
        cryptoChemical.signMintEnergy(
          beneficiary,
          mintAmount,
          expiry,
          salt,
          signature,
          { from: beneficiary },
        ),
        'SignMintEnergy',
      );

      expect(await cryptoChemical.balanceOf(beneficiary)).to.eq.BN(prevBeneficiaryAmount.add(mintAmount));
      assert.isTrue(await cryptoChemical.canceledMsgHashes(msgHash));
    });
    it('Try mint energy with expired signature', async () => {
      await tryCatchRevert(
        () => cryptoChemical.signMintEnergy(
          beneficiary,
          1,
          0,
          1,
          [],
          { from: beneficiary },
        ),
        'signMintEnergy: The signature has expired',
      );
    });
    it('Try mint energy with cancel hash', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await cryptoChemical.cancelSignHash(msgHash, { from: owner });

      await tryCatchRevert(
        () => cryptoChemical.signMintEnergy(
          beneficiary,
          mintAmount,
          expiry,
          salt,
          signature,
          { from: beneficiary },
        ),
        'signMintEnergy: The signature was canceled',
      );
    });
    it('Try mint energy with wrong signature', async () => {
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await cryptoChemical.cancelSignHash(msgHash, { from: owner });

      await tryCatchRevert(
        () => cryptoChemical.signMintEnergy(
          beneficiary,
          mintAmount.add(bn(9)),
          expiry,
          salt,
          signature,
          { from: beneficiary },
        ),
        'signMintEnergy: Invalid owner signature',
      );

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash(beneficiary, mintAmount, expiry, saltUser);
      const signatureUser = await web3.eth.sign(msgHashUser, beneficiary);

      await tryCatchRevert(
        () => cryptoChemical.signMintEnergy(
          beneficiary,
          mintAmount,
          expiry,
          saltUser,
          signatureUser,
          { from: owner },
        ),
        'signMintEnergy: Invalid owner signature',
      );
    });
  });
  describe('OnlyOwner functions', () => {
    it('setURI', async () => {
      await tryCatchRevert(
        () => cryptoChemical.setURI(
          '',
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
    it('setManager', async () => {
      await tryCatchRevert(
        () => cryptoChemical.setManager(
          address0x,
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
    it('mintEnergy', async () => {
      await tryCatchRevert(
        () => cryptoChemical.mintEnergy(
          notOwner,
          1,
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
    it('cancelSignHash', async () => {
      const msgHash = await getMsgHash(beneficiary, random32bn(), random32bn(), random32bn());

      await tryCatchRevert(
        () => cryptoChemical.cancelSignHash(
          msgHash,
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
  });
  describe('Function setManager', () => {
    it('Set a new manager', async () => {
      const SetManager = await toEvents(
        cryptoChemical.setManager(
          owner,
          { from: owner },
        ),
        'SetManager',
      );

      assert.equal(SetManager._manager, owner);

      assert.equal(await cryptoChemical.manager(), owner);

      await cryptoChemical.setManager(manager, { from: owner });
    });
    it('Try set a address(0) as manager', async () => {
      await tryCatchRevert(
        () => cryptoChemical.setManager(
          address0x,
          { from: owner },
        ),
        'setManager: Manager 0x0 is not valid',
      );
    });
  });
  describe('Function mint', () => {
    it('Mint random tokens', async () => {
      const id = random32bn();
      const amount = random32bn();

      const prevBal = await cryptoChemical.balanceOf(beneficiary, id);

      await cryptoChemical.mint(
        beneficiary,
        id,
        amount,
        [],
        { from: manager },
      );

      expect(await cryptoChemical.balanceOf(beneficiary, id)).to.eq.BN(prevBal.add(amount));
    });
    it('Try mint without being the manager', async () => {
      await tryCatchRevert(
        () => cryptoChemical.mint(
          owner,
          0,
          1,
          [],
          { from: owner },
        ),
        'mint: Only the manager can mint',
      );
    });
  });
  describe('Function mintBatch', () => {
    it('Mint a batch of 3 random tokens', async () => {
      const ids = [random32bn(), random32bn(), random32bn()];
      const amounts = [random32bn(), random32bn(), random32bn()];

      const beneficiaryArray = [beneficiary, beneficiary, beneficiary];
      const prevBal = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);

      await cryptoChemical.mintBatch(
        beneficiary,
        ids,
        amounts,
        [],
        { from: manager },
      );

      const postAmounts = await cryptoChemical.balanceOfBatch(beneficiaryArray, ids);
      expect(postAmounts[0]).to.eq.BN(prevBal[0].add(amounts[0]));
      expect(postAmounts[1]).to.eq.BN(prevBal[1].add(amounts[1]));
      expect(postAmounts[2]).to.eq.BN(prevBal[2].add(amounts[2]));
    });
    it('Try mintBatch without being the manager', async () => {
      await tryCatchRevert(
        () => cryptoChemical.mintBatch(
          owner,
          [0],
          [1],
          [],
          { from: owner },
        ),
        'mintBatch: Only the manager can mint',
      );
    });
  });
});
