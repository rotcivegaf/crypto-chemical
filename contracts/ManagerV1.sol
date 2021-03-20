pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./CryptoChemical.sol";

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./interfaces/IManager.sol";


contract ManagerV1 is Ownable, IManager {
    using SafeERC20 for CryptoChemical;
    using SafeMath for uint256;

    event MintMats();
    event SignMintMats();
    event MintBatchMats();
    event SignMintBatchMats();

    event MintAtoms();
    event MintBatchAtoms();
    event BurnAtoms();
    event BurnBatchAtoms();

    event Burn();
    event BurnBatch();

    event CancelHash();

    string public constant versionName = "Atoms";

    CryptoChemical public immutable cryptoChemical;

    uint256 public constant NEUTRON  = 0;
    uint256 public constant PROTON   = 1;
    uint256 public constant ELECTRON = 2;
    // ids => 3 - 120 to atoms

    uint256 public constant START_ATOMS_IDS  = 3;
    uint256 public constant END_ATOMS_IDS  = 121;
    uint256 public constant BASE_ENERGY_MINT_ATOM  = 100;
    uint256 public constant BASE_ENERGY_BURN_ATOM  = 70;

    mapping(bytes32 => bool) public canceledMsgHashes;
    mapping(uint256 => bytes32) public atomsNeutron;

    uint256[] public MATS_IDS = [NEUTRON, PROTON, ELECTRON];

    constructor (CryptoChemical _cryptoChemical) {
        cryptoChemical = _cryptoChemical;
        // A recipe
        // There are 118 atoms
        // Use a byte to represent the neutron for each atom
        // Agroup 32 atoms in a id

       atomsNeutron[0] = 0x00020405060607080a0a0c0c0e0e101012161414181a1c1c1e1e201f23232729;
       atomsNeutron[1] = 0x2a2d2d3030323233343637393a3c3d404245474c4a4d4e51525252545458595d;
       atomsNeutron[2] = 0x5e6162636467686a6c6e6f72737576797b7d7e7e7d86888a8a8e8c9290969497;
       atomsNeutron[3] = 0x9699999d9d9d9f9d9da09da99fa1a1adabafadb0b1b000000000000000000000;
    }

    function _mintMats(
        address _to,
        uint256 _id,
        uint256 _amount
    ) internal {
        require(_id < START_ATOMS_IDS, "mintMats: Should be a mat");

        cryptoChemical.mint(_to, _id, _amount, "");
    }

    function mintMats(
        address _to,
        uint256 _id,
        uint256 _amount
    ) external onlyOwner {
        _mintMats(_to, _id, _amount);

        emit MintMats();
    }

    function signMintMats(
        address _to,
        uint256 _id,
        uint256 _amount,
        uint256 _expiry,
        uint256 _salt,
        bytes memory _ownerSignature
    ) external {
        // solium-disable-next-line
        require(block.timestamp <= _expiry, "signMintMats: The signature has expired");

        bytes32 msgHash = keccak256(
            abi.encodePacked(
                address(this),
                address(cryptoChemical),
                _to,
                _id,
                _amount,
                _expiry,
                _salt
            )
        );

        require(!canceledMsgHashes[msgHash], "signMintMats: The signature was canceled");
        canceledMsgHashes[msgHash] = true;

        require(
            owner() == _recoveryOwner(msgHash, _ownerSignature),
            "signMintMats: Invalid owner signature"
        );

        _mintMats(_to, _id, _amount);

        emit SignMintMats();
    }

    function _mintBatchMats(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) internal {
        uint256 idsLength = _ids.length;
        for (uint256 i = 0; i < idsLength; ++i)
            require(_ids[i] < START_ATOMS_IDS, "mintBatchMats: Should be a mat");

        cryptoChemical.mintBatch(_to, _ids, _amounts, "");
    }

    function mintBatchMats(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external onlyOwner {
        _mintBatchMats(_to, _ids, _amounts);

        emit MintBatchMats();
    }

    function signMintBatchMats(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        uint256 _expiry,
        uint256 _salt,
        bytes memory _ownerSignature
    ) external {
        // solium-disable-next-line
        require(block.timestamp <= _expiry, "signMintBatchMats: The signature has expired");

        bytes32 msgHash = keccak256(
            abi.encodePacked(
                address(this),
                address(cryptoChemical),
                _to,
                _ids,
                _amounts,
                _expiry,
                _salt
            )
        );

        require(!canceledMsgHashes[msgHash], "signMintBatchMats: The signature was canceled");
        canceledMsgHashes[msgHash] = true;

        require(
            owner() == _recoveryOwner(msgHash, _ownerSignature),
            "signMintBatchMats: Invalid owner signature"
        );

        _mintBatchMats(_to, _ids, _amounts);

        emit SignMintBatchMats();
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

        cryptoChemical.safeTransferFrom(msg.sender, address(this), _getEnergy(BASE_ENERGY_MINT_ATOM, _atomicNumber, neutron).mul(_amount));

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON]  = neutron.mul(_amount);
        uint256 aux = _atomicNumber.mul(_amount);
        amounts[PROTON]   = aux;
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
        uint256[] memory _amounts
    ) external {
        uint256 idsLength = _atomsIds.length;
        uint256 idOnAtomsNeutron;
        uint256 _atomicNumber;
        uint256 totNeutron;
        uint256 totEnergy;
        uint256 totAtomicNumber;
        uint256 neutron;

        for (uint256 i = 0; i < idsLength; ++i){
            require(_atomsIds[i] >= START_ATOMS_IDS && _atomsIds[i] < END_ATOMS_IDS, "mintBatchAtoms: Should be an atom");

            idOnAtomsNeutron = _atomsIds[i] - START_ATOMS_IDS;
            _atomicNumber = idOnAtomsNeutron + 1;
            neutron = _getNeutron(idOnAtomsNeutron);

            totEnergy = totEnergy.add(_getEnergy(BASE_ENERGY_MINT_ATOM, _atomicNumber, neutron).mul(_amounts[i]));
            totNeutron = totNeutron.add(neutron.mul(_amounts[i]));
            totAtomicNumber = totAtomicNumber.add(_atomicNumber.mul(_amounts[i]));
        }

        cryptoChemical.safeTransferFrom(msg.sender, address(this), totEnergy);

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON]  = totNeutron;
        amounts[PROTON]   = totAtomicNumber;
        amounts[ELECTRON] = totAtomicNumber;

        cryptoChemical.safeBatchTransferFrom(
            msg.sender,
            address(this),
            MATS_IDS,
            amounts,
            ""
        );

        cryptoChemical.mintBatch(_to, _atomsIds, _amounts, "");

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

        cryptoChemical.safeTransferFrom(msg.sender, address(this), _getEnergy(BASE_ENERGY_BURN_ATOM, _atomicNumber, neutron).div(2).mul(_amount));

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON]  = neutron.mul(_amount);
        uint256 aux = _atomicNumber.mul(_amount);
        amounts[PROTON]   = aux;
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
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external {
        uint256 idsLength = _ids.length;
        uint256 idOnAtomsNeutron;
        uint256 _atomicNumber;
        uint256 totNeutron;
        uint256 totEnergy;
        uint256 totAtomicNumber;
        uint256 neutron;

        for (uint256 i = 0; i < idsLength; ++i){
            require(_ids[i] >= START_ATOMS_IDS && _ids[i] < END_ATOMS_IDS, "burnBatchAtoms: Should be an atom");

            idOnAtomsNeutron = _ids[i] - START_ATOMS_IDS;
            _atomicNumber = idOnAtomsNeutron + 1;
            neutron = _getNeutron(idOnAtomsNeutron);

            totEnergy = totEnergy.add(_getEnergy(BASE_ENERGY_MINT_ATOM, _atomicNumber, neutron).mul(_amounts[i]));
            totNeutron = totNeutron.add(neutron.mul(_amounts[i]));
            totAtomicNumber = totAtomicNumber.add(_atomicNumber.mul(_amounts[i]));
        }

        cryptoChemical.safeTransferFrom(msg.sender, address(this), totEnergy.div(2));

        uint256[] memory amounts = new uint256[](3);
        amounts[NEUTRON]  = totNeutron;
        amounts[PROTON]   = totAtomicNumber;
        amounts[ELECTRON] = totAtomicNumber;

        cryptoChemical.safeBatchTransferFrom(
            address(this),
            _beneficiary,
            MATS_IDS,
            amounts,
            ""
        );

        cryptoChemical.burnBatch(msg.sender, _ids, _amounts);

        emit BurnBatchAtoms();
    }

    function burn(
        uint256 _id,
        uint256 _amount
    ) external {
        cryptoChemical.burn(msg.sender, _id, _amount);

        emit Burn();
    }

    function burnBatch(
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external {
        cryptoChemical.burnBatch(msg.sender, _ids, _amounts);

        emit BurnBatch();
    }

    function getEnergyNeutron(uint256 _base, uint256 _atomId) external view returns(uint256 energy, uint256 neutron) {
        uint256 idOnAtomsNeutron = _atomId - START_ATOMS_IDS;

        neutron = _getNeutron(idOnAtomsNeutron);
        energy = _getEnergy(_base, idOnAtomsNeutron + 1, neutron);
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

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external returns(bytes4) {
        return 0xf23a6e61;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external returns(bytes4) {
        return 0xbc197c81;
    }

    function _recoveryOwner(bytes32 _msgHash, bytes memory _signature) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := and(mload(add(_signature, 65)), 255)
        }

        if (v < 27) v += 27;

        return ecrecover(
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _msgHash
                )
            ),
            v,
            r,
            s
        );
    }

    function cancelSignHash(
        bytes32 _msgHash
    ) external onlyOwner {
        canceledMsgHashes[_msgHash] = true;

        emit CancelHash();
    }
}