# Yield bearing tokens

This service provides all token yields we know about. It returns a JSON object with token addresses as keys and APRs in basis points as values.
```ts
GET / => { [address: `0x${string}`]: number }
```

An example of the response body is as follows:
```json
{
  "0xbe9895146f7af43049ca1c1ae358b0541ea49704": 479,
  "0xae78736cd615f374d3085123a210448e74fc6393": 492,
  ...
  "0x7966c5bae631294d7cffcea5430b78c2f76db6fa": 6762
}
```

### Development

The service is deployed as a Cloudflare Worker and relies on a KV store for persistence.

To run it locally, you must first clone the repository, install the dependencies, and then start the development server using npx wrangler dev.

To run it locally:
```sh
git clone git@github.com:regenerative-fi/yield-tokens.git
cd yield-tokens
bun i
npx wrangler dev
```

To add new tokens with yield, you can use the existing default fetching function `defaultFetch`. This function works for data exposed under an API endpoint as a JSON object. For example, Lido stETH exposes its APR under the key `data.smaApr` using the following endpoint:


```js
// https://eth-api.lido.fi/v1/protocol/steth/apr/sma
{
  "data": {
    ...
    "smaApr": 5.554285714285716
  }
}
```
To fetch the APR for the Lido stETH token using defaultFetch, you can use the following request:

```ts
defaultFetch({
  tokens: [
    '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', 
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', 
    '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd', 
    '0x5979d7b546e38e414f7e9822514be443a4800529'
  ],
  url: 'https://eth-api.lido.fi/v1/protocol/steth/apr/sma', 
  path: 'data.smaApr'
}) => {
  [address: `0x${string}`]: number
}
```

In case the token yield is exposed in a different format, you may need to implement custom fetching logic.

The fetching function must handle a request and return the APR as an object:

```ts
{ [address: string]: number }
```
