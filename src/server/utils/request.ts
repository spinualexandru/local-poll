import type {ServerHttp2Stream} from "node:http2";

export const queryParams = <T = any>(path: string): T => {
    // Ensure path is a string and prepend a dummy base if needed
    const url = new URL(path, path.startsWith('http') ? undefined : 'http://_/');
    return Object.fromEntries(url.searchParams.entries()) as T;
}

export const getBody = (stream: ServerHttp2Stream): Promise<any> => {
    return new Promise<string>((resolve, reject) => {
        let body = '';
        stream.on('data', (chunk: Buffer) => {
            body += chunk.toString();
        });
        stream.on('end', () => {
            let result = '{}';
            try {
                result = JSON.parse(body || '{}');
            } catch (error) {
                console.error('Error parsing JSON body:', error);
                return reject(new Error('Invalid JSON body'));
            }
            resolve(JSON.parse(body || '{}'));
        });
        stream.on('error', (error: Error) => {
            reject(error);
        });
    });
}