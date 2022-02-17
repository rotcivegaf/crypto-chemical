const { expect } = require('chai');
const { ethers } = require('hardhat');
const { address0x, burnAddress, bn, random32bn } = require('./Helper.js');

describe('ManagerV1', () => {
  let owner, user, beneficiary, notOwner;
  let cryptoChemical, managerV1;
  let START_ATOMS_IDS, END_ATOMS_IDS, BASE_ENERGY_MINT_ATOM, BASE_ENERGY_BURN_ATOM;

  function getMsgHash (to, id, amount, expiry, salt) {
    return ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
        [managerV1.address, cryptoChemical.address, to, id, amount, expiry, salt],
      ),
    );
  }

  function getMsgHash3Batch (to, ids, amounts, expiry, salt) {
    return ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['address', 'address', 'address', 'uint256[3]', 'uint256[3]', 'uint256', 'uint256'],
        [managerV1.address, cryptoChemical.address, to, ids, amounts, expiry, salt],
      ),
    );
  }

  before('Deploy contracts', async () => {
    [owner, user, beneficiary, notOwner] = await ethers.getSigners();

    const CryptoChemical = await ethers.getContractFactory('CryptoChemical');
    cryptoChemical = await CryptoChemical.deploy('');
    await cryptoChemical.deployed();

    const ManagerV1 = await ethers.getContractFactory('ManagerV1');
    managerV1 = await ManagerV1.deploy(cryptoChemical.address);
    await managerV1.deployed();

    await cryptoChemical.setManager(managerV1.address);
    await cryptoChemical.connect(user).setApprovalForAll(managerV1.address, true);

    START_ATOMS_IDS = await managerV1.START_ATOMS_IDS();
    END_ATOMS_IDS = await managerV1.END_ATOMS_IDS();
    BASE_ENERGY_MINT_ATOM = await managerV1.BASE_ENERGY_MINT_ATOM();
    BASE_ENERGY_BURN_ATOM = await managerV1.BASE_ENERGY_BURN_ATOM();
  });

  it('Function Constructor', async () => {
    const ManagerV1 = await ethers.getContractFactory('ManagerV1');
    const newManagerV1 = await ManagerV1.deploy(cryptoChemical.address);
    await newManagerV1.deployed();

    expect(await newManagerV1.cryptoChemical(), cryptoChemical.address);

    expect(await newManagerV1.NEUTRON()).to.eq(0);
    expect(await newManagerV1.PROTON()).to.eq(1);
    expect(await newManagerV1.ELECTRON()).to.eq(2);

    expect(await newManagerV1.START_ATOMS_IDS()).to.eq(3);
    expect(await newManagerV1.END_ATOMS_IDS()).to.eq(121);
    expect(await newManagerV1.BASE_ENERGY_MINT_ATOM()).to.eq(100);
    expect(await newManagerV1.BASE_ENERGY_BURN_ATOM()).to.eq(70);
    expect(await newManagerV1.ATOMS_IN_ARRAY()).to.eq(32);
    expect(await newManagerV1.BYTE_LENGTH_IN_BIT()).to.eq(8);

    expect(await newManagerV1.MATS_IDS(0)).to.eq(0);
    expect(await newManagerV1.MATS_IDS(1)).to.eq(1);
    expect(await newManagerV1.MATS_IDS(2)).to.eq(2);

    expect(await newManagerV1.atomsNeutron(0)).to.eq('0x00020405060607080a0a0c0c0e0e101012161414181a1c1c1e1e201f23232729');
    expect(await newManagerV1.atomsNeutron(1)).to.eq('0x2a2d2d3030323233343637393a3c3d404245474c4a4d4e51525252545458595d');
    expect(await newManagerV1.atomsNeutron(2)).to.eq('0x5e6162636467686a6c6e6f72737576797b7d7e7e7d86888a8a8e8c9290969497');
    expect(await newManagerV1.atomsNeutron(3)).to.eq('0x9699999d9d9d9f9d9da09da99fa1a1adabafadb0b1b000000000000000000000');
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

    expect(neutronsOnAtoms.length, 118);

    let atomId = START_ATOMS_IDS.toNumber();
    for (; atomId < END_ATOMS_IDS.toNumber(); atomId++) {
      const atomicNumber = atomId - START_ATOMS_IDS.toNumber() + 1;

      const energyNeutronMint = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomId);
      expect(energyNeutronMint.neutron).to.eq(neutronsOnAtoms[atomicNumber - 1]);
      expect(energyNeutronMint.energy).to.eq(BASE_ENERGY_MINT_ATOM.add(bn(atomicNumber * 2).mul(energyNeutronMint.neutron)));

      const energyNeutronBurn = await managerV1.getEnergyNeutron(BASE_ENERGY_BURN_ATOM, atomId);
      expect(energyNeutronBurn.neutron).to.eq(neutronsOnAtoms[atomicNumber - 1]);
      expect(energyNeutronBurn.energy).to.eq(BASE_ENERGY_BURN_ATOM.add(bn(atomicNumber * 2).mul(energyNeutronBurn.neutron)));
    }

    console.log('Check', atomId - START_ATOMS_IDS.toNumber(), 'energyNeutron');
  });
  it('Function cancelSignHash', async () => {
    const msgHash = await getMsgHash(beneficiary.address, random32bn(), random32bn(), random32bn(), random32bn());

    await expect(await managerV1.cancelSignHash(msgHash))
      .to.emit(managerV1, 'CancelHash');

    expect(await managerV1.canceledMsgHashes(msgHash)).to.be.true;
  });
  describe('OnlyOwner functions', () => {
    it('mintMats', async () => {
      await expect(managerV1.connect(notOwner).mintMats(notOwner.address, 0, 1))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('mintBatchMats', async () => {
      await expect(
        managerV1.connect(notOwner).mintBatchMats(
          beneficiary.address,
          [bn(2), bn(1), bn(0), bn(2), bn(1), bn(0)],
          [bn(100), bn(5), bn(6), bn(50), bn(0), bn(0)],
        ),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('cancelSignHash', async () => {
      const msgHash = await getMsgHash(beneficiary.address, random32bn(), random32bn(), random32bn(), random32bn());

      await expect(managerV1.connect(notOwner).cancelSignHash(msgHash))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
  describe('Function mintMats', () => {
    it('Mint all mats', async () => {
      const mintAmount = bn(100);

      let i = 0;
      for (; i < START_ATOMS_IDS.toNumber(); i++) {
        const prevBeneficiaryAmount = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, i);

        await expect(await managerV1.mintMats(beneficiary.address, i, mintAmount))
          .to.emit(managerV1, 'MintMats');

        expect(await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, i)).to.eq(prevBeneficiaryAmount.add(mintAmount));
      }

      console.log('Check', i, 'Mats');
    });
    it('Try another id', async () => {
      await expect(managerV1.mintMats(address0x, 3, 0))
        .to.be.revertedWith('mintMats: Should be a mat');
    });
  });
  describe('Function signMintMats', () => {
    it('Mint a mat with signature', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, atomId, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      const prevBeneficiaryAmount = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, atomId);

      await expect(await managerV1.connect(user).signMintMats(
        beneficiary.address,
        atomId,
        mintAmount,
        expiry,
        salt,
        signature,
      )).to.emit(managerV1, 'SignMintMats');

      expect(await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, atomId))
        .to.eq(prevBeneficiaryAmount.add(mintAmount));
      expect(await managerV1.canceledMsgHashes(msgHash)).to.be.true;
    });
    it('Try mint a mat with expired signature', async () => {
      await expect(managerV1.connect(user).signMintMats(beneficiary.address, 0, 1, 1, 1, []))
        .to.be.revertedWith('signMintMats: The signature has expired');
    });
    it('Try mint a mat with cancel hash', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, atomId, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await managerV1.cancelSignHash(msgHash);

      await expect(managerV1.connect(user).signMintMats(
        beneficiary.address,
        atomId,
        mintAmount,
        expiry,
        salt,
        signature,
      )).to.be.revertedWith('signMintMats: The signature was canceled');
    });
    it('Try mint a mat with wrong signature', async () => {
      const atomId = bn(1);
      const mintAmount = bn(100);
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash(beneficiary.address, atomId, mintAmount, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await managerV1.cancelSignHash(msgHash);

      await expect(managerV1.connect(user).signMintMats(
        beneficiary.address,
        atomId,
        mintAmount.add(bn(9)),
        expiry,
        salt,
        signature,
      )).to.be.revertedWith('signMintMats: Invalid owner signature');

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash(beneficiary.address, atomId, mintAmount, expiry, saltUser);
      const signatureUser = await user.signMessage(msgHashUser);

      await expect(managerV1.connect(owner).signMintMats(
        beneficiary.address,
        atomId,
        mintAmount,
        expiry,
        saltUser,
        signatureUser,
      )).to.be.revertedWith('signMintMats: Invalid owner signature');
    });
  });
  describe('Function mintBatchMats', () => {
    it('Mint all mats in batch', async () => {
      const prevBeneficiaryAmount0 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 0);
      const prevBeneficiaryAmount1 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 1);
      const prevBeneficiaryAmount2 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 2);

      await expect(await managerV1.mintBatchMats(
        beneficiary.address,
        [bn(2), bn(1), bn(0), bn(2), bn(1), bn(0)],
        [bn(100), bn(5), bn(6), bn(50), bn(0), bn(0)],
      )).to.emit(managerV1, 'MintBatchMats');

      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 0))
        .to.eq(prevBeneficiaryAmount0.add(bn(6)));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 1))
        .to.eq(prevBeneficiaryAmount1.add(bn(5)));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 2))
        .to.eq(prevBeneficiaryAmount2.add(bn(150)));
    });
    it('Try another id', async () => {
      await expect(managerV1.mintBatchMats(address0x, [3], [0]))
        .to.be.revertedWith('mintBatchMats: Should be a mat');

      await expect(managerV1.mintBatchMats(address0x, [0, 1, 2, 3], [0, 0, 0, 0]))
        .to.be.revertedWith('mintBatchMats: Should be a mat');
    });
  });
  describe('Function signMintBatchMats', () => {
    it('Mint a batch of mats with signature', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary.address, ids, amounts, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      const prevBeneficiaryAmount0 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 0);
      const prevBeneficiaryAmount1 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 1);
      const prevBeneficiaryAmount2 = await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 2);

      await expect(await managerV1.connect(user).signMintBatchMats(
        beneficiary.address,
        ids,
        amounts,
        expiry,
        salt,
        signature,
      )).to.emit(managerV1, 'SignMintBatchMats');

      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 0))
        .to.eq(prevBeneficiaryAmount0.add(amounts[0]));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 1))
        .to.eq(prevBeneficiaryAmount1.add(amounts[1]));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 2))
        .to.eq(prevBeneficiaryAmount2.add(amounts[2]));

      expect(await managerV1.canceledMsgHashes(msgHash)).to.be.true;
    });
    it('Try mint a batch of mats with expired signature', async () => {
      await expect(managerV1.signMintBatchMats(beneficiary.address, [0], [1], 1, 1, []))
        .to.be.revertedWith('signMintBatchMats: The signature has expired');
    });
    it('Try mint a batch of mats with cancel hash', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary.address, ids, amounts, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await managerV1.cancelSignHash(msgHash);

      await expect(managerV1.connect(user).signMintBatchMats(beneficiary.address, [0], [1], 1, 1, []))
        .to.be.revertedWith('signMintBatchMats: The signature has expired');

      await expect(managerV1.signMintBatchMats(
        beneficiary.address,
        ids,
        amounts,
        expiry,
        salt,
        signature,
      )).to.be.revertedWith('signMintBatchMats: The signature was canceled');
    });
    it('Try mint a batch of mats with wrong signature', async () => {
      const ids = [bn(0), bn(1), bn(2)];
      const amounts = [bn(10), bn(31), bn(42)];
      const expiry = bn('9999999999999999999999999');
      const salt = random32bn();
      const msgHash = await getMsgHash3Batch(beneficiary.address, ids, amounts, expiry, salt);
      const signature = await owner.signMessage(msgHash);

      await managerV1.cancelSignHash(msgHash);

      const amounts2 = amounts;
      amounts2[0] = bn(99999999999999);

      await expect(managerV1.connect(user).signMintBatchMats(
        beneficiary.address,
        ids,
        amounts2,
        expiry,
        salt,
        signature,
      )).to.be.revertedWith('signMintBatchMats: Invalid owner signature');

      const saltUser = random32bn();
      const msgHashUser = await getMsgHash3Batch(beneficiary.address, ids, amounts, expiry, saltUser);
      const signatureUser = await user.signMessage(msgHashUser);

      await expect(managerV1.connect(user).signMintBatchMats(
        beneficiary.address,
        ids,
        amounts,
        expiry,
        saltUser,
        signatureUser,
      )).to.be.revertedWith('signMintBatchMats: Invalid owner signature');
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
        await cryptoChemical.mintEnergy(user.address, energyNeutron.energy.mul(mintAmount));
        await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy.mul(mintAmount));

        // Mint mats
        const matIds = [bn(0), bn(1), bn(2)];
        const amounts = [energyNeutron.neutron.mul(mintAmount), atomicNumber.mul(mintAmount), atomicNumber.mul(mintAmount)];
        await managerV1.mintBatchMats(user.address, matIds, amounts);

        // Save balances
        const prevUserEnergy = await cryptoChemical['balanceOf(address)'](user.address);
        const prevAmounts = await cryptoChemical.balanceOfBatch([user.address, user.address, user.address, beneficiary.address], [0, 1, 2, atomId]);

        await expect(
          await managerV1.connect(user).mintAtoms(beneficiary.address, atomId, mintAmount),
        ).to.emit(managerV1, 'MintAtoms');

        expect(await cryptoChemical['balanceOf(address)'](user.address)).to.eq(prevUserEnergy.sub(energyNeutron.energy.mul(mintAmount)));

        const postAmounts = await cryptoChemical.balanceOfBatch([user.address, user.address, user.address, beneficiary.address], [0, 1, 2, atomId]);
        expect(postAmounts[0]).to.eq(prevAmounts[0].sub(energyNeutron.neutron.mul(mintAmount)));
        expect(postAmounts[1]).to.eq(prevAmounts[1].sub(atomicNumber.mul(mintAmount)));
        expect(postAmounts[2]).to.eq(prevAmounts[2].sub(atomicNumber.mul(mintAmount)));

        expect(postAmounts[3]).to.eq(prevAmounts[3].add(mintAmount));
      }

      console.log('Check', atomId, 'Atoms');
    });
    it('Try another id', async () => {
      await expect(managerV1.mintAtoms(address0x, 2, 0))
        .to.be.revertedWith('mintAtoms: Should be an atom');

      await expect(managerV1.mintAtoms(address0x, 121, 0))
        .to.be.revertedWith('mintAtoms: Should be an atom');
    });
    it('Try mint atom without energy', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const amounts = [energyNeutron.neutron, atomicNumber, atomicNumber];
      await managerV1.mintBatchMats(user.address, matIds, amounts);

      await expect(managerV1.connect(user).mintAtoms(beneficiary.address, atomicNumber, 1))
        .to.be.revertedWith('ERC20: insufficient allowance');

      await managerV1.connect(user).burnBatch(matIds, amounts);
    });
    it('Try Mint atom without neutrons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user.address, energyNeutron.energy);
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy);

      // Mint mats
      const matIds = [bn(1), bn(2)];
      const amounts = [atomicNumber, atomicNumber];
      await managerV1.mintBatchMats(user.address, matIds, amounts);

      await expect(managerV1.connect(user).mintAtoms(beneficiary.address, atomicNumber, 1))
        .to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, energyNeutron.energy);
      await managerV1.connect(user).burnBatch(matIds, amounts);
    });
    it('Try Mint atom without protons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user.address, energyNeutron.energy);
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy);

      // Mint mats
      const matIds = [bn(0), bn(2)];
      const amounts = [energyNeutron.neutron, atomicNumber];
      await managerV1.mintBatchMats(user.address, matIds, amounts);

      await expect(managerV1.connect(user).mintAtoms(beneficiary.address, atomicNumber, 1))
        .to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, energyNeutron.energy);
      await managerV1.connect(user).burnBatch(matIds, amounts);
    });
    it('Try Mint atom without electrons', async () => {
      const atomicNumber = bn(5);
      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomicNumber);
      // Mint energy
      await cryptoChemical.mintEnergy(user.address, energyNeutron.energy);
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy);

      // Mint mats
      const matIds = [bn(0), bn(1)];
      const amounts = [energyNeutron.neutron, atomicNumber];
      await managerV1.mintBatchMats(user.address, matIds, amounts);

      await expect(managerV1.connect(user).mintAtoms(beneficiary.address, atomicNumber, 1))
        .to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, energyNeutron.energy);
      await managerV1.connect(user).burnBatch(matIds, amounts);
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      // Save balances
      const prevUserEnergy = await cryptoChemical['balanceOf(address)'](user.address);
      const prevAmounts = await cryptoChemical.balanceOfBatch([user.address, user.address, user.address], [0, 1, 2]);

      const benArray = [];
      for (let i = 0; i < ids.length; i++) {
        benArray.push(beneficiary.address);
      }
      const prevAmountsBen = await cryptoChemical.balanceOfBatch(benArray, ids);

      await expect(
        await managerV1.connect(user).mintBatchAtoms(beneficiary.address, ids, amounts),
      ).to.emit(managerV1, 'MintBatchAtoms');

      expect(await cryptoChemical['balanceOf(address)'](user.address)).to.eq(prevUserEnergy.sub(totEnergy));

      expect(
        await cryptoChemical['balanceOf(address,uint256)'](user.address, 0))
        .to.eq(prevAmounts[0].sub(totNeutron));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](user.address, 1))
        .to.eq(prevAmounts[1].sub(totElecPro));
      expect(
        await cryptoChemical['balanceOf(address,uint256)'](user.address, 2))
        .to.eq(prevAmounts[2].sub(totElecPro));

      const postAmountsBen = await cryptoChemical.balanceOfBatch(benArray, ids);
      for (let i = 0; i < ids.length; i++) {
        expect(postAmountsBen[i]).to.eq(prevAmountsBen[i].add(amounts[i]));
      }
    });
    it('Try another id', async () => {
      await expect(
        managerV1.mintBatchAtoms(address0x, [bn(7), END_ATOMS_IDS], [bn(0), bn(0)]),
      ).to.be.revertedWith('_calcAmounts: Should be an atom');
      await expect(
        managerV1.mintBatchAtoms(address0x, [bn(7), START_ATOMS_IDS.sub(bn(1))], [bn(0), bn(0)]),
      ).to.be.revertedWith('_calcAmounts: Should be an atom');
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      await expect(
        managerV1.connect(user).mintBatchAtoms(beneficiary.address, ids, amounts),
      ).to.be.revertedWith('ERC20: insufficient allowance');

      await cryptoChemical.connect(user).transfer(burnAddress, totEnergy);
      await managerV1.connect(user).burnBatch(matIds, matAmounts);
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(1), bn(2)];
      const matAmounts = [totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      await expect(
        managerV1.connect(user).mintBatchAtoms(beneficiary.address, ids, amounts),
      ).to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, totEnergy);
      await managerV1.connect(user).burnBatch(matIds, matAmounts);
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(2)];
      const matAmounts = [totNeutron, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      await expect(
        managerV1.connect(user).mintBatchAtoms(beneficiary.address, ids, amounts),
      ).to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, totEnergy);
      await managerV1.connect(user).burnBatch(matIds, matAmounts);
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1)];
      const matAmounts = [totNeutron, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      await expect(
        managerV1.connect(user).mintBatchAtoms(beneficiary.address, ids, amounts),
      ).to.be.revertedWith('ERC1155: insufficient balance for transfer');

      await cryptoChemical.connect(user).transfer(burnAddress, totEnergy);
      await managerV1.connect(user).burnBatch(matIds, matAmounts);
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
      await cryptoChemical.mintEnergy(user.address, energyNeutron.energy.mul(mintAmount));
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy.mul(mintAmount));
      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const amounts = [energyNeutron.neutron.mul(mintAmount), atomicNumber.mul(mintAmount), atomicNumber.mul(mintAmount)];
      await managerV1.mintBatchMats(user.address, matIds, amounts);
      // Mint atoms
      await managerV1.connect(user).mintAtoms(user.address, atomId, mintAmount);

      // Mint energy
      const energyNeutronBurn = await managerV1.getEnergyNeutron(BASE_ENERGY_BURN_ATOM, atomId);
      await cryptoChemical.mintEnergy(user.address, energyNeutronBurn.energy.div(bn(2)).mul(burnAmount));
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutronBurn.energy.div(bn(2)).mul(burnAmount));

      // Save balances
      const prevUserEnergy = await cryptoChemical['balanceOf(address)'](user.address);
      const prevAmounts = await cryptoChemical.balanceOfBatch([beneficiary.address, beneficiary.address, beneficiary.address, user.address], [0, 1, 2, atomId]);

      await expect(
        await managerV1.connect(user).burnAtoms(beneficiary.address, atomId, burnAmount),
      ).to.emit(managerV1, 'BurnAtoms');

      expect(await cryptoChemical['balanceOf(address)'](user.address)).to.eq(prevUserEnergy.sub(energyNeutronBurn.energy.div(bn(2)).mul(burnAmount)));

      const postAmounts = await cryptoChemical.balanceOfBatch([beneficiary.address, beneficiary.address, beneficiary.address, user.address], [0, 1, 2, atomId]);
      expect(postAmounts[0]).to.eq(prevAmounts[0].add(energyNeutronBurn.neutron.mul(burnAmount)));
      expect(postAmounts[1]).to.eq(prevAmounts[1].add(atomicNumber.mul(burnAmount)));
      expect(postAmounts[2]).to.eq(prevAmounts[2].add(atomicNumber.mul(burnAmount)));

      expect(postAmounts[3]).to.eq(prevAmounts[3].sub(burnAmount));
    });
    it('Try burn another id', async () => {
      await expect(managerV1.connect(user).burnAtoms(beneficiary.address, START_ATOMS_IDS.sub(bn(1)), 100))
        .to.be.revertedWith('mintAtoms: Should be an atom');
    });
  });
  describe('Function burnBatchAtoms', () => {
    it('Burn a batch of atoms', async () => {
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      // Mint atoms
      await managerV1.connect(user).mintBatchAtoms(user.address, ids, amounts);

      totEnergy = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]).div(bn(2)));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Save balances
      const prevUserEnergy = await cryptoChemical['balanceOf(address)'](user.address);
      const prevAmounts = await cryptoChemical.balanceOfBatch([beneficiary.address, beneficiary.address, beneficiary.address], [0, 1, 2]);

      const userArray = [];
      for (let i = 0; i < ids.length; i++) {
        userArray.push(user.address);
      }
      const prevAmountsUser = await cryptoChemical.balanceOfBatch(userArray, ids);

      await expect(
        await managerV1.connect(user).burnBatchAtoms(beneficiary.address, ids, amounts),
      ).to.emit(managerV1, 'BurnBatchAtoms');

      expect(await cryptoChemical['balanceOf(address)'](user.address)).to.eq(prevUserEnergy.sub(totEnergy));

      expect(await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 0)).to.eq(prevAmounts[0].add(totNeutron));
      expect(await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 1)).to.eq(prevAmounts[1].add(totElecPro));
      expect(await cryptoChemical['balanceOf(address,uint256)'](beneficiary.address, 2)).to.eq(prevAmounts[2].add(totElecPro));

      const postAmountsUser = await cryptoChemical.balanceOfBatch(userArray, ids);
      for (let i = 0; i < ids.length; i++) {
        expect(postAmountsUser[i]).to.eq(prevAmountsUser[i].sub(amounts[i]));
      }
    });
    it('Try another id', async () => {
      await expect(managerV1.burnBatchAtoms(address0x, [bn(7), END_ATOMS_IDS], [bn(0), bn(0)]))
        .to.be.revertedWith('_calcAmounts: Should be an atom');

      await expect(managerV1.burnBatchAtoms(address0x, [bn(7), START_ATOMS_IDS.sub(bn(1))], [bn(0), bn(0)]))
        .to.be.revertedWith('_calcAmounts: Should be an atom');
    });
    it('Try burn atom without energy', async () => {
      const ids = [bn(5)];
      const amounts = [bn(100)];
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      // Mint atoms
      await managerV1.connect(user).mintBatchAtoms(user.address, ids, amounts);

      totEnergy = bn(0);

      for (let i = 0; i < ids.length; i++) {
        const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, ids[i]);

        totEnergy = totEnergy.add(energyNeutron.energy.mul(amounts[i]).div(bn(2)));
      }

      // Mint energy
      await cryptoChemical.mintEnergy(user.address, totEnergy);

      await expect(managerV1.connect(user).burnBatchAtoms(beneficiary.address, ids, amounts))
        .to.be.revertedWith('ERC20: insufficient allowance');

      await cryptoChemical.connect(user).transfer(burnAddress, totEnergy);
    });
  });
  describe('Function burn', () => {
    it('Burn', async () => {
      const atomId = bn(100);
      const mintAmount = bn(33);
      const burnAmount = bn(3);

      const energyNeutron = await managerV1.getEnergyNeutron(BASE_ENERGY_MINT_ATOM, atomId);
      const atomicNumber = bn(atomId).sub(START_ATOMS_IDS).add(bn(1));
      // Mint energy
      await cryptoChemical.mintEnergy(user.address, energyNeutron.energy.mul(mintAmount));
      await cryptoChemical.connect(user).approve(managerV1.address, energyNeutron.energy.mul(mintAmount));
      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const amounts = [energyNeutron.neutron.mul(mintAmount), atomicNumber.mul(mintAmount), atomicNumber.mul(mintAmount)];
      await managerV1.mintBatchMats(user.address, matIds, amounts);
      // Mint atoms
      await managerV1.connect(user).mintAtoms(user.address, atomId, mintAmount);

      // Save balance
      const prevAmounts = await cryptoChemical['balanceOf(address,uint256)'](user.address, atomId);

      await expect(
        await managerV1.connect(user).burn(atomId, burnAmount),
      ).to.emit(managerV1, 'Burn');

      expect(await cryptoChemical['balanceOf(address,uint256)'](user.address, atomId)).to.eq(prevAmounts.sub(burnAmount));
    });
    it('Try burn', async () => {
      await expect(managerV1.connect(user).burn(1111111, 111))
        .to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });
  });
  describe('Function burnBatch', () => {
    it('Burn a batch of atoms', async () => {
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
      await cryptoChemical.mintEnergy(user.address, totEnergy);
      await cryptoChemical.connect(user).approve(managerV1.address, totEnergy);

      // Mint mats
      const matIds = [bn(0), bn(1), bn(2)];
      const matAmounts = [totNeutron, totElecPro, totElecPro];
      await managerV1.mintBatchMats(user.address, matIds, matAmounts);

      // Mint atoms
      await managerV1.connect(user).mintBatchAtoms(user.address, ids, amounts);

      // Save balances
      const userArray = [];
      for (let i = 0; i < ids.length; i++) {
        userArray.push(user.address);
      }
      const prevAmountsUser = await cryptoChemical.balanceOfBatch(userArray, ids);

      await expect(
        await managerV1.connect(user).burnBatch(ids, amounts),
      ).to.emit(managerV1, 'BurnBatch');

      const postAmountsUser = await cryptoChemical.balanceOfBatch(userArray, ids);
      for (let i = 0; i < ids.length; i++) {
        expect(postAmountsUser[i]).to.eq(prevAmountsUser[i].sub(amounts[i]));
      }
    });
    it('Try burnBatch', async () => {
      await expect(managerV1.burnBatch([561651651, 999999999], [bn(10), bn(0)]))
        .to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });
  });
});
