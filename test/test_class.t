use parent 'Test::Class';
use Test2::V0;
use Test2::Plugin::SubtestFilter;

sub test_basic : Test {
    ok 1, 'simple test in Test::Class';
}

sub test_with_subtests : Tests {
    subtest first_subtest => sub {
        ok 1, 'test inside first subtest';
    };

    subtest second_subtest => sub {
        ok 1, 'test inside second subtest';

        subtest nested_subtest => sub {
            ok 1, 'deeply nested test';
        };
    };
}

sub test_another_method : Test {
    is 1 + 1, 2, 'arithmetic in Test::Class';
}

__PACKAGE__->runtests;
