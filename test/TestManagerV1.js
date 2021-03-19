const CryptoChemical = artifacts.require('CryptoChemical');

const ManagerV1 = artifacts.require('ManagerV1');

const {
  expect,
  toEvents,
  tryCatchRevert,
  address0x,
  burnAddress,
  bn,
  random32bn,
} = require('./Helper.js');

contract('ManagerV1', (accounts) => {
  const owner = accounts[1];
  const user = accounts[2];
  const beneficiary = accounts[3];
  const notOwner = accounts[4];

  let cryptoChemical;
  let managerV1;

  let START_ATOMS_IDS;
  let END_ATOMS_IDS;
  let BASE_ENERGY_MINT_ATOM;
  let BASE_ENERGY_BURN_ATOM;

  function getMsgHash (to, id, amount, expiry, salt) {
    return web3.utils.soliditySha3(
      { t: 'address', v: managerV1.address },
      { t: 'address', v: cryptoChemical.address },
      { t: 'address', v: to },
      { t: 'uint256', v: id },
      { t: 'uint256', v: amount },
      { t: 'uint256', v: expiry },
      { t: 'uint256', v: salt },
    );
  }

  function getMsgHash3Batch (to, ids, amounts, expiry, salt) {
    return web3.utils.soliditySha3(
      { t: 'address', v: managerV1.address },
      { t: 'address', v: cryptoChemical.address },
      { t: 'address', v: to },
      { t: 'uint256[3]', v: ids },
      { t: 'uint256[3]', v: amounts },
      { t: 'uint256', v: expiry },
      { t: 'uint256', v: salt },
    );
  }

  before('Deploy contracts', async () => {
    cryptoChemical = await CryptoChemical.new('', { from: owner });
    managerV1 = await ManagerV1.new(cryptoChemical.address, { from: owner });

    await cryptoChemical.setManager(managerV1.address, { from: owner });

    await cryptoChemical.setApprovalForAll(managerV1.address, true, { from: user });
    START_ATOMS_IDS = await managerV1.START_ATOMS_IDS();
    END_ATOMS_IDS = await managerV1.END_ATOMS_IDS();
    BASE_ENERGY_MINT_ATOM = await managerV1.BASE_ENERGY_MINT_ATOM();
    BASE_ENERGY_BURN_ATOM = await managerV1.BASE_ENERGY_BURN_ATOM();
  });

  it('Function Constructor', async () => {
    const newManagerV1 = await ManagerV1.new(cryptoChemical.address, { from: owner });

    assert.equal(await newManagerV1.versionName(), 'Atoms');
    assert.equal(await newManagerV1.cryptoChemical(), cryptoChemical.address);

    assert.equal(await newManagerV1.NEUTRON(), 0);
    assert.equal(await newManagerV1.PROTON(), 1);
    assert.equal(await newManagerV1.ELECTRON(), 2);

    assert.equal(await newManagerV1.START_ATOMS_IDS(), 3);
    assert.equal(await newManagerV1.END_ATOMS_IDS(), 121);
    assert.equal(await newManagerV1.BASE_ENERGY_MINT_ATOM(), 100);
    assert.equal(await newManagerV1.BASE_ENERGY_BURN_ATOM(), 70);
    assert.equal(await newManagerV1.ATOMS_IN_ARRAY(), 32);
    assert.equal(await newManagerV1.BYTE_LENGTH_IN_BIT(), 8);

    assert.equal(await newManagerV1.MATS_IDS(0), 0);
    assert.equal(await newManagerV1.MATS_IDS(1), 1);
    assert.equal(await newManagerV1.MATS_IDS(2), 2);

    assert.equal(await newManagerV1.atomsNeutron(0), '0x00020405060607080a0a0c0c0e0e101012161414181a1c1c1e1e201f23232729');
    assert.equal(await newManagerV1.atomsNeutron(1), '0x2a2d2d3030323233343637393a3c3d404245474c4a4d4e51525252545458595d');
    assert.equal(await newManagerV1.atomsNeutron(2), '0x5e6162636467686a6c6e6f72737576797b7d7e7e7d86888a8a8e8c9290969497');
    assert.equal(await newManagerV1.atomsNeutron(3), '0x9699999d9d9d9f9d9da09da99fa1a1adabafadb0b1b000000000000000000000');
  });
  it('Function getEnergyNeutron', async () => {
    const neutronsOnAtoms = [
      0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20, 24, 26, 28, 28, 30, 30,
      32, 31, 35, 35, 39, 41, 42, 45, 45, 48, 48, 50, 50, 51, 52, 54, 55, 57, 58, 60, 61, 64, 66, 69,
      71, 76, 74, 77, 78, 81, 82, 82, 82, 84, 84, 88, 89, 93, 94, 97, 98, 99, 100, 103, 104, 106, 108,
      110, 111, 114, 115, 117, 118, 121, 123, 125, 126, 126, 125, 134, 136, 138, 138, 142, 140, 146,
      144, 150, 148, 151, 150, 153, 153, 157, 157, 157, 159, 157, 157, 160, 157, 169, 159, 161, 161, 173,
      171, 175, 173, 176, 177, 176,
    ];

    assert.equal(neutronsOnAtoms.length, 118);

    let atomId = START_ATOMS_IDS.toNumber();
    for (; atomId < END_ATOMS_IDS.toNumber(); atomId++) {
      const atomicNumber = atomId - START_ATOMS_IDS.toNumber() + 1;

      const energyNeutronMint = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomId);
      expect(energyNeutronMint.neutron).to.eq.BN(neutronsOnAtoms[atomicNumber - 1]);
      expect(energyNeutronMint.energy).to.eq.BN(BASE_ENERGY_MINT_ATOM.add(bn(atomicNumber * 2).mul(energyNeutronMint.neutron)));

      const energyNeutronBurn = await managerV1.getEnergyNeutron(BASE_ENERGY_BURN_ATOM, atomId);
      expect(energyNeutronBurn.neutron).to.eq.BN(neutronsOnAtoms[atomicNumber - 1]);
      expect(energyNeutronBurn.energy).to.eq.BN(BASE_ENERGY_BURN_ATOM.add(bn(atomicNumber * 2).mul(energyNeutronBurn.neutron)));
    }

    console.log('Check', atomId - START_ATOMS_IDS.toNumber(), 'energyNeutron');
  });
  it('Function cancelSignHash', async () => {
    const msgHash = await getMsgHash(beneficiary, random32bn(), random32bn(), random32bn(), random32bn());

    await toEvents(
      managerV1.cancelSignHash(
        msgHash,
        { from: owner },
      ),
      'CancelHash',
    );

    assert.isTrue(await managerV1.canceledMsgHashes(msgHash));
  });
  describe('OnlyOwner functions', () => {
    it('mintMats', async () => {
      await tryCatchRevert(
        () => managerV1.mintMats(
          notOwner,
          0,
          1,
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
    it('mintBatchMats', async () => {
      await tryCatchRevert(
        () => managerV1.mintBatchMats(
          beneficiary,
          [bn(2), bn(1), bn(0), bn(2), bn(1), bn(0)],
          [bn(100), bn(5), bn(6), bn(50), bn(0), bn(0)],
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
    it('cancelSignHash', async () => {
      const msgHash = await getMsgHash(beneficiary, random32bn(), random32bn(), random32bn(), random32bn());

      await tryCatchRevert(
        () => managerV1.cancelSignHash(
          msgHash,
          { from: notOwner },
        ),
        'Ownable: caller is not the owner',
      );
    });
  });
  describe('Function mintMats', () => {
    it('Mint all mats', async () => {
      const mintAmount = bn(100);

      let i = 0;
      for (; i < START_ATOMS_IDS.toNumber(); i++) {
        const prevBeneficiaryAmount = await cryptoChemical.balanceOf(beneficiary, i);

        await toEvents(
          managerV1.mintMats(
            beneficiary,
            i,
            mintAmount,
            { from: owner },
          ),
          'MintMats',
        );

        expect(await cryptoChemical.balanceOf(beneficiary, i)).to.eq.BN(prevBeneficiaryAmount.add(mintAmount));
      }

      console.log('Check', i, 'Mats');
    });
    it('Try another id', async () => {
      await tryCatchRevert(
        () => managerV1.mintMats(
          address0x,
          3,
          0,
          { from: owner },
        ),
        'mintMats: Should be a mat',
      );
    });
  });
  describe('Function signMintMats', () => {
    it('Mint a mat with signature', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, atomId, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      const prevBeneficiaryAmount = await cryptoChemical.balanceOf(beneficiary, atomId);

      await toEvents(
        managerV1.signMintMats(
          beneficiary,
          atomId,
          mintAmount,
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'SignMintMats',
      );

      expect(await cryptoChemical.balanceOf(beneficiary, atomId)).to.eq.BN(prevBeneficiaryAmount.add(mintAmount));
      assert.isTrue(await managerV1.canceledMsgHashes(msgHash));
    });
    it('Try mint a mat with expired signature', async () => {
      await tryCatchRevert(
        () => managerV1.signMintMats(
          beneficiary,
          0,
          1,
          1,
          1,
          [],
          { from: user },
        ),
        'signMintMats: The signature has expired',
      );
    });
    it('Try mint a mat with cancel hash', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, atomId, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await managerV1.cancelSignHash(msgHash, { from: owner });

      await tryCatchRevert(
        () => managerV1.signMintMats(
          beneficiary,
          atomId,
          mintAmount,
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'signMintMats: The signature was canceled',
      );
    });
    it('Try mint a mat with wrong signature', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary, atomId, mintAmount, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await managerV1.cancelSignHash(msgHash, { from: owner });

      await tryCatchRevert(
        () => managerV1.signMintMats(
          beneficiary,
          atomId,
          mintAmount.add(bn(9)),
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'signMintMats: Invalid owner signature',
      );

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash(beneficiary, atomId, mintAmount, expiry, saltUser);
      const signatureUser = await web3.eth.sign(msgHashUser, user);

      await tryCatchRevert(
        () => managerV1.signMintMats(
          beneficiary,
          atomId,
          mintAmount,
          expiry,
          saltUser,
          signatureUser,
          { from: owner },
        ),
        'signMintMats: Invalid owner signature',
      );
    });
  });
  describe('Function mintBatchMats', () => {
    it('Mint all mats in batch', async () => {
      const prevBeneficiaryAmount0 = await cryptoChemical.balanceOf(beneficiary, 0);
      const prevBeneficiaryAmount1 = await cryptoChemical.balanceOf(beneficiary, 1);
      const prevBeneficiaryAmount2 = await cryptoChemical.balanceOf(beneficiary, 2);

      await toEvents(
        managerV1.mintBatchMats(
          beneficiary,
          [bn(2), bn(1), bn(0), bn(2), bn(1), bn(0)],
          [bn(100), bn(5), bn(6), bn(50), bn(0), bn(0)],
          { from: owner },
        ),
        'MintBatchMats',
      );

      expect(await cryptoChemical.balanceOf(beneficiary, 0)).to.eq.BN(prevBeneficiaryAmount0.add(bn(6)));
      expect(await cryptoChemical.balanceOf(beneficiary, 1)).to.eq.BN(prevBeneficiaryAmount1.add(bn(5)));
      expect(await cryptoChemical.balanceOf(beneficiary, 2)).to.eq.BN(prevBeneficiaryAmount2.add(bn(150)));
    });
    it('Try another id', async () => {
      await tryCatchRevert(
        () => managerV1.mintBatchMats(
          address0x,
          [3],
          [0],
          { from: owner },
        ),
        'mintBatchMats: Should be a mat',
      );

      await tryCatchRevert(
        () => managerV1.mintBatchMats(
          address0x,
          [0, 1, 2, 3],
          [0, 0, 0, 0],
          { from: owner },
        ),
        'mintBatchMats: Should be a mat',
      );
    });
  });
  describe('Function signMintBatchMats', () => {
    it('Mint a batch of mats with signature', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary, ids, amounts, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      const prevBeneficiaryAmount0 = await cryptoChemical.balanceOf(beneficiary, 0);
      const prevBeneficiaryAmount1 = await cryptoChemical.balanceOf(beneficiary, 1);
      const prevBeneficiaryAmount2 = await cryptoChemical.balanceOf(beneficiary, 2);

      await toEvents(
        managerV1.signMintBatchMats(
          beneficiary,
          ids,
          amounts,
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'SignMintBatchMats',
      );

      expect(await cryptoChemical.balanceOf(beneficiary, 0)).to.eq.BN(prevBeneficiaryAmount0.add(amounts[0]));
      expect(await cryptoChemical.balanceOf(beneficiary, 1)).to.eq.BN(prevBeneficiaryAmount1.add(amounts[1]));
      expect(await cryptoChemical.balanceOf(beneficiary, 2)).to.eq.BN(prevBeneficiaryAmount2.add(amounts[2]));

      assert.isTrue(await managerV1.canceledMsgHashes(msgHash));
    });
    it('Try mint a batch of mats with expired signature', async () => {
      await tryCatchRevert(
        () => managerV1.signMintBatchMats(
          beneficiary,
          [0],
          [1],
          1,
          1,
          [],
          { from: user },
        ),
        'signMintBatchMats: The signature has expired',
      );
    });
    it('Try mint a batch of mats with cancel hash', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary, ids, amounts, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await managerV1.cancelSignHash(msgHash, { from: owner });

      await tryCatchRevert(
        () => managerV1.signMintBatchMats(
          beneficiary,
          ids,
          amounts,
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'signMintBatchMats: The signature was canceled',
      );
    });
    it('Try mint a batch of mats with wrong signature', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary, ids, amounts, expiry, salt);
      const signature = await web3.eth.sign(msgHash, owner);

      await managerV1.cancelSignHash(msgHash, { from: owner });

      const amounts2 = amounts;
      amounts2[0] = bn(99999999999999);

      await tryCatchRevert(
        () => managerV1.signMintBatchMats(
          beneficiary,
          ids,
          amounts2,
          expiry,
          salt,
          signature,
          { from: user },
        ),
        'signMintBatchMats: Invalid owner signature',
      );

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash(beneficiary, ids, amounts, expiry, saltUser);
      const signatureUser = await web3.eth.sign(msgHashUser, user);

      await tryCatchRevert(
        () => managerV1.signMintBatchMats(
          beneficiary,
          ids,
          amounts,
          expiry,
          saltUser,
          signatureUser,
          { from: owner },
        ),
        'signMintBatchMats: Invalid owner signature',
      );
    });
  });
  describe('Function mintAtoms', () => {
    it('Mint all atoms', async () => {
      const mintAmount = bn(33);

      let atomId = START_ATOMS_IDS.toNumber();
      for (; atomId < END_ATOMS_IDS.toNumber(); atomId++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomId);
        const atomicNumber = bn(atomId).sub(START_ATOMS_IDS).add(bn(1));
        // Mint energy
        await cryptoChemical.mintEnergy(user, energyNeutron.energy.mul(mintAmount), { from: owner });
        await cryptoChemical.approve(managerV1.address, energyNeutron.energy.mul(mintAmount), { from: user });

        // Mint mats
        const matIds = [bn(0), bn(1), bn(2)];
        const amounts = [energyNeutron.neutron.mul(mintAmount), atomicNumber.mul(mintAmount), atomicNumber.mul(mintAmount)];
        await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });

        // Save balances
        const prevUserEnergy = await cryptoChemical.balanceOf(user);
        const prevAmounts = await cryptoChemical.balanceOfBatch([user, user, user, beneficiary], [0, 1, 2, atomId]);

        await toEvents(
          managerV1.mintAtoms(
            beneficiary,
            atomId,
            mintAmount,
            { from: user },
          ),
          'MintAtoms',
        );

        expect(await cryptoChemical.balanceOf(user)).to.eq.BN(prevUserEnergy.sub(energyNeutron.energy.mul(mintAmount)));

        const postAmounts = await cryptoChemical.balanceOfBatch([user, user, user, beneficiary], [0, 1, 2, atomId]);
        expect(postAmounts[0]).to.eq.BN(prevAmounts[0].sub(energyNeutron.neutron.mul(mintAmount)));
        expect(postAmounts[1]).to.eq.BN(prevAmounts[1].sub(atomicNumber.mul(mintAmount)));
        expect(postAmounts[2]).to.eq.BN(prevAmounts[2].sub(atomicNumber.mul(mintAmount)));

        expect(postAmounts[3]).to.eq.BN(prevAmounts[3].add(mintAmount));
      }

      console.log('Check', atomId, 'Atoms');
    });
    it('Try another id', async () => {
      await tryCatchRevert(
        () => managerV1.mintAtoms(
          address0x,
          2,
          0,
        ),
        'mintAtoms: Should be an atom',
      );
      await tryCatchRevert(
        () => managerV1.mintAtoms(
          address0x,
          121,
          0,
        ),
        'mintAtoms: Should be an atom',
      );
    });
    it('Try mint atom without energy', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const amounts = [energyNeutron.neutron, atomicNumber, atomicNumber];
      await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintAtoms(
          beneficiary,
          atomicNumber,
          1,
          { from: user },
        ),
        'ERC20: transfer amount exceeds balance',
      );

      await cryptoChemical.burnBatch(user, matIds, amounts, { from: user });
    });
    it('Try Mint atom without neutrons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user, energyNeutron.energy, { from: owner });
      await cryptoChemical.approve(managerV1.address, energyNeutron.energy, { from: user });

      // Mint mats
      const matIds = [bn(1), bn(2)];
      const amounts = [atomicNumber, atomicNumber];
      await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintAtoms(
          beneficiary,
          atomicNumber,
          1,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, energyNeutron.energy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, amounts, { from: user });
    });
    it('Try Mint atom without protons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user, energyNeutron.energy, { from: owner });
      await cryptoChemical.approve(managerV1.address, energyNeutron.energy, { from: user });

      // Mint mats
      const matIds = [bn(0), bn(2)];
      const amounts = [energyNeutron.neutron, atomicNumber];
      await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintAtoms(
          beneficiary,
          atomicNumber,
          1,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, energyNeutron.energy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, amounts, { from: user });
    });
    it('Try Mint atom without electrons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user, energyNeutron.energy, { from: owner });
      await cryptoChemical.approve(managerV1.address, energyNeutron.energy, { from: user });

      // Mint mats
      const matIds = [bn(0), bn(1)];
      const amounts = [energyNeutron.neutron, atomicNumber];
      await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintAtoms(
          beneficiary,
          atomicNumber,
          1,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, energyNeutron.energy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, amounts, { from: user });
    });
  });
  describe('Function mintBatchAtoms', () => {
    it('Mint a batch of atoms', async () => {
      const ids = [bn(5), bn(7), bn(25), bn(100), bn(23), bn(118)];
      const amounts = [bn(100), bn(1), bn(6), bn(50), bn(33), bn(0)];
      let totEnergy = bn(0);
      let totNeutron = bn(0);
      let totElecPro = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);
        const atomicNumber = bn(ids[i]).sub(START_ATOMS_IDS).add(bn(1));

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]));
        totNeutron = totNeutron.add(energyNeutron.neutron.mul(amounts[i]));
        totElecPro = totElecPro.add(atomicNumber.mul(amounts[i]));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user, totEnergy, { from: owner });
      await cryptoChemical.approve(managerV1.address, totEnergy, { from: user });

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user, matIds, matAmounts, { from: owner });

      // Save balances
      const prevUserEnergy = await cryptoChemical.balanceOf(user);
      const prevAmounts = await cryptoChemical.balanceOfBatch([user, user, user], [0, 1, 2]);

      const benArray = [];
      for (let i = 0; i < ids.length; i++) {
        benArray.push(beneficiary);
      }
      const prevAmountsBen = await cryptoChemical.balanceOfBatch(benArray, ids);

      await toEvents(
        managerV1.mintBatchAtoms(
          beneficiary,
          ids,
          amounts,
          { from: user },
        ),
        'MintBatchAtoms',
      );

      expect(await cryptoChemical.balanceOf(user)).to.eq.BN(prevUserEnergy.sub(totEnergy));

      expect(await cryptoChemical.balanceOf(user, 0)).to.eq.BN(prevAmounts[0].sub(totNeutron));
      expect(await cryptoChemical.balanceOf(user, 1)).to.eq.BN(prevAmounts[1].sub(totElecPro));
      expect(await cryptoChemical.balanceOf(user, 2)).to.eq.BN(prevAmounts[2].sub(totElecPro));

      const postAmountsBen = await cryptoChemical.balanceOfBatch(benArray, ids);
      for (let i = 0; i < ids.length; i++) {
        expect(postAmountsBen[i]).to.eq.BN(prevAmountsBen[i].add(amounts[i]));
      }
    });
    it('Try another id', async () => {
      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          address0x,
          [bn(7), END_ATOMS_IDS],
          [bn(0), bn(0)],
        ),
        'mintBatchAtoms: Should be an atom',
      );
      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          address0x,
          [bn(7), START_ATOMS_IDS.sub(bn(1))],
          [bn(0), bn(0)],
        ),
        'mintBatchAtoms: Should be an atom',
      );
    });
    it('Try mint atom without energy', async () => {
      const ids = [bn(5), bn(7), bn(25), bn(100), bn(23), bn(118)];
      const amounts = [bn(100), bn(1), bn(6), bn(50), bn(33), bn(0)];
      let totEnergy = bn(0);
      let totNeutron = bn(0);
      let totElecPro = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);
        const atomicNumber = bn(ids[i]).sub(START_ATOMS_IDS).add(bn(1));

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]));
        totNeutron = totNeutron.add(energyNeutron.neutron.mul(amounts[i]));
        totElecPro = totElecPro.add(atomicNumber.mul(amounts[i]));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user, totEnergy, { from: owner });

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user, matIds, matAmounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          beneficiary,
          ids,
          amounts,
          { from: user },
        ),
        'ERC20: transfer amount exceeds allowance',
      );

      await cryptoChemical.transfer(burnAddress, totEnergy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, matAmounts, { from: user });
    });
    it('Try Mint atom without neutrons', async () => {
      const ids = [bn(5), bn(7), bn(25), bn(100), bn(23), bn(118)];
      const amounts = [bn(100), bn(1), bn(6), bn(50), bn(33), bn(0)];
      let totEnergy = bn(0);
      let totNeutron = bn(0);
      let totElecPro = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);
        const atomicNumber = bn(ids[i]).sub(START_ATOMS_IDS).add(bn(1));

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]));
        totNeutron = totNeutron.add(energyNeutron.neutron.mul(amounts[i]));
        totElecPro = totElecPro.add(atomicNumber.mul(amounts[i]));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user, totEnergy, { from: owner });
      await cryptoChemical.approve(managerV1.address, totEnergy, { from: user });

      // Mint mats
      const matIds = [bn(1), bn(2)];
      const matAmounts = [totElecPro, totElecPro];
      await managerV1.mintBatchMats(user, matIds, matAmounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          beneficiary,
          ids,
          amounts,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, totEnergy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, matAmounts, { from: user });
    });
    it('Try Mint atom without protons', async () => {
      const ids = [bn(5), bn(7), bn(25), bn(100), bn(23), bn(118)];
      const amounts = [bn(100), bn(1), bn(6), bn(50), bn(33), bn(0)];
      let totEnergy = bn(0);
      let totNeutron = bn(0);
      let totElecPro = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);
        const atomicNumber = bn(ids[i]).sub(START_ATOMS_IDS).add(bn(1));

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]));
        totNeutron = totNeutron.add(energyNeutron.neutron.mul(amounts[i]));
        totElecPro = totElecPro.add(atomicNumber.mul(amounts[i]));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user, totEnergy, { from: owner });
      await cryptoChemical.approve(managerV1.address, totEnergy, { from: user });

      // Mint mats
      const matIds = [bn(0), bn(2)];
      const matAmounts = [totNeutron, totElecPro];
      await managerV1.mintBatchMats(user, matIds, matAmounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          beneficiary,
          ids,
          amounts,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, totEnergy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, matAmounts, { from: user });
    });
    it('Try Mint atom without electrons', async () => {
      const ids = [bn(5), bn(7), bn(25), bn(100), bn(23), bn(118)];
      const amounts = [bn(100), bn(1), bn(6), bn(50), bn(33), bn(0)];
      let totEnergy = bn(0);
      let totNeutron = bn(0);
      let totElecPro = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);
        const atomicNumber = bn(ids[i]).sub(START_ATOMS_IDS).add(bn(1));

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]));
        totNeutron = totNeutron.add(energyNeutron.neutron.mul(amounts[i]));
        totElecPro = totElecPro.add(atomicNumber.mul(amounts[i]));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user, totEnergy, { from: owner });
      await cryptoChemical.approve(managerV1.address, totEnergy, { from: user });

      // Mint mats
      const matIds = [bn(0), bn(1)];
      const matAmounts = [totNeutron, totElecPro];
      await managerV1.mintBatchMats(user, matIds, matAmounts, { from: owner });

      await tryCatchRevert(
        () => managerV1.mintBatchAtoms(
          beneficiary,
          ids,
          amounts,
          { from: user },
        ),
        'ERC1155: insufficient balance for transfer',
      );

      await cryptoChemical.transfer(burnAddress, totEnergy, { from: user });
      await cryptoChemical.burnBatch(user, matIds, matAmounts, { from: user });
    });
  });
  describe('Function burnAtoms', () => {
    it('Burn an atom', async () => {
      const atomId = bn(100);
      const mintAmount = bn(33);
      const burnAmount = bn(3);

      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomId);
      const atomicNumber = bn(atomId).sub(START_ATOMS_IDS).add(bn(1));
      // Mint energy
      await cryptoChemical.mintEnergy(user, energyNeutron.energy.mul(mintAmount), { from: owner });
      await cryptoChemical.approve(managerV1.address, energyNeutron.energy.mul(mintAmount), { from: user });
      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const amounts = [energyNeutron.neutron.mul(mintAmount), atomicNumber.mul(mintAmount), atomicNumber.mul(mintAmount)];
      await managerV1.mintBatchMats(user, matIds, amounts, { from: owner });
      // Mint atoms
      await managerV1.mintAtoms(user, atomId, mintAmount, { from: user });
      // Mint energy for burn
      const energyNeutronBurn = await managerV1.getEnergyNeutron(BASE_ENERGY_BURN_ATOM, atomId);
      await cryptoChemical.mintEnergy(user, energyNeutronBurn.energy.mul(burnAmount).div(bn(2)), { from: owner });
      await cryptoChemical.approve(managerV1.address, energyNeutronBurn.energy.mul(burnAmount).div(bn(2)), { from: user });

      // Save balances
      const prevUserEnergy = await cryptoChemical.balanceOf(user);
      const prevAmounts = await cryptoChemical.balanceOfBatch([beneficiary, beneficiary, beneficiary, user], [0, 1, 2, atomId]);

      await toEvents(
        managerV1.burnAtoms(
          user,
          beneficiary,
          atomId,
          burnAmount,
          { from: user },
        ),
        'BurnAtoms',
      );

      expect(await cryptoChemical.balanceOf(user)).to.eq.BN(prevUserEnergy.sub(energyNeutronBurn.energy.div(bn(2)).mul(burnAmount)));

      const postAmounts = await cryptoChemical.balanceOfBatch([beneficiary, beneficiary, beneficiary, user], [0, 1, 2, atomId]);
      expect(postAmounts[0]).to.eq.BN(prevAmounts[0].add(energyNeutronBurn.neutron.mul(burnAmount)));
      expect(postAmounts[1]).to.eq.BN(prevAmounts[1].add(atomicNumber.mul(burnAmount)));
      expect(postAmounts[2]).to.eq.BN(prevAmounts[2].add(atomicNumber.mul(burnAmount)));

      expect(postAmounts[3]).to.eq.BN(prevAmounts[3].sub(burnAmount));
    });
    it('Try burn another id', async () => {
      await tryCatchRevert(
        () => managerV1.burnAtoms(
          user,
          beneficiary,
          START_ATOMS_IDS.sub(bn(1)),
          END_ATOMS_IDS,
          { from: user },
        ),
        'mintAtoms: Should be an atom',
      );
    });
  });
  describe('Function burnBatchAtoms', () => {
    // TODO
  });
});
