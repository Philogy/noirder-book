import { writeFileSync } from 'fs'
import {
  createPXEClient,
  getSandboxAccountsWallets,
  AztecAddress,
  PXE
} from '@aztec/aztec.js'
import { TokenContract } from './types/token/Token.js'
import { TraderContract } from './types/trader/Trader.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

const deployToken =
  (pxe: PXE, addr: AztecAddress) => async (): Promise<TokenContract> => {
    const token = await TokenContract.deploy(pxe, addr).send().deployed()
    console.log(`Token deployed at ${token.address.toString()}`)
    return token
  }

async function main() {
  const pxe = createPXEClient(PXE_URL)
  const [owner, user1, user2] = await getSandboxAccountsWallets(pxe)

  console.log('start')

  const deployer = deployToken(pxe, owner.getAddress())

  const token0 = await deployer()
  const token1 = await deployer()

  const trader = await TraderContract.deploy(
    pxe,
    token0.address.toField(),
    token1.address.toField()
  )
    .send()
    .deployed()

  console.log(`Trader deployed at ${trader.address.toString()}`)

  const addresses = {
    token0: token0.address.toString(),
    token1: token1.address.toString(),
    trader: trader.address.toString()
  }
  writeFileSync('addresses.json', JSON.stringify(addresses, null, 2))

  console.log('Minting tokens to user1')

  let receipt = await token0
    .withWallet(owner)
    .methods.mint_private(user1.getAddress(), 100n)
    .send()
    .wait()

  console.log(`Minted in ${receipt.txHash.toString()}`)

  console.log('Minting tokens to user2')

  receipt = await token1
    .withWallet(owner)
    .methods.mint_private(user2.getAddress(), 80n)
    .send()
    .wait()

  console.log(`Minted in ${receipt.txHash.toString()}`)
}

main().catch((err) => {
  console.error(`Error in deployment script: ${err}`)
  process.exit(1)
})
