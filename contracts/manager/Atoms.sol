pragma solidity ^0.8.0;

import "./Mats.sol";


abstract contract Atoms is Mats {
    using SafeERC20 for CryptoChemical;
    using ECDSA for bytes32;

    event MintAtoms();
    event MintBatchAtoms();
    event BurnAtoms();
    event BurnBatchAtoms();

    uint256 public constant START_ATOMS_IDS  = 3;
    uint256 public constant END_ATOMS_IDS  = 121;

    uint256 public constant NEUTRON  = 0;
    uint256 public constant PROTON   = 1;
    uint256 public constant ELECTRON = 2;

    uint256 public constant BASE_ENERGY_MINT_ATOM  = 100;
    uint256 public constant BASE_ENERGY_BURN_ATOM  = 70;

    mapping(uint256 => bytes32) public atomsNeutron;

    uint256[] public MATS_IDS = [NEUTRON, PROTON, ELECTRON];

    constructor (CryptoChemical _cryptoChemical) Mats(_cryptoChemical) {
        // There are 118 atoms
        // Use a byte to represent the neutron for each atom
        // Agroup 32 atoms in a bytes32
        atomsNeutron[0] = 0x00020405060607080a0a0c0c0e0e101012161414181a1c1c1e1e201f23232729;
        atomsNeutron[1] = 0x2a2d2d3030323233343637393a3c3d404245474c4a4d4e51525252545458595d;
        atomsNeutron[2] = 0x5e6162636467686a6c6e6f72737576797b7d7e7e7d86888a8a8e8c9290969497;
        atomsNeutron[3] = 0x9699999d9d9d9f9d9da09da99fa1a1adabafadb0b1b000000000000000000000;
    }

    function getEnergyNeutron(uint256 _base, uint256 _atomId) external view returns(uint256 energy, uint256 neutron) {
        uint256 idOnAtomsNeutron = _atomId - START_ATOMS_IDS;

        neutron = _getNeutron(idOnAtomsNeutron);
        energy = _getEnergy(_base, idOnAtomsNeutron + 1, neutron);
    }

    function mintAtoms(
        address _to,
        uint256 _atomId,
        uint256 _amount
    ) external {
        require(_atomId >= START_ATOMS_IDS && _atomId < END_ATOMS_IDS, "mintAtoms: Should be an atom");

        uint256 idOnAtomsNeutron = _atomId - START_ATOMS_IDS;
        uint256 _atomicNumber = idOnAtomsNeutron + 1;

        uint256 neutron = _getNeutron(idOnAtomsNeutron);

        cryptoChemical.safeTransferFrom(
            msg.sender,
            address(this),
            _getEnergy(BASE_ENERGY_MINT_ATOM, _atomicNumber, neutron) * _amount
        );

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON] = neutron * _amount;
        uint256 aux = _atomicNumber * _amount;
        amounts[PROTON] = aux;
        amounts[ELECTRON] = aux;

        cryptoChemical.safeBatchTransferFrom(
            msg.sender,
            address(this),
            MATS_IDS,
            amounts,
            ""
        );

        cryptoChemical.mint(_to, _atomId, _amount, "");

        emit MintAtoms();
    }

    function mintBatchAtoms(
        address _to,
        uint256[] memory _atomsIds,
        uint256[] memory _atomsAmounts
    ) external {
        (uint256[] memory matAmounts, uint256 energyAmount) = _calcAmounts(_atomsIds, _atomsAmounts);

        cryptoChemical.safeTransferFrom(msg.sender, address(this), energyAmount);

        cryptoChemical.safeBatchTransferFrom(
            msg.sender,
            address(this),
            MATS_IDS,
            matAmounts,
            ""
        );

        cryptoChemical.mintBatch(_to, _atomsIds, _atomsAmounts, "");

        emit MintBatchAtoms();
    }

    function burnAtoms(
        address _beneficiary,
        uint256 _atomId,
        uint256 _amount
    ) external {
        require(_atomId >= START_ATOMS_IDS && _atomId < END_ATOMS_IDS, "mintAtoms: Should be an atom");

        uint256 idOnAtomsNeutron = _atomId - START_ATOMS_IDS;
        uint256 _atomicNumber = idOnAtomsNeutron + 1;

        cryptoChemical.burn(msg.sender, _atomId, _amount);

        uint256 neutron = _getNeutron(idOnAtomsNeutron);

        cryptoChemical.safeTransferFrom(
            msg.sender,
            address(this),
            (_getEnergy(BASE_ENERGY_BURN_ATOM, _atomicNumber, neutron) / 2) * _amount
        );

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON] = neutron * _amount;
        uint256 aux = _atomicNumber * _amount;
        amounts[PROTON] = aux;
        amounts[ELECTRON] = aux;

        cryptoChemical.safeBatchTransferFrom(
            address(this),
            _beneficiary,
            MATS_IDS,
            amounts,
            ""
        );

        emit BurnAtoms();
    }

    function burnBatchAtoms(
        address _beneficiary,
        uint256[] memory _atomsIds,
        uint256[] memory _atomsAmounts
    ) external {
        (uint256[] memory matAmounts, uint256 energyAmount) = _calcAmounts(_atomsIds, _atomsAmounts);

        cryptoChemical.safeTransferFrom(msg.sender, address(this), energyAmount / 2);

        cryptoChemical.safeBatchTransferFrom(
            address(this),
            _beneficiary,
            MATS_IDS,
            matAmounts,
            ""
        );

        cryptoChemical.burnBatch(msg.sender, _atomsIds, _atomsAmounts);

        emit BurnBatchAtoms();
    }

    uint256 constant public ATOMS_IN_ARRAY = 32;
    uint256 constant public BYTE_LENGTH_IN_BIT = 8;

    function _getNeutron(uint256 _atomicNumber) internal view returns(uint8) {
        return uint8(uint256(
            atomsNeutron[_atomicNumber / ATOMS_IN_ARRAY] >>
            (31 - (_atomicNumber % ATOMS_IN_ARRAY)) * BYTE_LENGTH_IN_BIT
        ));
    }

    function _getEnergy(uint256 _base, uint256 _atomicNumber, uint256 _neutron) internal view returns(uint256 energy) {
        return _base + _atomicNumber * 2 * _neutron;
    }

    function _calcAmounts(uint256[] memory _atomsIds, uint256[] memory _amounts) internal view returns(
        uint256[] memory amounts,
        uint256 energyAmount
    ) {
        uint256 idsLength = _atomsIds.length;
        uint256 idOnAtomsNeutron;
        uint256 _atomicNumber;
        uint256 totNeutron;
        uint256 totAtomicNumber;
        uint256 neutron;

        for (uint256 i = 0; i < idsLength; ++i) {
            require(_atomsIds[i] >= START_ATOMS_IDS && _atomsIds[i] < END_ATOMS_IDS, "_calcAmounts: Should be an atom");

            idOnAtomsNeutron = _atomsIds[i] - START_ATOMS_IDS;
            _atomicNumber = idOnAtomsNeutron + 1;
            neutron = _getNeutron(idOnAtomsNeutron);

            energyAmount += _getEnergy(BASE_ENERGY_MINT_ATOM, _atomicNumber, neutron) * _amounts[i];
            totNeutron += neutron * _amounts[i];
            totAtomicNumber += _atomicNumber * _amounts[i];
        }

        amounts = new uint256[](3);
        amounts[NEUTRON] = totNeutron;
        amounts[PROTON] = totAtomicNumber;
        amounts[ELECTRON] = totAtomicNumber;
    }
}