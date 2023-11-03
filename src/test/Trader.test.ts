import {
  Fr,
  createPXEClient,
  PXE,
  getSandboxAccountsWallets,
  AccountWalletWithPrivateKey,
  Wallet,
  computeAuthWitMessageHash,
  Note,
  ExtendedNote,
  DeployTxReceipt,
  AztecAddress
} from '@aztec/aztec.js'
import { TokenContract } from '../types/token/Token.js'
import { TraderContract } from '../types/trader/Trader.js'

const { PXE_URL = 'http://localhost:8080' } = process.env

describe('Trader', () => {
  let pxe: PXE
  let wallets: AccountWalletWithPrivateKey[]
  let owner: AccountWalletWithPrivateKey
  let token: TokenContract[]
  let trader: TraderContract
  let deployReceipt: DeployTxReceipt

  beforeAll(async () => {
    token = new Array(2)

    pxe = createPXEClient(PXE_URL)

    wallets = await getSandboxAccountsWallets(pxe)

    owner = wallets[0]

    token[0] = await TokenContract.deploy(pxe as Wallet, owner.getAddress())
      .send()
      .deployed()
    token[1] = await TokenContract.deploy(pxe as Wallet, owner.getAddress())
      .send()
      .deployed()

    const tx = TraderContract.deploy(
      pxe as Wallet,
      token[0].address,
      token[1].address
    ).send()

    deployReceipt = await tx.wait()
    trader = await tx.deployed()

    async function addTraderTokenNote(
      token: AztecAddress,
      storageSlot: Fr,
      wallet: AccountWalletWithPrivateKey
    ): Promise<void> {
      const extendNote = new ExtendedNote(
        new Note([token.toField()]),
        wallet.getAddress(),
        trader.address,
        storageSlot,
        deployReceipt.txHash
      )
      await wallet.addNote(extendNote)
    }

    await Promise.all(
      [0, 1].map((tokenIndex) => {
        Promise.all(
          wallets.map((wallet) =>
            addTraderTokenNote(
              token[tokenIndex].address,
              new Fr(tokenIndex + 1),
              wallet
            )
          )
        )
      })
    )

    await Promise.all(
      wallets.map((wallet) =>
        Promise.all(
          token.map((t) =>
            t
              .withWallet(owner)
              .methods.mint_private(wallet.getAddress(), 1000n)
              .send()
              .wait()
          )
        )
      )
    )
  })

  it.only('basic trade', async () => {
    const [, alice, bob] = wallets

    const aliceAmountOut = 200n
    const aliceTransferNonce = Fr.random()
    const aliceTradeNonce = Fr.random()
    const aliceTransfer = await computeAuthWitMessageHash(
      trader.address,
      token[0].methods
        .transfer(
          alice.getAddress(),
          bob.getAddress(),
          aliceAmountOut,
          aliceTransferNonce
        )
        .request()
    )
    const aliceTransferAuthwit = await alice.createAuthWitness(aliceTransfer)

    const bobAmountOut = 100n
    const bobTransferNonce = Fr.random()
    const bobTransfer = await computeAuthWitMessageHash(
      trader.address,
      token[1].methods
        .transfer(
          bob.getAddress(),
          alice.getAddress(),
          bobAmountOut,
          bobTransferNonce
        )
        .request()
    )
    const bobTransferAuthwit = await bob.createAuthWitness(bobTransfer)

    const trade = trader
      .withWallet(bob)
      .methods.trade_token0(
        alice.getAddress(),
        aliceAmountOut,
        bobAmountOut,
        aliceTradeNonce,
        aliceTransferNonce,
        bobTransferNonce
      )
    const tradeHash = await computeAuthWitMessageHash(
      bob.getAddress(),
      trade.request()
    )
    const aliceTradeAuthwit = await alice.createAuthWitness(tradeHash)

    await Promise.all(
      [aliceTransferAuthwit, bobTransferAuthwit, aliceTradeAuthwit].map(
        async (authwit) => {
          bob.addAuthWitness(authwit)
          pxe.addAuthWitness(authwit)
        }
      )
    )

    const prevAlice0 = await token[0].methods
      .balance_of_private(alice.getAddress())
      .view()
    const prevAlice1 = await token[1].methods
      .balance_of_private(alice.getAddress())
      .view()
    const prevBob0 = await token[0].methods
      .balance_of_private(bob.getAddress())
      .view()
    const prevBob1 = await token[1].methods
      .balance_of_private(bob.getAddress())
      .view()

    await trade.send().wait()

    const afterAlice0 = await token[0].methods
      .balance_of_private(alice.getAddress())
      .view()
    const afterAlice1 = await token[1].methods
      .balance_of_private(alice.getAddress())
      .view()
    const afterBob0 = await token[0].methods
      .balance_of_private(bob.getAddress())
      .view()
    const afterBob1 = await token[1].methods
      .balance_of_private(bob.getAddress())
      .view()

    expect(afterAlice0).toEqual(prevAlice0 - aliceAmountOut)
    expect(afterBob0).toEqual(prevBob0 + aliceAmountOut)

    expect(afterBob1).toEqual(prevBob1 - bobAmountOut)
    expect(afterAlice1).toEqual(prevAlice1 + bobAmountOut)

    // await alice.createAuthWitness(Fr.fromBuffer())
  })
})
