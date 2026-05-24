export interface StablecoinDefinition {
  symbol: string;
  address: `0x${string}`;
  issuer: string;
  useCase: string;
  decimals: number;
}

export const STABLECOINS: StablecoinDefinition[] = [
    {
      symbol: "USDm",
      address: "0x765de816845861e75a25fca122bb6898b8b1282a",
      issuer: "Mento",
      useCase: "US Dollar-pegged stablecoin (Mento Dollar)",
      decimals: 18,
    },
    {
      symbol: "EURm",
      address: "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73",
      issuer: "Mento",
      useCase: "Euro-pegged stablecoin (Mento Euro)",
      decimals: 18,
    },
    {
      symbol: "BRLm",
      address: "0xe8537a3d056da446677b9e9d6c5db704eaab4787",
      issuer: "Mento",
      useCase: "Brazilian Real-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "XOFm",
      address: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
      issuer: "Mento",
      useCase: "CFA Franc-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "KESm",
      address: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
      issuer: "Mento",
      useCase: "Kenyan Shilling-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "PHPm",
      address: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B",
      issuer: "Mento",
      useCase: "Philippine Peso-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "COPm",
      address: "0x8a567e2ae79ca692bd748ab832081c45de4041ea",
      issuer: "Mento",
      useCase: "Colombian Peso-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "GBPm",
      address: "0xCCF663b1fF11028f0b19058d0f7B674004a40746",
      issuer: "Mento",
      useCase: "British Pound-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "CADm",
      address: "0xff4Ab19391af240c311c54200a492233052B6325",
      issuer: "Mento",
      useCase: "Canadian Dollar-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "AUDm",
      address: "0x7175504C455076F15c04A2F90a8e352281F492F9",
      issuer: "Mento",
      useCase: "Australian Dollar-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "ZARm",
      address: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6",
      issuer: "Mento",
      useCase: "South African Rand-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "GHSm",
      address: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313",
      issuer: "Mento",
      useCase: "Ghanaian Cedi-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "NGNm",
      address: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
      issuer: "Mento",
      useCase: "Nigerian Naira-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "JPYm",
      address: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20",
      issuer: "Mento",
      useCase: "Japanese Yen-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "CHFm",
      address: "0xb55a79F398E759E43C95b979163f30eC87Ee131D",
      issuer: "Mento",
      useCase: "Swiss Franc-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "USDT",
      address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
      issuer: "Tether",
      useCase: "Popular stablecoin on multiple blockchains",
      decimals: 6,
    },
    {
      symbol: "USDC",
      address: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
      issuer: "Circle",
      useCase: "Widely used stablecoin with high liquidity",
      decimals: 6,
    },
    {
      symbol: "vEUR",
      address: "0x9346f43c1588b6df1d52bdd6bf846064f92d9cba",
      issuer: "VNX",
      useCase: "Euro-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "vGBP",
      address: "0x7ae4265ecfc1f31bc0e112dfcfe3d78e01f4bb7f",
      issuer: "VNX",
      useCase: "British Pound-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "vCHF",
      address: "0xc5ebea9984c485ec5d58ca5a2d376620d93af871",
      issuer: "VNX",
      useCase: "Swiss Franc-pegged stablecoin",
      decimals: 18,
    },
    {
      symbol: "USDM",
      address: "0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C",
      issuer: "Mountain Protocol",
      useCase: "Yield-bearing stablecoin",
      decimals: 18,
    },
    {
      symbol: "USDA",
      address: "0x0000206329b97DB379d5E1Bf586BbDB969C63274",
      issuer: "Angle",
      useCase: "Yield-bearing USD stablecoin",
      decimals: 18,
    },
    {
      symbol: "EURA",
      address: "0xC16B81Af351BA9e64C1a069E3Ab18c244A1E3049",
      issuer: "Angle",
      useCase: "Yield-bearing Euro stablecoin",
      decimals: 18,
    },
    {
      symbol: "USDGLO",
      address: "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3",
      issuer: "Glo Foundation",
      useCase: "Impact-driven stablecoin supporting global causes",
      decimals: 18,
    },
    {
      symbol: "BRLA",
      address: "0xfecb3f7c54e2caae9dc6ac9060a822d47e053760",
      issuer: "BRLA Digital",
      useCase: "Brazil-based stablecoin",
      decimals: 18,
    },
    {
      symbol: "COPM",
      address: "0xC92E8Fc2947E32F2B574CCA9F2F12097A71d5606",
      issuer: "Minteo",
      useCase: "Fiat-backed Colombian Peso stablecoin",
      decimals: 18,
    },
    {
      symbol: "G$",
      address: "0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a",
      issuer: "GoodDollar",
      useCase: "UBI-focused stablecoin for financial inclusion",
      decimals: 18,
    },
];

export function resolveStablecoins(symbols?: string[]): StablecoinDefinition[] {
  if (!symbols?.length) {
    return STABLECOINS;
  }

  const wanted = new Set(symbols.map((symbol) => symbol.trim().toUpperCase()));
  const matched = STABLECOINS.filter((coin) =>
    wanted.has(coin.symbol.toUpperCase()),
  );

  if (matched.length === 0) {
    throw new Error(
      `No matching stablecoins. Available: ${STABLECOINS.map((coin) => coin.symbol).join(", ")}`,
    );
  }

  return matched;
}
