const tokens = [
  {
    currency: 'Celo',
    wrappedToken: '0x544f0db9374270d166571d29e33794da5dce797f',
  },
  {
    currency: 'cUSD',
    wrappedToken: '0xedc78ab91559cc7ee14b847fd5d9aa52bcc3d722',
  },
  {
    currency: 'cEUR',
    wrappedToken: '0x950ffeace45c3b92f2306f2f66711be23d857d28',
  },
  {
    currency: 'cREAL',
    wrappedToken: '0x386dcfdda9ceacb7a3a3264e421169ef3bbc0217',
  },
]

const api =
  'https://v2-srv-data-frm-smrt-cntract.herokuapp.com/get/getReserveData'

interface ReserveData {
  currency: string
  apy: number
  // ... other fields omitted for brevity
}

interface ApiResponse {
  status: string
  dateTime: number
  data: ReserveData[]
}

export const moola = async (): Promise<Record<string, number>> => {
  const response = await fetch(api)
  const { data } = (await response.json()) as ApiResponse

  return tokens.reduce((acc, { currency, wrappedToken }) => {
    const reserveData = data.find((d) => d.currency === currency)
    if (reserveData) {
      acc[wrappedToken] = reserveData.apy
    }
    return acc
  }, {} as Record<string, number>)
}
