import readline from 'readline';

/**
 * Reads a stream line by line. Iterate over the iterator using `for await` loop.
 * @param stream Readable stream to read line by line.
 * @returns Iterator that yields individual lines.
 */
 export function lineByLine(stream: NodeJS.ReadableStream): AsyncIterableIterator<string> {
    // Store a captured error in a promise
    let setCapturedError: (error?: any) => void;
    const capturedError = new Promise<never>((_resolve, reject) => {
        setCapturedError = reject;
    });
    
    // Clean up all resources
    let isDestroyed = false;
    const cleanup = (): void => {
        if (isDestroyed == false) {
            isDestroyed = true;

            stream.off('error', onError);
            stream.off('close', cleanup);
            readLineInterface.off('close', cleanup);

            // Close the readline interface
            readLineInterface.close();

            // Destroy the stream
            const s: any = stream;
            if (typeof s.destroy === 'function') {
                s.destroy();
            }
        }
    };

    const onError = (err: Error): void => {
        setCapturedError(err);
        cleanup();
    };

    stream.once('error', onError);
    stream.once('close', cleanup);

    // Use readline package to process the stream
    const readLineInterface = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
    });
    readLineInterface.once('close', cleanup);

    const readLineIterator = readLineInterface[Symbol.asyncIterator]();

    // Create our own async iterator that wraps the readline iterator
    const iterator: AsyncIterableIterator<string> = {
        async next() {
            try {
                return await Promise.race([
                    capturedError,
                    readLineIterator.next(),
                ]);
            } catch (error) {
                onError(error);
                throw error;
            }
        },

        // Called when there is a "break;", "throw;" or "return;" in "for await" loop
        // https://262.ecma-international.org/6.0/#sec-iteration
        async return(value) {
            try {
                if (readLineIterator.return != null) {
                    return await readLineIterator.return(value);
                } else {
                    return {
                        done: true,
                        value,
                    };
                }
            } finally {
                cleanup();
            }
        },

        // No idea who ever uses this, but let's cleanup anyway
        async throw(e) {
            try {
                if (readLineIterator.throw != null) {
                    return await readLineIterator.throw(e);
                } else if (e != null) {
                    throw e;
                } else {
                    return {
                        done: true,
                        value: undefined,
                    };
                }
            } finally {
                cleanup();
            }
        },

        // Conform to the only-once iterable protocol:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#iterables
        [Symbol.asyncIterator]: () => iterator,
    };

    return iterator;
}