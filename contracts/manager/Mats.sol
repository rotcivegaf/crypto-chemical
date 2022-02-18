pragma solidity ^0.8.0;

import "./ManagerBase.sol";


abstract contract Mats is ManagerBase {
    using ECDSA for bytes32;

    event MintMats();
    event SignMintMats();
    event MintBatchMats();
    event SignMintBatchMats();

    uint256 public constant END_MATS_IDS  = 3;

    constructor (CryptoChemical _cryptoChemical) ManagerBase(_cryptoChemical) { }

    function _mintMats(
        address _to,
        uint256 _id,
        uint256 _amount
    ) internal {
        require(_id < END_MATS_IDS, "mintMats: Should be a mat");

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
            owner() == msgHash.toEthSignedMessageHash().recover(_ownerSignature),
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
            require(_ids[i] < END_MATS_IDS, "mintBatchMats: Should be a mat");

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
            owner() == msgHash.toEthSignedMessageHash().recover(_ownerSignature),
            "signMintBatchMats: Invalid owner signature"
        );

        _mintBatchMats(_to, _ids, _amounts);

        emit SignMintBatchMats();
    }
}