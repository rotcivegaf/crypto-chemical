[![Lint Sol Status](https://github.com/rotcivegaf/crypto-chemical/workflows/Lint%20Sol/badge.svg)](https://github.com/rotcivegaf/crypto-chemical/actions?query=workflow%3A%22Lint+Sol%22)
[![Lint JS Status](https://github.com/rotcivegaf/crypto-chemical/workflows/Lint%20JS/badge.svg)](https://github.com/rotcivegaf/crypto-chemical/actions?query=workflow%3A%22Lint+JS%22)
[![Test Status](https://github.com/rotcivegaf/crypto-chemical/workflows/Test%20Contracts/badge.svg)](https://github.com/rotcivegaf/crypto-chemical/actions?query=workflow%3A%22Test+Contracts%22)
[![Coverage Status](https://github.com/rotcivegaf/crypto-chemical/workflows/Coverage/badge.svg)](https://github.com/rotcivegaf/crypto-chemical/actions?query=workflow%3ACoverage)

[![Coverage](https://codecov.io/gh/rotcivegaf/crypto-chemical/graph/badge.svg)](https://codecov.io/gh/rotcivegaf/crypto-chemical)

# Crypto Chemical

The CryptoChemical contract implements two interface, ERC20 and ERC1155

## Energy

The Energy (ERC20) uses to create atoms
  . The owner of the contract is in charge of the minted of Energy

## Particles

In the ERC1155 haves 3 particles:
  . Neutron (id 0)
  . Proton (id 1)
  . Electron (id 2)

The manager of the contract is in charge of the minted of particles

## Atoms

We have the 118 atoms of the periodic table (id from 3 to 121), these atoms can be minted in base of energy and the 3 particles

These atoms can be burned and consume energy but return the particles

# Manager V1

In addition, the minted particles, the manager contract can mint atoms

This contract storage the recipes of the atoms. Look in [RecipesV1.md](https://github.com/rotcivegaf/crypto-chemical/blob/master/RecipesV1.md)