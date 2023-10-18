use dep::aztec::context::{
    PrivateContext,
    PublicContext
};
use dep::aztec::selector::compute_selector;

use dep::aztec::constants_gen::RETURN_VALUES_LENGTH;

struct Token {
    address: Field,
}

impl Token {
    pub fn at(address: Field) -> Self {
        Self { address }
    }

    pub fn transfer(self: Self, context: &mut PrivateContext, from: Field, to: Field, amount: Field, nonce: Field) -> [Field; RETURN_VALUES_LENGTH] {
        context.call_private_function(
            self.address,
            compute_selector("transfer((Field),(Field),Field,Field)"),
            [from, to, amount, nonce]
        )
    }
}
