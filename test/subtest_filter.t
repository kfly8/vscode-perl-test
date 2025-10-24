use Test2::V0;
use Test2::Plugin::SubtestFilter;

subtest first_subtest => sub {
    ok 1, 'test inside first subtest';
};

subtest second_subtest => sub {
    ok 1, 'test inside second subtest';

    subtest 'nested foo1' => sub {
        ok 1, 'nested test in foo1';
        ok 1, 'another nested test in foo1';
    };

    subtest 'nested foo2' => sub {
        ok 1, 'nested test in foo2';
        ok 1, 'another nested test in foo2';
    };
};

done_testing;
