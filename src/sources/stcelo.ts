import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { epochRewardsABI, registryABI } from '@celo/abis'
import BigNumber from 'bignumber.js'
const client = createPublicClient({
  chain: celo,
  transport: http('https://rpc.ankr.com/celo'),
})

export const stcelo = async () => {
  const epochRewardsAddress = await client.readContract({
    address: '0x000000000000000000000000000000000000ce10',
    abi: registryABI,
    functionName: 'getAddressForString',
    args: ['EpochRewards'],
  })

  const rewardsMultiplierFraction = await client.readContract({
    address: epochRewardsAddress,
    abi: epochRewardsABI,
    functionName: 'getRewardsMultiplier',
  })

  const targetVotingYieldParameters = await client.readContract({
    address: epochRewardsAddress,
    abi: epochRewardsABI,
    functionName: 'getTargetVotingYieldParameters',
  })

  // EpochRewards contract is using Fixidity library which operates on decimal part of numbers
  // Fixidity is always using 24 length decimal parts
  const fixidityDecimalSize = new BigNumber(10).pow(24)
  const [targetVotingYieldFraction] = targetVotingYieldParameters!
  const targetVotingYield = new BigNumber(
    targetVotingYieldFraction.toString(),
  ).div(fixidityDecimalSize)
  const rewardsMultiplier = new BigNumber(
    rewardsMultiplierFraction!.toString(),
  ).div(fixidityDecimalSize)

  // Target voting yield is for a single day only, so we have to calculate this for entire year
  const unadjustedAPR = targetVotingYield.times(365)

  // According to the protocol it has to be adjusted by rewards multiplier
  const adjustedAPR = unadjustedAPR.times(rewardsMultiplier)

  const percentageAPR = adjustedAPR.times(100)

  return {
    '0xc668583dcbdc9ae6fa3ce46462758188adfdfc24': Number(
      percentageAPR.toFixed(2),
    ),
  }
}
