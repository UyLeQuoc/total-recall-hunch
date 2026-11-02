#[test_only]
module hunch::anchor_tests;

use hunch::anchor;
use sui::clock;
use sui::event;
use sui::test_scenario;

const SENDER: address = @0xA11CE;

fun root(): vector<u8> {
    let mut bytes = vector[];
    let mut i: u8 = 0;
    while (i < 32) {
        bytes.push_back(i);
        i = i + 1;
    };
    bytes
}

#[test]
fun anchors_a_batch_and_emits_one_event() {
    let mut scenario = test_scenario::begin(SENDER);
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(1_793_635_200_000);
    anchor::anchor(root(), 3, &clock, scenario.ctx());
    assert!(event::num_events() == 1);
    clock.destroy_for_testing();
    scenario.end();
}

#[test, expected_failure(abort_code = anchor::EBadRoot)]
fun refuses_a_root_that_is_not_32_bytes() {
    let mut scenario = test_scenario::begin(SENDER);
    let clock = clock::create_for_testing(scenario.ctx());
    anchor::anchor(vector[1, 2, 3], 1, &clock, scenario.ctx());
    clock.destroy_for_testing();
    scenario.end();
}

#[test, expected_failure(abort_code = anchor::EEmptyBatch)]
fun refuses_an_empty_batch() {
    let mut scenario = test_scenario::begin(SENDER);
    let clock = clock::create_for_testing(scenario.ctx());
    anchor::anchor(root(), 0, &clock, scenario.ctx());
    clock.destroy_for_testing();
    scenario.end();
}
