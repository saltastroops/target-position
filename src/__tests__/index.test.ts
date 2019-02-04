import { hello } from '../index';

describe('hello', () => {
  it('works', () => {
    expect(hello('Sipho')).toEqual('Hello Sipho!');
  })
});
