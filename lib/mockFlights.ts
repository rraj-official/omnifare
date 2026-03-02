export interface POSOption {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  price: number;
  currency: string;
  provider: string;
  providerLogo?: string;
  providerWebsite?: string;
  bookingToken?: string;
  riskLevel: "low" | "medium";
  riskNote?: string;
}

export interface FlightLeg {
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  departureCode: string;
  arrivalAirport: string;
  arrivalCode: string;
  duration: string;
  aircraft: string;
  flightNumber: string;
}

export interface Flight {
  id: string;
  airline: string;
  airlineLogo: string;
  departure: string;
  arrival: string;
  departureCode: string;
  arrivalCode: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  duration: string;
  stops: number;
  stopLocations?: string[];
  co2Emissions: number;
  emissionsChange?: string;
  cabinClass: string;
  legs: FlightLeg[];
  posOptions: POSOption[];
  baggageInfo: {
    carryOn: boolean;
    checkedBag: boolean;
  };
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const airports: Airport[] = [
  // India
  { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "India" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", country: "India" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India" },
  { code: "CCU", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India" },
  { code: "GOI", name: "Goa International Airport", city: "Goa", country: "India" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India" },
  { code: "PNQ", name: "Pune Airport", city: "Pune", country: "India" },
  { code: "COK", name: "Cochin International Airport", city: "Kochi", country: "India" },

  // Middle East
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE" },
  { code: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "UAE" },
  { code: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar" },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
  { code: "SAW", name: "Sabiha Gökçen International Airport", city: "Istanbul", country: "Turkey" },
  { code: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia" },
  { code: "RUH", name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia" },
  { code: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt" },

  // Asia Pacific
  { code: "SIN", name: "Changi Airport", city: "Singapore", country: "Singapore" },
  { code: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },
  { code: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
  { code: "HND", name: "Haneda Airport", city: "Tokyo", country: "Japan" },
  { code: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
  { code: "TPE", name: "Taoyuan International Airport", city: "Taipei", country: "Taiwan" },
  { code: "SGN", name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam" },
  { code: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam" },
  { code: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia" },
  { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia" },
  { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },

  // Europe
  { code: "LHR", name: "Heathrow Airport", city: "London", country: "UK" },
  { code: "LGW", name: "Gatwick Airport", city: "London", country: "UK" },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },
  { code: "AMS", name: "Schiphol Airport", city: "Amsterdam", country: "Netherlands" },
  { code: "MAD", name: "Adolfo Suárez Madrid–Barajas Airport", city: "Madrid", country: "Spain" },
  { code: "BCN", name: "Josep Tarradellas Barcelona-El Prat Airport", city: "Barcelona", country: "Spain" },
  { code: "FCO", name: "Leonardo da Vinci–Fiumicino Airport", city: "Rome", country: "Italy" },
  { code: "MXP", name: "Malpensa Airport", city: "Milan", country: "Italy" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },

  // North America
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "USA" },
  { code: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "USA" },
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "USA" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "USA" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "USA" },
  { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "USA" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "USA" },
  { code: "MIA", name: "Miami International Airport", city: "Miami", country: "USA" },
  { code: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada" },
  { code: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada" },

  // Latin America
  { code: "GRU", name: "São Paulo/Guarulhos International Airport", city: "São Paulo", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro/Galeão International Airport", city: "Rio de Janeiro", country: "Brazil" },
  { code: "EZE", name: "Ministro Pistarini International Airport", city: "Buenos Aires", country: "Argentina" },
  { code: "BOG", name: "El Dorado International Airport", city: "Bogotá", country: "Colombia" },
  { code: "MEX", name: "Mexico City International Airport", city: "Mexico City", country: "Mexico" },
  { code: "SCL", name: "Arturo Merino Benítez International Airport", city: "Santiago", country: "Chile" },

  // Africa
  { code: "JNB", name: "O. R. Tambo International Airport", city: "Johannesburg", country: "South Africa" },
  { code: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa" },
  { code: "LOS", name: "Murtala Muhammed International Airport", city: "Lagos", country: "Nigeria" },
  { code: "ADD", name: "Addis Ababa Bole International Airport", city: "Addis Ababa", country: "Ethiopia" },
  { code: "NBO", name: "Jomo Kenyatta International Airport", city: "Nairobi", country: "Kenya" },
];

export const countries = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹", flagEmoji: "🇮🇳" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", flagEmoji: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flagEmoji: "🇬🇧" },
  { code: "TR", name: "Turkey", currency: "TRY", symbol: "₺", flagEmoji: "🇹🇷" },
  { code: "BR", name: "Brazil", currency: "BRL", symbol: "R$", flagEmoji: "🇧🇷" },
  { code: "AE", name: "UAE", currency: "AED", symbol: "د.إ", flagEmoji: "🇦🇪" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "S$", flagEmoji: "🇸🇬" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€", flagEmoji: "🇩🇪" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥", flagEmoji: "🇯🇵" },
];

const fxRates: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0095,
  TRY: 0.41,
  BRL: 0.061,
  AED: 0.044,
  SGD: 0.016,
  EUR: 0.011,
  JPY: 1.78,
};

export function convertCurrency(amountINR: number, toCurrency: string): number {
  const rate = fxRates[toCurrency] ?? 1;
  return Math.round(amountINR * rate * 100) / 100;
}

export function formatPrice(amount: number, currency: string): string {
  const country = countries.find((c) => c.currency === currency);
  const symbol = country?.symbol ?? currency;
  if (currency === "JPY") return `${symbol}${Math.round(amount).toLocaleString()}`;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export const mockFlights: Flight[] = [
  {
    id: "fl-001",
    airline: "Air India Express",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/IX.png",
    departure: "9:10 PM",
    arrival: "12:05 AM+1",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "2 hr 55 min",
    stops: 0,
    co2Emissions: 141,
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "9:10 PM",
        arrivalTime: "12:05 AM+1",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "2 hr 55 min",
        aircraft: "Boeing 737MAX 8",
        flightNumber: "IX 2679",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 4890, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5697, currency: "INR", provider: "Cleartrip", providerWebsite: "https://www.cleartrip.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5697, currency: "INR", provider: "Goibibo", providerWebsite: "https://www.goibibo.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5697, currency: "INR", provider: "EaseMyTrip", providerWebsite: "https://www.easemytrip.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 5820, currency: "INR", provider: "Booking.com", providerWebsite: "https://www.booking.com", riskLevel: "low" },
      { countryCode: "AE", countryName: "UAE", flagEmoji: "🇦🇪", price: 5950, currency: "INR", provider: "Musafir", providerWebsite: "https://www.musafir.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇧", price: 4750, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "SG", countryName: "Singapore", flagEmoji: "🇸🇬", price: 6100, currency: "INR", provider: "Trip.com", providerWebsite: "https://www.trip.com", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: true },
  },
  {
    id: "fl-002",
    airline: "Air India Express",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/IX.png",
    departure: "10:20 PM",
    arrival: "1:15 AM+1",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "2 hr 55 min",
    stops: 0,
    co2Emissions: 141,
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "10:20 PM",
        arrivalTime: "1:15 AM+1",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "2 hr 55 min",
        aircraft: "Boeing 737MAX 8",
        flightNumber: "IX 2681",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 4890, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5697, currency: "INR", provider: "Cleartrip", providerWebsite: "https://www.cleartrip.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5697, currency: "INR", provider: "EaseMyTrip", providerWebsite: "https://www.easemytrip.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 5780, currency: "INR", provider: "Expedia", providerWebsite: "https://www.expedia.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 4680, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "GB", countryName: "United Kingdom", flagEmoji: "🇬🇧", price: 6200, currency: "INR", provider: "Skyscanner UK", providerWebsite: "https://www.skyscanner.net", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: true },
  },
  {
    id: "fl-003",
    airline: "IndiGo",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/6E.png",
    departure: "7:40 PM",
    arrival: "12:45 AM+1",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "5 hr 5 min",
    stops: 1,
    stopLocations: ["Goa (GOI)"],
    co2Emissions: 152,
    emissionsChange: "+8%",
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "7:40 PM",
        arrivalTime: "10:00 PM",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Goa International Airport",
        arrivalCode: "GOI",
        duration: "2 hr 20 min",
        aircraft: "Airbus A320neo",
        flightNumber: "6E 2145",
      },
      {
        departureTime: "11:15 PM",
        arrivalTime: "12:45 AM+1",
        departureAirport: "Goa International Airport",
        departureCode: "GOI",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "1 hr 30 min",
        aircraft: "Airbus A320neo",
        flightNumber: "6E 2267",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 5540, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6460, currency: "INR", provider: "IndiGo", providerWebsite: "https://www.goindigo.in", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6460, currency: "INR", provider: "MakeMyTrip", providerWebsite: "https://www.makemytrip.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 6590, currency: "INR", provider: "Booking.com", providerWebsite: "https://www.booking.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 5380, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "DE", countryName: "Germany", flagEmoji: "🇩🇪", price: 6800, currency: "INR", provider: "Kiwi.com", providerWebsite: "https://www.kiwi.com", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: false },
  },
  {
    id: "fl-004",
    airline: "Akasa Air",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/QP.png",
    departure: "11:10 PM",
    arrival: "2:00 AM+1",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "2 hr 50 min",
    stops: 0,
    co2Emissions: 122,
    emissionsChange: "-13%",
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "11:10 PM",
        arrivalTime: "2:00 AM+1",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "2 hr 50 min",
        aircraft: "Boeing 737MAX 8",
        flightNumber: "QP 1423",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 5660, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6595, currency: "INR", provider: "Cleartrip", providerWebsite: "https://www.cleartrip.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6595, currency: "INR", provider: "Paytm Travel", providerWebsite: "https://travel.paytm.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 6750, currency: "INR", provider: "Trip.com", providerWebsite: "https://www.trip.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 5480, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "AE", countryName: "UAE", flagEmoji: "🇦🇪", price: 6900, currency: "INR", provider: "Musafir", providerWebsite: "https://www.musafir.com", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: true },
  },
  {
    id: "fl-005",
    airline: "Air India",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/AI.png",
    departure: "7:55 PM",
    arrival: "10:55 PM",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "3 hr",
    stops: 0,
    co2Emissions: 122,
    emissionsChange: "-13%",
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "7:55 PM",
        arrivalTime: "10:55 PM",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "3 hr",
        aircraft: "Airbus A321neo",
        flightNumber: "AI 505",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 5810, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6774, currency: "INR", provider: "Air India", providerWebsite: "https://www.airindia.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 6774, currency: "INR", provider: "Yatra", providerWebsite: "https://www.yatra.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 6900, currency: "INR", provider: "Expedia", providerWebsite: "https://www.expedia.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 5650, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "SG", countryName: "Singapore", flagEmoji: "🇸🇬", price: 7100, currency: "INR", provider: "Trip.com SG", providerWebsite: "https://www.trip.com", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: true },
  },
  {
    id: "fl-006",
    airline: "SpiceJet",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/SG.png",
    departure: "6:30 PM",
    arrival: "11:50 PM",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "5 hr 20 min",
    stops: 1,
    stopLocations: ["Mumbai (BOM)"],
    co2Emissions: 165,
    emissionsChange: "+17%",
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "6:30 PM",
        arrivalTime: "8:40 PM",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Chhatrapati Shivaji Maharaj International Airport",
        arrivalCode: "BOM",
        duration: "2 hr 10 min",
        aircraft: "Boeing 737-800",
        flightNumber: "SG 8169",
      },
      {
        departureTime: "10:00 PM",
        arrivalTime: "11:50 PM",
        departureAirport: "Chhatrapati Shivaji Maharaj International Airport",
        departureCode: "BOM",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "1 hr 50 min",
        aircraft: "Boeing 737-800",
        flightNumber: "SG 8372",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 4550, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5425, currency: "INR", provider: "SpiceJet", providerWebsite: "https://www.spicejet.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 5425, currency: "INR", provider: "HappyFares", providerWebsite: "https://www.happyfares.in", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 5600, currency: "INR", provider: "CheapTickets", providerWebsite: "https://www.cheaptickets.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 4380, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "DE", countryName: "Germany", flagEmoji: "🇩🇪", price: 5800, currency: "INR", provider: "Kiwi.com", providerWebsite: "https://www.kiwi.com", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: false },
  },
  {
    id: "fl-007",
    airline: "Vistara",
    airlineLogo: "https://www.gstatic.com/flights/airline_logos/70px/UK.png",
    departure: "8:15 PM",
    arrival: "11:10 PM",
    departureCode: "DEL",
    arrivalCode: "BLR",
    departureAirport: "Indira Gandhi International Airport",
    arrivalAirport: "Kempegowda International Airport Bengaluru",
    departureDate: "Tue, Mar 17",
    duration: "2 hr 55 min",
    stops: 0,
    co2Emissions: 135,
    emissionsChange: "-4%",
    cabinClass: "Economy",
    legs: [
      {
        departureTime: "8:15 PM",
        arrivalTime: "11:10 PM",
        departureAirport: "Indira Gandhi International Airport",
        departureCode: "DEL",
        arrivalAirport: "Kempegowda International Airport Bengaluru",
        arrivalCode: "BLR",
        duration: "2 hr 55 min",
        aircraft: "Airbus A321neo",
        flightNumber: "UK 843",
      },
    ],
    posOptions: [
      { countryCode: "TR", countryName: "Turkey", flagEmoji: "🇹🇷", price: 6200, currency: "INR", provider: "Turkish OTA", providerWebsite: "https://www.turkishairlines.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 7250, currency: "INR", provider: "Vistara", providerWebsite: "https://www.airvistara.com", riskLevel: "low" },
      { countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", price: 7100, currency: "INR", provider: "MakeMyTrip", providerWebsite: "https://www.makemytrip.com", riskLevel: "low" },
      { countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", price: 7400, currency: "INR", provider: "Expedia", providerWebsite: "https://www.expedia.com", riskLevel: "low" },
      { countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", price: 6050, currency: "INR", provider: "Decolar", providerWebsite: "https://www.decolar.com", riskLevel: "medium", riskNote: "May require local ID/Credit Card" },
      { countryCode: "GB", countryName: "United Kingdom", flagEmoji: "🇬🇧", price: 7600, currency: "INR", provider: "Skyscanner UK", providerWebsite: "https://www.skyscanner.net", riskLevel: "low" },
    ],
    baggageInfo: { carryOn: true, checkedBag: true },
  },
];

export function getCheapestPOS(flight: Flight): POSOption {
  return [...flight.posOptions].sort((a, b) => a.price - b.price)[0];
}

export function getIndianPrice(flight: Flight): number {
  const indian = flight.posOptions.find((p) => p.countryCode === "IN");
  return indian?.price ?? getCheapestPOS(flight).price;
}
