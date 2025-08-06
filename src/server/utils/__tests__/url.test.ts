import {test} from 'node:test';
import {deepStrictEqual, strictEqual} from 'node:assert';
import {queryParams} from "../url.ts";

test('queryParams should parse query string correctly', (t) => {
    strictEqual(queryParams('http://example.com/path?name=John&age=30').name, 'John');
    strictEqual(queryParams('http://example.com/path?name=John&age=30').age, '30');
    deepStrictEqual(queryParams('http://example.com/path?name=John&age=30'), {name: 'John', age: '30'});
});