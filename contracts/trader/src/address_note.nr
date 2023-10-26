use dep::aztec::note::{
    note_interface::NoteInterface,
    note_header::NoteHeader,
    utils::compute_siloed_note_hash
};
use dep::aztec::context::PrivateContext;
use dep::aztec::oracle::get_secret_key::get_secret_key;

global ADDRESS_NOTE_LEN: Field = 1;

// Stores an address
struct AddressNote {
    address: Field,
    header: NoteHeader,
}

impl AddressNote {
    pub fn new(address: Field) -> Self {
        AddressNote {
            address,
            header: NoteHeader::empty(),
        }
    }

    pub fn serialize(self) -> [Field; ADDRESS_NOTE_LEN] {
        [self.address]
    }

    pub fn compute_nullifier(self) -> Field {
        let siloed_note_hash = compute_siloed_note_hash(AddressNoteMethods, self);
        dep::std::hash::pedersen([ siloed_note_hash ])[0]
    }

    pub fn set_header(&mut self, header: NoteHeader) {
        self.header = header;
    }
}

fn deserialize(preimage: [Field; ADDRESS_NOTE_LEN]) -> AddressNote {
    AddressNote {
        address: preimage[0],
        header: NoteHeader::empty(),
    }
}

fn serialize(note: AddressNote) -> [Field; ADDRESS_NOTE_LEN] {
    note.serialize()
}

fn compute_note_hash(note: AddressNote) -> Field {
    // TODO(#1205) Should use a non-zero generator index.
    dep::std::hash::pedersen(note.serialize())[0]
}

fn compute_nullifier(note: AddressNote) -> Field {
    note.compute_nullifier()
}

fn get_header(note: AddressNote) -> NoteHeader {
    note.header
}

fn set_header(note: &mut AddressNote, header: NoteHeader) {
    note.set_header(header);
}

// Empty broadcast to satisfy interface
fn broadcast(context: &mut PrivateContext, slot: Field, note: AddressNote) { }

global AddressNoteMethods = NoteInterface {
    deserialize,
    serialize,
    compute_note_hash,
    compute_nullifier,
    get_header,
    set_header,
    broadcast
};
