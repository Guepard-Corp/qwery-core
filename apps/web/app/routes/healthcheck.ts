import { data } from 'react-router';

/**
 * Healthcheck endpoint for the web app. If this endpoint returns a 200, the web app will be considered healthy.
 * If this endpoint returns a 500, the web app will be considered unhealthy.
 * This endpoint can be used by Docker to determine if the web app is healthy and should be restarted.
 */
export async function loader() {
  return data({
    services: {
      database: true,
      // add other services here
    },
  });
}
