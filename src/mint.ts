// src/contracts.mjs
import { readFileSync } from 'fs'
import {
  Wallet,
  PXE,
  createPXEClient,
  getSandboxAccountsWallets,
  AztecAddress
} from '@aztec/aztec.js'
import { TokenContract } from './types/token/Token.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

export async function getToken(client: Wallet) {
  const addresses = JSON.parse(readFileSync('addresses.json').toString())
  return await TokenContract.at(
    AztecAddress.fromString(addresses.token),
    client
  )
}

async function showPrivateBalances(pxe: PXE) {
  const accounts = await pxe.getRegisteredAccounts()
  const token = await getToken(pxe as Wallet)

  for (const account of accounts) {
    // highlight-next-line:showPrivateBalances
    const balance = await token.methods
      .balance_of_private(account.address)
      .view()
    console.log(`Balance of ${account.address}: ${balance}`)
  }
}

async function mintPrivateFunds(pxe: PXE) {
  const [owner] = await getSandboxAccountsWallets(pxe)
  const token = await getToken(owner)

  console.log('token:', token.address.toString())

  await showPrivateBalances(pxe)

  const mintAmount = 20n
  const receipt = await token.methods
    .mint_private(owner.getAddress(), mintAmount)
    .send()
    .wait()

  console.log(`Minted ${mintAmount} at ${receipt.txHash.toString()}`)

  await showPrivateBalances(pxe)
}

async function mintPublic(pxe: PXE) {
  const [owner] = await getSandboxAccountsWallets(pxe)
  const token = await getToken(owner)

  const balPre = await token.methods
    .balance_of_public(owner.getAddress())
    .view()
  console.log('balPre:', balPre)

  await token.methods.mint_public(owner.getAddress(), 100n).send().wait()

  const balAfter = await token.methods
    .balance_of_public(owner.getAddress())
    .view()

  console.log('balAfter:', balAfter)
}

async function shieldFunds(pxe: PXE) {
  const [owner, to] = await getSandboxAccountsWallets(pxe)
  console.log('got wallets')
  const token = await getToken(owner)

  console.log('attempting shield')

  const pending = token.methods
    .shield(owner.getAddress(), to.getAddress(), 3n, 0)
    .send()

  const txHash = await pending.getTxHash()
  console.log('txHash:', txHash)

  const receipt = await pending.wait()
  console.log('txhash:', receipt.txHash)

  await showPrivateBalances(pxe)
}

async function main() {
  const pxe = createPXEClient(PXE_URL)

  await mintPrivateFunds(pxe)

  await mintPublic(pxe)

  console.log('mint done')

  await shieldFunds(pxe)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(`Error in app: ${err}`)
    process.exit(1)
  })
