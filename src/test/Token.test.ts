import {
  createPXEClient,
  PXE,
  getSandboxAccountsWallets,
  AccountWalletWithPrivateKey,
  Wallet,
  Fr,
  computeAuthWitMessageHash
} from '@aztec/aztec.js'
import { TokenContract } from '../types/token/Token.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

describe('Token', () => {
  let pxe: PXE
  let wallets: AccountWalletWithPrivateKey[]
  let owner: AccountWalletWithPrivateKey
  let token: TokenContract

  const getTokenFor = async (
    wallet: AccountWalletWithPrivateKey
  ): Promise<TokenContract> => {
    return await TokenContract.at(token.address, wallet)
  }

  beforeAll(async () => {
    pxe = createPXEClient(PXE_URL)

    wallets = await getSandboxAccountsWallets(pxe)

    owner = wallets[0]

    token = await TokenContract.deploy(pxe as Wallet, owner.getAddress())
      .send()
      .deployed()
  })

  it('start balance is zero', async () => {
    await Promise.all(
      wallets.map(async (wallet) => {
        await Promise.all([
          async () => {
            const privateBal = await token.methods
              .balance_of_private(wallet.getAddress())
              .view()
            expect(privateBal.eq(0n))
          },
          async () => {
            const pubBal = await token.methods
              .balance_of_public(wallet.getAddress())
              .view()
            expect(pubBal.eq(0n))
          }
        ])
      })
    )
  })

  it('allows owner to public mint', async () => {
    const to = wallets[1]

    const amount = 33n

    const prevBal = await token.methods
      .balance_of_public(to.getAddress())
      .view()

    await token
      .withWallet(owner)
      .methods.mint_public(to.getAddress(), amount)
      .send()
      .wait()

    const afterBal = await token.methods
      .balance_of_public(to.getAddress())
      .view()

    expect(afterBal).toEqual(prevBal + amount)
  })

  it('allows owner to private mint', async () => {
    const to = wallets[2]

    const amount = 21n

    const prevBal = await (await getTokenFor(to)).methods
      .balance_of_private(to.getAddress())
      .view()

    await token
      .withWallet(owner)
      .methods.mint_private(to.getAddress(), amount)
      .send()
      .wait()

    const afterBal = await (await getTokenFor(to)).methods
      .balance_of_private(to.getAddress())
      .view()

    expect(afterBal).toEqual(prevBal + amount)
  })

  it('transfer with authwit', async () => {
    const [alice, bob] = wallets

    await token
      .withWallet(owner)
      .methods.mint_private(alice.getAddress(), 1000n)
      .send()
      .wait()

    const amount = 200n

    const prevBalAlice = await (await getTokenFor(alice)).methods
      .balance_of_private(alice.getAddress())
      .view()

    const prevBalBob = await (await getTokenFor(bob)).methods
      .balance_of_private(bob.getAddress())
      .view()

    const aliceTransferNonce = Fr.random()
    const aliceTransferHash = Fr.fromBuffer(
      await computeAuthWitMessageHash(
        bob.getAddress(),
        token
          .withWallet(wallets[wallets.length - 1])
          .methods.transfer(
            alice.getAddress(),
            bob.getAddress(),
            amount,
            aliceTransferNonce
          )
          .request()
      )
    )

    const authwit = await alice.createAuthWitness(aliceTransferHash)
    await bob.addAuthWitness(authwit)

    await (await getTokenFor(bob)).methods
      .transfer(
        alice.getAddress(),
        bob.getAddress(),
        amount,
        aliceTransferNonce
      )
      .send({})
      .wait()

    const afterBalAlice = await (await getTokenFor(alice)).methods
      .balance_of_private(alice.getAddress())
      .view()

    expect(afterBalAlice).toEqual(prevBalAlice - amount)

    const afterBalBob = await (await getTokenFor(bob)).methods
      .balance_of_private(bob.getAddress())
      .view()

    expect(afterBalBob).toEqual(prevBalBob + amount)
  })
})
