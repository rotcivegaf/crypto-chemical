pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


contract CryptoChemical is ERC20("Crypto Chemical Energy", "CCE"), ERC1155, Ownable {
    using ECDSA for bytes32;

    event SetManager(address _manager);

    event SignMintEnergy();
    event CancelHash();

    address public manager;
    mapping(bytes32 => bool) public canceledMsgHashes;

    constructor (string memory _uri) ERC1155(_uri) { }

    function setURI(string memory _uri) external onlyOwner {
        _setURI(_uri);
    }

    function setManager(address _manager) external onlyOwner {
        require(_manager != address(0), "setManager: Manager 0x0 is not valid");

        manager = _manager;
        emit SetManager(_manager);
    }

    // For Energy(ERC20)

    function mintEnergy(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function signMintEnergy(
        address _to,
        uint256 _amount,
        uint256 _expiry,
        uint256 _salt,
        bytes memory _ownerSignature
    ) external {
        // solium-disable-next-line
        require(block.timestamp <= _expiry, "signMintEnergy: The signature has expired");

        bytes32 msgHash = keccak256(
            abi.encodePacked(
                address(this),
                _to,
                _amount,
                _expiry,
                _salt
            )
        );

        require(!canceledMsgHashes[msgHash], "signMintEnergy: The signature was canceled");
        canceledMsgHashes[msgHash] = true;

        require(
            owner() == msgHash.toEthSignedMessageHash().recover(_ownerSignature),
            "signMintEnergy: Invalid owner signature"
        );

        _mint(_to, _amount);

        emit SignMintEnergy();
    }

    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data
    ) external {
        require(msg.sender == manager, "mint: Only the manager");

        _mint(_to, _id, _amount, _data);
    }

    // For Energy(ERC1155)

    function mintBatch(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) external {
        require(msg.sender == manager, "mintBatch: Only the manager");

        _mintBatch(_to, _ids, _amounts, _data);
    }

    function burn(
        address _account,
        uint256 _id,
        uint256 _amount
    ) external {
        require(msg.sender == manager, "burn: Only the manager");

        _burn(_account, _id, _amount);
    }

    function burnBatch(
        address _account,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external {
        require(msg.sender == manager, "burnBatch: Only the manager");

        _burnBatch(_account, _ids, _amounts);
    }

    function cancelSignHash(
        bytes32 _msgHash
    ) external onlyOwner {
        canceledMsgHashes[_msgHash] = true;

        emit CancelHash();
    }
}