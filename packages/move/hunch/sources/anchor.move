module hunch::anchor;

use sui::clock::Clock;
use sui::event;

const ROOT_LENGTH: u64 = 32;

#[error]
const EBadRoot: vector<u8> = b"The root must be 32 bytes.";
#[error]
const EEmptyBatch: vector<u8> = b"A batch must hold at least one pick.";

public struct Anchored has copy, drop {
    root: vector<u8>,
    count: u64,
    timestamp_ms: u64,
    by: address,
}

public fun anchor(root: vector<u8>, count: u64, clock: &Clock, ctx: &TxContext) {
    assert!(root.length() == ROOT_LENGTH, EBadRoot);
    assert!(count > 0, EEmptyBatch);
    event::emit(Anchored { root, count, timestamp_ms: clock.timestamp_ms(), by: ctx.sender() });
}
