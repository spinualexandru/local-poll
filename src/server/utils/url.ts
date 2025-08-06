import * as querystring from "node:querystring";

export const queryParams = <T = any>(path: string): T => {
    if (!path.includes('?')) return {} as T;
    if (path.split('?')[1] === '') return {} as T;

    return querystring.parse(path.split('?')[1] || '') as T;
}