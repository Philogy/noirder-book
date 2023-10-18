mod interfaces;
mod address_note;

contract Trader {

    use dep::std::option::Option;

    use dep::aztec::{
        state_vars::immutable_singleton::ImmutableSingleton,
        context::{PrivateContext, PublicContext, Context},
        types::address::AztecAddress
    };

    use dep::authwit::auth::assert_current_call_valid_authwit;

    use crate::{
        address_note::{AddressNote, ADDRESS_NOTE_LEN, AddressNoteMethods},
        interfaces::Token
    };

    struct Storage {
        token0: ImmutableSingleton<AddressNote, 1>,
        token1: ImmutableSingleton<AddressNote, 1>
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                token0: ImmutableSingleton::new(context, 1, AddressNoteMethods),
                token1: ImmutableSingleton::new(context, 2, AddressNoteMethods)
            }
        }
    }


    #[aztec(private)]
    fn constructor(token0: Field, token1: Field) {
        storage.token0.initialize(&mut AddressNote::new(token0), Option::none());
        storage.token1.initialize(&mut AddressNote::new(token1), Option::none());
    }

    #[aztec(private)]
    fn trade_token0(
        token0_from: AztecAddress,
        token1_from: AztecAddress,
        amount_token0: Field,
        amount_token1: Field,
        nonce: Field,
        nonce_transfer_token0: Field,
        nonce_transfer_token1: Field
    ) {
        assert_current_call_valid_authwit(&mut context, token0_from);
        assert (token1_from.address == context.msg_sender());

        Token::at(storage.token0.get_note().address).transfer(
            &mut context,
            token0_from.address,
            token1_from.address,
            amount_token0,
            nonce_transfer_token0
        );
        Token::at(storage.token1.get_note().address).transfer(
            &mut context,
            token1_from.address,
            token0_from.address,
            amount_token1,
            nonce_transfer_token1
        );
    }
}
