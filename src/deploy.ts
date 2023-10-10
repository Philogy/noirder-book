import { createPXEClient, getSandboxAccountsWallets } from '@aztec/aztec.js'
import { TokenContract } from './contracts/token/types/Token.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

async function main() {
  const pxe = createPXEClient(PXE_URL)
  const [owner] = await getSandboxAccountsWallets(pxe)

  const token = await TokenContract.deploy(pxe, owner.getAddress())
    .send()
    .deployed()

  console.log(`Token deployed at ${token.address.toString()}`)

  const addresses = {
    token: token.address.toString()
  }
  console.log('addresses:', addresses)
}

main().catch((err) => {
  console.error(`Error in deployment script: ${err}`)
  process.exit(1)
})
