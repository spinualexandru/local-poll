import {readFileSync} from "node:fs";
import {parseEnv} from "node:util";

export const dotenv = () => {
    const dotenvContent = readFileSync(process.cwd() + "/.env", "utf-8");
    const env = parseEnv(dotenvContent);

    Object.freeze(env);
    Object.seal(env);

    for (const key in env) {
        process.env[key] = env[key];
    }
}

export const checkMandatoryEnv = () => {
    const requiredFields = [
        'HTTP2_PRIVATE_KEY',
        'HTTP2_CERTIFICATE'
    ]

    for (const field of requiredFields) {
        if (!process.env[field]) {
            throw new Error(`Missing mandatory environment variable: ${field}`);
            process.exit(1);
            process.abort();
        }
    }
}

dotenv();
checkMandatoryEnv();
