import { createAuthenticator } from "cloudflare-access";

export const authenticate = (
  env: { AUTH_DOMAIN: string; AUTH_AUD: string; AUTH_DEV?: string },
  request: { headers: Headers; url: string }
) => {
  const authenticator = createAuthenticator({
    domain: env.AUTH_DOMAIN,
    aud: env.AUTH_AUD,
  });

  if (env.AUTH_DEV) {
    return authenticator({
      url: request.url,
      headers: new Headers({ "Cf-Access-Jwt-Assertion": env.AUTH_DEV }),
    });
  }

  return authenticator(request);
};
