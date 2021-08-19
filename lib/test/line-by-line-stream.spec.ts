import stream from 'stream';
import { } from 'ts-jest/utils';
import { promisify } from 'util';
import { createLineByLineStream } from '../line-by-line-stream';
import { createGeneratorStream, createChunkCountingStream, createSinkStream } from './spec-utils';

const pipeline = promisify(stream.pipeline);

test('stream-to-completion', async () => {
    const { stream: lineCounter, getCount } = createChunkCountingStream();
    
    await pipeline(
        createGeneratorStream(false),
        createLineByLineStream(),
        lineCounter,
        createSinkStream(false),
    );

    expect(getCount()).toStrictEqual(4097);
});

test('stream-source-error', async () => {
    expect.assertions(1);
    
    try {
        await pipeline(
            createGeneratorStream(true),
            createLineByLineStream(),
            createSinkStream(false),
        );
    } catch (error) {
        expect(error.message).toMatch('Generate Error!');
    }
});

test('stream-destination-error', async () => {
    expect.assertions(1);
    
    try {
        await pipeline(
            createGeneratorStream(false),
            createLineByLineStream(),
            createSinkStream(true),
        );
    } catch (error) {
        expect(error.message).toMatch('Sink Error!');
    }
});