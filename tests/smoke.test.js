import { describe, it, expect } from 'vitest'
import * as lib from '../src/index.js'

describe('library entry', () => {
  it('exports the client factory', () => {
    expect(typeof lib.createSinpapelClient).toBe('function')
  })
})
