import fs from "node:fs"
import path from "node:path"
import hre from "hardhat"

const { ethers } = hre

const BSC_MAINNET_CHAIN_ID = 56
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"
const MONTHLY_PRICE = ethers.parseUnits("30", 18)

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
  const chainId = Number(network.chainId)

  if (chainId !== BSC_MAINNET_CHAIN_ID) {
    throw new Error(`Refusing to deploy: expected BSC Mainnet chain ${BSC_MAINNET_CHAIN_ID}, got ${chainId}.`)
  }

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Deploying MembershipPass on BSC Mainnet`)
  console.log(`Owner/deployer: ${deployer.address}`)
  console.log(`Deployer BNB balance: ${ethers.formatEther(balance)}`)
  console.log(`Payment token: ${BSC_USDT_ADDRESS}`)
  console.log(`Monthly price: ${ethers.formatUnits(MONTHLY_PRICE, 18)} USDT`)

  const Membership = await ethers.getContractFactory("MembershipPass")
  const membership = await Membership.deploy(deployer.address, BSC_USDT_ADDRESS, MONTHLY_PRICE)
  await membership.waitForDeployment()

  const membershipAddress = await membership.getAddress()
  const deployTx = membership.deploymentTransaction()
  console.log(`MembershipPass deployed: ${membershipAddress}`)
  console.log(`Deploy tx: ${deployTx?.hash ?? "unknown"}`)

  upsertEnvValue(path.resolve(process.cwd(), ".env"), "NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS", membershipAddress)
  console.log(`Updated .env NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS=${membershipAddress}`)

  console.log("Constructor arguments for verification:")
  console.log(JSON.stringify([deployer.address, BSC_USDT_ADDRESS, MONTHLY_PRICE.toString()]))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
