import { writeFileSync } from 'fs'
import { createPXEClient, getSandboxAccountsWallets } from '@aztec/aztec.js'
import { TokenContract } from './types/token/Token.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

async function main() {
  const pxe = createPXEClient(PXE_URL)
  const [owner, user1] = await getSandboxAccountsWallets(pxe)

  const token = await TokenContract.deploy(pxe, owner.getAddress())
    .send()
    .deployed()

  console.log(`Token deployed at ${token.address.toString()}`)

  const addresses = {
    token: token.address.toString()
  }
  console.log('addresses:', addresses)
  writeFileSync('addresses.json', JSON.stringify(addresses, null, 2))

  await token
    .withWallet(owner)
    .methods.set_minter(user1.getAddress(), true)
    .send()
    .wait()

  const isMinter = await token.methods.is_minter(user1.getAddress()).view()
  console.log('isMinter:', isMinter)
}

main().catch((err) => {
  console.error(`Error in deployment script: ${err}`)
  process.exit(1)
})
