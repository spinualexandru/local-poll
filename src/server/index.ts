import "./utils/dotenv.ts";
import type {ServerHttp2Stream} from 'node:http2';
import {createSecureServer} from 'node:http2';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {queryParams} from "./utils/url.ts";

const server = createSecureServer({
    key: readFileSync(join(process.cwd(), '/', process.env.HTTP2_PRIVATE_KEY)),
    cert: readFileSync(join(process.cwd(), '/', process.env.HTTP2_CERTIFICATE)),
});

function sendJSON(stream: ServerHttp2Stream, data) {
    stream.respond({
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-cache',
        ':status': 200,
    });
    stream.end(JSON.stringify(data));
}

server.on('error', (err) => console.error(err));

server.on('stream', (stream, headers) => {
    const path = headers[':path'];
    const method = headers[':method'];
    const query = queryParams(path);

    if (path.includes("/api/test")) {
        sendJSON(stream, {
            query,
            message: "Hello World",
        })
        return;
    }

    stream.respond({
        'content-type': 'text/html; charset=utf-8',
        ':status': 200,
    });
    stream.end('<h1>Hello World</h1>');
});

server.listen(process.env.HTTP2_PORT || 3000, () => {
    console.log(`[localpoll] Server is listening on port ${process.env.HTTP2_PORT || 3000}`)
});
