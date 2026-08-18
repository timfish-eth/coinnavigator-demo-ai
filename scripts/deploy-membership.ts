import fs from "node:fs"
import path from "node:path"
import hre from "hardhat"

const { ethers } = hre

const MONTHLY_PRICE = ethers.parseUnits("9.9", 18)

function upsertEnvValue(filePath: string, key: string, value: string) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
  const lines = existing.split(/\r?\n/)
  const keyPattern = new RegExp(`^\\s*${key}\\s*=`)
  let updated = false

  const nextLines = lines.map((line) => {
    if (!keyPattern.test(line)) return line
    updated = true
    return `${key}=${value}`
  })

  if (!updated) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("")
    }
    nextLines.push(`${key}=${value}`)
  }

  fs.writeFileSync(filePath, nextLines.join("\n"))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const envPath = path.resolve(process.cwd(), ".env")
  const chainId = Number(network.chainId)

  if (chainId === 56) {
    throw new Error("This script deploys a MockERC20 test payment token and must not be used on BSC Mainnet.")
  }

  console.log(`Deploying from ${deployer.address} on chain ${network.chainId}`)

  const Token = await ethers.getContractFactory("MockERC20")
  const token = await Token.deploy("Mock USDT", "mUSDT", 18)
  await token.waitForDeployment()
  const tokenAddress = await token.getAddress()
  console.log(`Mock USDT deployed: ${tokenAddress}`)

  const Membership = await ethers.getContractFactory("MembershipPass")
  const membership = await Membership.deploy(deployer.address, tokenAddress, MONTHLY_PRICE)
  await membership.waitForDeployment()
  const membershipAddress = await membership.getAddress()
  console.log(`MembershipPass deployed: ${membershipAddress}`)

  const membershipKey = chainId === 97 ? "NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS" : "NEXT_PUBLIC_LOCAL_MEMBERSHIP_PASS_ADDRESS"
  const tokenKey = chainId === 97 ? "BSC_TESTNET_MOCK_USDT_ADDRESS" : "LOCAL_MOCK_USDT_ADDRESS"
  upsertEnvValue(envPath, membershipKey, membershipAddress)
  upsertEnvValue(envPath, tokenKey, tokenAddress)

  const approveTx = await token.approve(membershipAddress, MONTHLY_PRICE)
  await approveTx.wait()
  const rechargeTx = await membership.recharge()
  await rechargeTx.wait()

  const isMember = await membership.isMember(deployer.address)
  const expiry = await membership.getMembershipExpiry(deployer.address)

  console.log(`Recharge test member active: ${isMember}`)
  console.log(`Recharge test expiry: ${expiry.toString()}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
