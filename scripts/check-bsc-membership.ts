import hre from "hardhat"

const { ethers } = hre

const addressPattern = /^0x[a-fA-F0-9]{40}$/

function requireAddress(value: string | undefined, label: string) {
  if (!value || !addressPattern.test(value)) throw new Error(`${label} is not configured`)
  return value
}

async function main() {
  const network = await ethers.provider.getNetwork()
  if (Number(network.chainId) !== 56) throw new Error(`Expected BSC Mainnet chain 56, got ${network.chainId}`)
  const address = requireAddress(process.env.NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS, "NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS")

  const membership = await ethers.getContractAt("MembershipPass", address)
  const [owner, paymentToken, monthlyPrice] = await Promise.all([
    membership.owner(),
    membership.paymentToken(),
    membership.monthlyPrice(),
  ])

  console.log(`Network chainId: ${network.chainId}`)
  console.log(`MembershipPass: ${address}`)
  console.log(`Owner: ${owner}`)
  console.log(`Payment token: ${paymentToken}`)
  console.log(`Monthly price raw: ${monthlyPrice.toString()}`)
  console.log(`Monthly price formatted: ${ethers.formatUnits(monthlyPrice, 18)} USDT`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
