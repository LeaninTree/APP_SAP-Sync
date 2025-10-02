export interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLUserError[];
}

interface GraphQLUserError {
  message: string;
  locations: Array<{ line: number; column: number }>;
  path: string[];
  extensions: {
    code: string;
    typeName: string;
    fieldName: string;
  };
}

export async function ExternalGraphql<T>(accessToken: string, query: string, shopDomain: string): Promise<T | string> {
    const apiVersion = "2025-07";
    const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            body: JSON.stringify({ query })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Shopify API request failed with status ${response.status}: ${response.statusText}`);
        }
        const result: GraphQLResponse<T> = await response.json();
        if (result.errors && result.errors.length > 0) {
            const errorMessages = result.errors.map(err => err.message).join(' | ');
            throw new Error(`GraphQL Errors received: ${errorMessages}`);
        }
        return result.data;
    } catch (error) {
        return JSON.stringify(error);
    }
}