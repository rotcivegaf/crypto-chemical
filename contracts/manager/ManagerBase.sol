pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../CryptoChemical.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


abstract contract ManagerBase is Ownable {
    event CancelHash();

    event Burn();
    event BurnBatch();

    mapping(bytes32 => bool) public canceledMsgHashes;

    CryptoChemical public immutable cryptoChemical;

    constructor (CryptoChemical _cryptoChemical) {
        cryptoChemical = _cryptoChemical;
    }

    function cancelSignHash(
        bytes32 _msgHash
    ) external onlyOwner {
        canceledMsgHashes[_msgHash] = true;

        emit CancelHash();
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
}