import {test} from 'node:test';
import {deepStrictEqual, strictEqual} from 'node:assert';
import {queryParams} from "../url.ts";

test('queryParams should parse query string correctly', (t) => {
    strictEqual(queryParams('http://example.com/path?name=John&age=30').name, 'John');
    strictEqual(queryParams('http://example.com/path?name=John&age=30').age, '30');
    deepStrictEqual(queryParams('http://example.com/path?name=John&age=30'), {name: 'John', age: '30'});
});

test('queryParams should handle empty query string', (t) => {
    deepStrictEqual(queryParams('http://example.com/path'), {});
});

test('queryParams should handle no query string', (t) => {
    deepStrictEqual(queryParams('http://example.com/path?'), {});
});

test('queryParams should handle malformed URLs gracefully', (t) => {
    deepStrictEqual(queryParams('http://example.com/path?name=John&age'), {name: 'John', age: ''});
    deepStrictEqual(queryParams('http://example.com/path?'), {});
    deepStrictEqual(queryParams('http://example.com/path'), {});
    deepStrictEqual(queryParams('http://example.com/path?name='), {name: ''});
});