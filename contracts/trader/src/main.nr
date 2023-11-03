mod interfaces;
mod address_note;

contract Trader {

    use dep::std::option::Option;

    use dep::aztec::{
        state_vars::immutable_singleton::ImmutableSingleton,
        context::{PrivateContext, PublicContext, Context},
        types::address::AztecAddress,
        note::{
            utils as note_utils,
            note_header::NoteHeader
        }
    };

    use dep::authwit::auth::assert_current_call_valid_authwit;

    use dep::aztec::oracle::debug_log::{
        debug_log_field,
        debug_log_array_with_prefix
    };

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
        storage.token0.initialize(&mut AddressNote::new(token0), Option::none(), true);
        storage.token1.initialize(&mut AddressNote::new(token1), Option::none(), true);
    }

    #[aztec(private)]
    fn trade_token0(
        token0_from: AztecAddress,
        amount_token0: Field,
        amount_token1: Field,
        nonce: Field,
        nonce_transfer_token0: Field,
        nonce_transfer_token1: Field
    ) {
        let token0_addr = storage.token0.get_note().address;
        let token1_addr = storage.token1.get_note().address;

        assert_current_call_valid_authwit(&mut context, token0_from);


        Token::at(token0_addr).transfer(
            &mut context,
            token0_from.address,
            context.msg_sender(),
            amount_token0,
            nonce_transfer_token0
        );
        Token::at(token1_addr).transfer(
            &mut context,
            context.msg_sender(),
            token0_from.address,
            amount_token1,
            nonce_transfer_token1
        );
    }


    unconstrained fn compute_note_hash_and_nullifier(
        contract_address: Field,
        nonce: Field,
        storage_slot: Field,
        preimage: [Field; ADDRESS_NOTE_LEN],
    ) -> [Field; 4] {
        let note_header = NoteHeader { contract_address, nonce, storage_slot, is_transient: false };
        note_utils::compute_note_hash_and_nullifier(AddressNoteMethods, note_header, preimage)
    }
}
