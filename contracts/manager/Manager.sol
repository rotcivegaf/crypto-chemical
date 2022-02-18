pragma solidity ^0.8.0;

import "./Atoms.sol";

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";


contract Manager is Atoms {
    constructor (CryptoChemical _cryptoChemical) Atoms(_cryptoChemical) { }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata _ids,
        uint256[] calldata,
        bytes calldata
    ) external returns(bytes4) {
        require(
            _ids.length == MATS_IDS.length &&
                _ids[0] == MATS_IDS[0] &&
                _ids[1] == MATS_IDS[1] &&
                _ids[2] == MATS_IDS[2],
            "onERC1155BatchReceived: Only recives MATS_IDS"
        );

        return 0xbc197c81;
    }
}
