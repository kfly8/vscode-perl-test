#!/usr/bin/env perl
use strict;
use warnings;
use Test2::V0;
use Test2::Plugin::SubtestFilter;

subtest 'basic test' => sub {
    ok 1, 'simple test';
};

subtest 'parent' => sub {
    subtest 'child1' => sub {
        ok 1, 'nested test';
    };
    subtest 'child2' => sub {
        ok 1, 'another nested test';
    };
};

subtest 'ネストされた arithmetic' => sub {
    is 1 + 1, 2, 'addition works';
};

subtest '🎉 emoji test' => sub {
    ok 1, 'emoji in subtest name';
};

done_testing;
