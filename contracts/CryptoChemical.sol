pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CryptoChemical is ERC20("Crypto Chemical Energy", "CCE"), ERC1155, Ownable {
    event SetManager(address _manager);

    address public manager;

    constructor (string memory _uri) ERC1155(_uri) { }

    function setURI(string memory _uri) external onlyOwner {
        _setURI(_uri);
    }

    function setManager(address _manager) external onlyOwner {
        require(_manager != address(0), "setManager: Manager 0x0 is not valid");

        manager = _manager;
        emit SetManager(_manager);
    }

    function mintEnergy(address _account, uint256 _amount) external onlyOwner {
        _mint(_account, _amount);
    }

    function mint(
        address _account,
        uint256 _id,
        uint256 _amount,
        bytes memory _data
    ) external {
        require(msg.sender == manager, "mint: Only the manager can mint");

        _mint(_account, _id, _amount, _data);
    }

    function mintBatch(
        address _account,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) external {
        require(msg.sender == manager, "mintBatch: Only the manager can mint");

        _mintBatch(_account, _ids, _amounts, _data);
    }

    function burn(
        address _account,
        uint256 _id,
        uint256 _amount
    ) external {
        _burn(_account, _id, _amount);
    }

    function burnBatch(
        address _account,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) external {
        _burnBatch(_account, _ids, _amounts);
    }
}