/**
 * DataCrawler Google Flights 2 — Supported country and currency codes.
 *
 * These sets are used to validate POS selections and currency params
 * before making API calls, avoiding 400 errors.
 */

export const SUPPORTED_COUNTRIES: Set<string> = new Set([
  "AF","AL","DZ","AS","AD","AO","AI","AG","AR","AM","AU","AT","AZ",
  "BS","BH","BD","BY","BE","BZ","BJ","BT","BO","BA","BW","BR","VG","BN","BG","BF","BI",
  "KH","CM","CA","CV","CF","TD","CL","CN","CO","CG","CD","CK","CR","CI","HR","CU","CY","CZ",
  "DK","DJ","DM","DO",
  "EC","EG","SV","EE","ET",
  "FJ","FI","FR",
  "GA","GM","GE","DE","GH","GI","GR","GL","GT","GG","GY",
  "HT","HN","HK","HU",
  "IS","IN","ID","IR","IQ","IE","IM","IL","IT",
  "JM","JP","JE","JO",
  "KZ","KE","KI","KW","KG",
  "LA","LV","LB","LS","LY","LI","LT","LU",
  "MG","MW","MY","MV","ML","MT","MU","MX","FM","MD","MN","ME","MS","MA","MZ","MM",
  "NA","NR","NP","NL","NZ","NI","NE","NG","NU",
  "MK","NO",
  "OM",
  "PK","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR",
  "QA",
  "RO","RU","RW",
  "WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO","ZA","KR","ES","LK","SH","VC","SR","SE","CH",
  "TW","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM",
  "UG","UA","AE","GB","US","UY","UZ",
  "VU","VE","VN",
  "ZM","ZW",
]);

export const SUPPORTED_CURRENCIES: Set<string> = new Set([
  "KMF","DOP","MAD","GEL","GTQ","CLP","SLE","TND","NAD","WST","TMT","PEN","CLF","COP","JMD",
  "USD","COU","USN","XXX","PHP","BMD","PYG","ERN","MRU","CNY","PGK","AZN","TOP","UAH","CNH",
  "EUR","HKD","CAD","LSL","MUR","BOV","GIP","GHS","GYD","KPW","AMD","BOB","MDL","TRY","LBP",
  "JOD","VES","ZMW","ALL","ILS","ETB","BND","SOS","VUV","LAK","VED","LRD","MWK","MGA","SSP",
  "BAM","EGP","AOA","JPY","PLN","SBD","SAR","TTD","SRD","MVR","KRW","INR","CRC","RON","PKR",
  "NGN","ANG","RSD","TWD","MYR","UYI","FKP","XOF","BSD","SDG","IQD","CUP","GMD","BBD","MXN",
  "SCR","HNL","UGX","CDF","ZAR","MXV","STN","NIO","NZD","BRL","FJD","ISK","MKD","SGD","DZD",
  "BDT","KWD","LYD","XPT","RUB","ARS","QAR","MZN","XPD","IRR","XPF","THB","UZS","OMR","UYW",
  "CVE","UYU","BTN","KES","SEK","GNF","DKK","RWF","MMK","NOK","SYP","ZWG","BGN","CHW","XBB",
  "IDR","XBA","KYD","KHR","SHP","BWP","XBD","XBC","AED","TJS","CHF","VND","XAU","AUD","TZS",
  "PAB","KGS","CHE","DJF","XAG","XAF","XUA","XDR","BZD","MOP","MNT","AWN","BYN","XTS","GBP",
  "HUF","BIF","YER","KZT","SZL","AFN","NPR","CZK","LKR","HTG","XSU","XCD","BHD",
]);

export function isValidCountry(code: string): boolean {
  return SUPPORTED_COUNTRIES.has(code.toUpperCase());
}

export function isValidCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.has(code.toUpperCase());
}
