export const queryParams = <T = any>(path: string): T => {
    // Ensure path is a string and prepend a dummy base if needed
    const url = new URL(path, path.startsWith('http') ? undefined : 'http://_/');
    return Object.fromEntries(url.searchParams.entries()) as T;
}