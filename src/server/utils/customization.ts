export const isCustomizationEnabled = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => env.LOCAL_POLL_ENABLE_CUSTOMIZATION?.trim().toLowerCase() === "true";
