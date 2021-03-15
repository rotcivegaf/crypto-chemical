const CryptoChemical = artifacts.require('CryptoChemical');

const ManagerV1 = artifacts.require('ManagerV1');

const {
  expect,
  toEvents,
  tryCatchRevert,
  address0x,
  burnAddress,
  bn,
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

  before('Deploy contracts', async () => {
    cryptoChemical = await CryptoChemical.new('', { from: owner });
    managerV1 = await ManagerV1.new(cryptoChemical.address, { from: owner });

    await cryptoChemical.setManager(managerV1.address, { from: owner });

    await cryptoChemical.setApprovalForAll(managerV1.address, true, { from: user });
    START_ATOMS_IDS = await managerV1.START_ATOMS_IDS();
    END_ATOMS_IDS = await managerV1.END_ATOMS_IDS();
    BASE_ENERGY_MINT_ATOM = await managerV1.BASE_ENERGY_MINT_ATOM();
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
      const energyNeutron = await managerV1.getEnergyNeutron(atomId);
      const atomicNumber = atomId - START_ATOMS_IDS.toNumber() + 1;

      expect(energyNeutron.neutron).to.eq.BN(neutronsOnAtoms[atomicNumber - 1]);
      expect(energyNeutron.energy).to.eq.BN(BASE_ENERGY_MINT_ATOM.add(bn(atomicNumber * 2).mul(energyNeutron.neutron)));
    }

    console.log('Check', atomId - START_ATOMS_IDS.toNumber(), 'energyNeutron');
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
  });
  describe('Function mintMats', () => {
    it('Mint all mats', async () => {
      const mintAmount = bn(100);

      let i = 0;
      for (; i < START_ATOMS_IDS.toNumber(); i++) {
        const prevBeneficiaryAmount = await cryptoChemical.balanceOf(beneficiary, i);

        await managerV1.mintMats(
          beneficiary,
          i,
          mintAmount,
          { from: owner },
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
  describe('Function mintBatchMats', () => {
    it('Mint all mats in batch', async () => {
      const prevBeneficiaryAmount0 = await cryptoChemical.balanceOf(beneficiary, 0);
      const prevBeneficiaryAmount1 = await cryptoChemical.balanceOf(beneficiary, 1);
      const prevBeneficiaryAmount2 = await cryptoChemical.balanceOf(beneficiary, 2);

      await managerV1.mintBatchMats(
        beneficiary,
        [bn(2), bn(1), bn(0), bn(2), bn(1), bn(0)],
        [bn(100), bn(5), bn(6), bn(50), bn(0), bn(0)],
        { from: owner },
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
  describe('Function mintAtoms', () => {
    it('Mint all atoms', async () => {
      const mintAmount = bn(33);

      let atomId = START_ATOMS_IDS.toNumber();
      for (; atomId < END_ATOMS_IDS.toNumber(); atomId++) {
        const energyNeutron = await managerV1.getEnergyNeutron(atomId);
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
      const energyNeutron = await managerV1.getEnergyNeutron(atomicNumber);
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
      const energyNeutron = await managerV1.getEnergyNeutron(atomicNumber);
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
      const energyNeutron = await managerV1.getEnergyNeutron(atomicNumber);
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
      const energyNeutron = await managerV1.getEnergyNeutron(atomicNumber);
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
  });
});
