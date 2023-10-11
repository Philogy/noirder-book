// import { readFileSync } from 'fs'
// import {
//   Contract,
//   createPXEClient,
//   getSandboxAccountsWallets,
//   AztecAddress
// } from '@aztec/aztec.js'

// const { PXE_URL = 'http://localhost:8080' } = process.env

// export async function getToken(client) {
//   const addresses = JSON.parse(readFileSync('addresses.json'))
//   return Contract.at(addresses.token, TokenContractAbi, client)
// }

// async function main() {
//   const pxe = createPXEClient(PXE_URL)
//   const [owner, recipient] = await getSandboxAccountsWallets(pxe)
//   const token = await getToken(owner)

//   const tx = token.methods
//     .transfer(owner.getAddress(), recipient.getAddress(), 1n, 0)
//     .send()

//   const balance = await token.methods.balance_of_private(account.address).view()

//   console.log(`Balance of ${account.address}: ${balance}`)
// }

// main()
//   .then(() => {
//     process.exit(0)
//   })
//   .catch((err) => {
//     console.error(`Error in app: ${err}`)
//     process.exit(1)
//   })
