import { } from 'ts-jest/utils';
import { lineByLine } from '../line-by-line-iterator';
import { createGeneratorStream } from './spec-utils';

test('iterate-to-completion', async () => {
    let lastLine: string;

    const stream = createGeneratorStream(false);

    for await (const line of lineByLine(stream)) {
        lastLine = line;
    }

    expect(lastLine!).toMatch('line 4095');
});

test('iterate-break-cleanup', async () => {
    let lineIndex = 0;
    
    const stream = createGeneratorStream(false);

    for await (const _line of lineByLine(stream)) {
        if (lineIndex++ > 5) {
            break;
        }
    }

    expect(stream.destroyed).toStrictEqual(true);
});

test('iterate-throw-cleanup', async () => {
    expect.assertions(2);

    let lineIndex = 0;
    
    const stream = createGeneratorStream(false);

    try {
        for await (const _line of lineByLine(stream)) {
            if (lineIndex++ > 5) {
                throw new Error('breaker');
            }
        }
    } catch (error) {
        expect(error.message).toMatch('breaker');
    }

    expect(stream.destroyed).toStrictEqual(true);
});

test('iterate-error-propagate', async () => {
    expect.assertions(2);

    const stream = createGeneratorStream(true);
    let count = 0;

    try {
        for await (const _line of lineByLine(stream)) {
            count++;
        }
    } catch (error) {
        expect(error.message).toMatch('Generate Error!');
    } finally {
        expect(count).toStrictEqual(4097);
    }
});